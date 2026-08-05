import crypto from 'node:crypto';
import { allowMethods, getAdminClient, infinitePayHandle, parseJsonBody, safeError } from '../../server/paymentServer.js';

function eventKey(payload) {
  const stable = [payload.order_nsu, payload.transaction_nsu, payload.invoice_slug].filter(Boolean).join(':');
  return stable || crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['POST'])) return;
  res.setHeader('Cache-Control', 'no-store');
  const admin = getAdminClient();
  let webhookId = null;
  try {
    const payload = await parseJsonBody(req);
    const { order_nsu: orderNsu, transaction_nsu: transactionNsu, invoice_slug: invoiceSlug } = payload;
    if (!orderNsu || !transactionNsu || !invoiceSlug) return res.status(400).json({ error: 'Webhook sem identificadores obrigatórios.' });

    let { data: webhook, error: webhookError } = await admin.from('payment_webhook_events').insert({
      provider: 'infinitepay', event_key: eventKey(payload), order_nsu: orderNsu, transaction_nsu: transactionNsu, payload,
    }).select('id').single();
    if (webhookError?.code === '23505') {
      const { data: existing, error: existingError } = await admin.from('payment_webhook_events')
        .select('id,processing_status').eq('provider', 'infinitepay').eq('event_key', eventKey(payload)).single();
      if (existingError) throw existingError;
      if (existing.processing_status === 'processed') return res.status(200).json({ ok: true, duplicate: true });
      webhook = existing;
      webhookError = null;
      await admin.from('payment_webhook_events').update({ processing_status: 'received', error_message: null, payload }).eq('id', existing.id);
    }
    if (webhookError) throw webhookError;
    webhookId = webhook.id;

    const { data: payment, error: paymentError } = await admin.from('financial_payments')
      .select('event_id,athlete_id,status,provider_order_nsu,financial_events!inner(amount_cents)')
      .eq('provider', 'infinitepay').eq('provider_order_nsu', orderNsu).single();
    if (paymentError || !payment) throw new Error('Pedido recebido não existe na plataforma.');

    const verificationResponse = await fetch('https://api.checkout.infinitepay.io/payment_check', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handle: await infinitePayHandle(admin), order_nsu: orderNsu, transaction_nsu: transactionNsu, slug: invoiceSlug }),
    });
    const verification = await verificationResponse.json().catch(() => ({}));
    const expectedAmount = payment.financial_events.amount_cents;
    if (!verificationResponse.ok || verification.success !== true || verification.paid !== true) throw new Error('A InfinitePay ainda não confirmou o pagamento.');
    if (Number(verification.amount) !== Number(expectedAmount) || Number(payload.amount) !== Number(expectedAmount)) throw new Error('Valor recebido diferente do valor esperado para a cobrança.');

    const now = new Date().toISOString();
    const { error: updateError } = await admin.from('financial_payments').update({
      status: 'paid', amount_paid_cents: expectedAmount, paid_at: now, provider_status: 'paid',
      provider_transaction_nsu: transactionNsu, provider_invoice_slug: invoiceSlug,
      provider_receipt_url: payload.receipt_url || null,
      provider_payload: { capture_method: verification.capture_method, installments: verification.installments, paid_amount: verification.paid_amount },
      confirmed_at: now, updated_at: now,
    }).eq('event_id', payment.event_id).eq('athlete_id', payment.athlete_id);
    if (updateError) throw updateError;

    await admin.from('payment_webhook_events').update({ processing_status: 'processed', processed_at: now }).eq('id', webhookId);
    return res.status(200).json({ ok: true });
  } catch (error) {
    if (webhookId) await admin.from('payment_webhook_events').update({ processing_status: 'rejected', error_message: safeError(error).slice(0, 500), processed_at: new Date().toISOString() }).eq('id', webhookId);
    return res.status(400).json({ error: safeError(error) });
  }
}
