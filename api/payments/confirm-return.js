import { allowMethods, getAdminClient, infinitePayHandle, parseJsonBody, safeError } from '../../server/paymentServer.js';

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['POST'])) return;
  res.setHeader('Cache-Control', 'no-store');
  try {
    const body = await parseJsonBody(req);
    const orderNsu = body.order_nsu || body.order_id;
    const transactionNsu = body.transaction_nsu || body.transaction_id;
    const invoiceSlug = body.invoice_slug || body.slug;
    if (!orderNsu || !transactionNsu || !invoiceSlug) return res.status(400).json({ error: 'Retorno sem identificadores suficientes para confirmar o pagamento.' });

    const admin = getAdminClient();
    const { data: payment, error: paymentError } = await admin.from('financial_payments')
      .select('event_id,athlete_id,status,provider_order_nsu,provider,financial_events!inner(amount_cents)')
      .eq('provider', 'infinitepay').eq('provider_order_nsu', orderNsu).single();
    if (paymentError || !payment) return res.status(404).json({ error: 'Cobrança não localizada para este retorno.' });
    if (payment.status === 'paid') return res.status(200).json({ ok: true, alreadyPaid: true });

    const verificationResponse = await fetch('https://api.checkout.infinitepay.io/payment_check', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handle: await infinitePayHandle(admin), order_nsu: orderNsu, transaction_nsu: transactionNsu, slug: invoiceSlug }),
    });
    const verification = await verificationResponse.json().catch(() => ({}));
    const expectedAmount = payment.financial_events.amount_cents;
    if (!verificationResponse.ok || verification.success !== true || verification.paid !== true) return res.status(409).json({ error: 'A InfinitePay ainda não confirmou este pagamento.' });
    if (Number(verification.amount) !== Number(expectedAmount)) return res.status(409).json({ error: 'O valor confirmado não corresponde à cobrança.' });

    const now = new Date().toISOString();
    const { error: updateError } = await admin.from('financial_payments').update({
      status: 'paid', amount_paid_cents: expectedAmount, paid_at: now, provider_status: 'paid',
      provider_transaction_nsu: transactionNsu, provider_invoice_slug: invoiceSlug,
      provider_receipt_url: body.receipt_url || null,
      provider_payload: { capture_method: verification.capture_method, installments: verification.installments, paid_amount: verification.paid_amount, confirmed_by: 'return' },
      confirmed_at: now, updated_at: now,
    }).eq('event_id', payment.event_id).eq('athlete_id', payment.athlete_id);
    if (updateError) throw updateError;
    return res.status(200).json({ ok: true, paid: true });
  } catch (error) {
    return res.status(500).json({ error: safeError(error) });
  }
}
