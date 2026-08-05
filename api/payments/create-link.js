import crypto from 'node:crypto';
import { allowMethods, infinitePayHandle, parseJsonBody, requireFinanceStaff, safeError, siteUrl } from '../../server/paymentServer.js';

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['POST'])) return;
  res.setHeader('Cache-Control', 'no-store');
  try {
    const context = await requireFinanceStaff(req, res);
    if (!context) return;
    const { admin } = context;
    const { eventId, athleteId } = await parseJsonBody(req);
    if (!eventId || !athleteId) return res.status(400).json({ error: 'Evento e atleta são obrigatórios.' });

    const [eventResult, paymentResult] = await Promise.all([
      admin.from('financial_events').select('id,category,title,event_date,amount_cents,is_active').eq('id', eventId).single(),
      admin.from('financial_payments').select('event_id,athlete_id,status,provider_checkout_url,provider_order_nsu').eq('event_id', eventId).eq('athlete_id', athleteId).single(),
    ]);
    if (eventResult.error || paymentResult.error || !eventResult.data || !paymentResult.data) return res.status(404).json({ error: 'Cobrança não encontrada para este atleta.' });
    const financialEvent = eventResult.data;
    const payment = paymentResult.data;
    if (!financialEvent.is_active) return res.status(409).json({ error: 'Este evento está arquivado.' });
    if (financialEvent.amount_cents <= 0) return res.status(409).json({ error: 'Defina um valor maior que zero para gerar o link.' });
    if (payment.status === 'paid') return res.status(409).json({ error: 'Este pagamento já está confirmado.' });
    if (payment.provider_checkout_url) return res.status(200).json({ url: payment.provider_checkout_url, reused: true });

    const handle = await infinitePayHandle(admin);
    const orderNsu = payment.provider_order_nsu || `adsz_${crypto.randomUUID().replaceAll('-', '')}`;
    const { error: reserveError } = await admin.from('financial_payments').update({
      provider: 'infinitepay', provider_status: 'creating', provider_order_nsu: orderNsu, updated_at: new Date().toISOString(),
    }).eq('event_id', eventId).eq('athlete_id', athleteId);
    if (reserveError) throw reserveError;

    const baseUrl = siteUrl();
    const providerResponse = await fetch('https://api.checkout.infinitepay.io/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        handle,
        order_nsu: orderNsu,
        redirect_url: `${baseUrl}/?pagamento=concluido`,
        webhook_url: `${baseUrl}/api/payments/infinitepay-webhook`,
        items: [{ quantity: 1, price: financialEvent.amount_cents, description: `Taxa esportiva · ${financialEvent.title} · ${financialEvent.category}`.slice(0, 120) }],
      }),
    });
    const providerData = await providerResponse.json().catch(() => ({}));
    if (!providerResponse.ok || !providerData.url) {
      await admin.from('financial_payments').update({ provider_status: 'failed', provider_payload: { status: providerResponse.status }, updated_at: new Date().toISOString() }).eq('event_id', eventId).eq('athlete_id', athleteId);
      throw new Error(providerData.message || providerData.error || 'A InfinitePay não gerou o link. Confira se o Checkout Integrado está habilitado.');
    }

    const now = new Date().toISOString();
    const { error: updateError } = await admin.from('financial_payments').update({
      provider: 'infinitepay', provider_status: 'pending', provider_order_nsu: orderNsu,
      provider_checkout_url: providerData.url, provider_payload: { link_created: true }, link_created_at: now, updated_at: now,
    }).eq('event_id', eventId).eq('athlete_id', athleteId);
    if (updateError) throw updateError;
    return res.status(201).json({ url: providerData.url, reused: false });
  } catch (error) {
    return res.status(500).json({ error: safeError(error) });
  }
}
