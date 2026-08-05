import crypto from 'node:crypto';
import { allowMethods, getAdminClient, infinitePayHandle, parseJsonBody, safeError, siteUrl } from '../../server/paymentServer.js';
import { findPaymentAthlete } from '../../server/paymentAthletes.js';

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['POST'])) return;
  res.setHeader('Cache-Control', 'no-store');
  try {
    const body = await parseJsonBody(req);
    const athlete = findPaymentAthlete(body);
    if (!athlete || athlete.id !== body.athleteId) return res.status(404).json({ error: 'Atleta não localizado.' });
    if (!body.eventId) return res.status(400).json({ error: 'Evento de pagamento não informado.' });

    const admin = getAdminClient();
    const [{ data: event, error: eventError }, { data: payment, error: paymentError }, { data: profileRows, error: profileError }] = await Promise.all([
      admin.from('financial_events').select('id,category,title,event_date,amount_cents,is_active').eq('id', body.eventId).eq('category', athlete.category).single(),
      admin.from('financial_payments').select('event_id,athlete_id,status,provider_checkout_url,provider_order_nsu,provider_payload').eq('event_id', body.eventId).eq('athlete_id', athlete.id).single(),
      admin.from('financial_payments').select('provider_payload').eq('athlete_id', athlete.id).order('updated_at', { ascending: false }).limit(50),
    ]);
    if (eventError || paymentError || profileError || !event || !payment) return res.status(404).json({ error: 'Cobrança não encontrada para este atleta.' });
    const profile = (profileRows || []).map((row) => row.provider_payload?.family_profile).find(Boolean) || null;
    if (!profile) return res.status(409).json({ error: 'Cadastre os dados do responsável uma única vez antes de pagar.' });
    if (!event.is_active) return res.status(409).json({ error: 'Este evento não está mais disponível.' });
    if (event.amount_cents <= 0) return res.status(409).json({ error: 'Este evento ainda não possui valor definido.' });
    if (payment.status === 'paid') return res.status(409).json({ error: 'Este pagamento já está confirmado.' });
    if (payment.provider_checkout_url) return res.status(200).json({ url: payment.provider_checkout_url, reused: true });

    const handle = await infinitePayHandle(admin);
    const orderNsu = payment.provider_order_nsu || `adsz_family_${crypto.randomUUID().replaceAll('-', '')}`;
    const { error: reserveError } = await admin.from('financial_payments').update({ provider: 'infinitepay', provider_status: 'creating', provider_order_nsu: orderNsu, updated_at: new Date().toISOString() }).eq('event_id', body.eventId).eq('athlete_id', athlete.id);
    if (reserveError) throw reserveError;

    const baseUrl = siteUrl();
    const providerResponse = await fetch('https://api.checkout.infinitepay.io/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        handle,
        order_nsu: orderNsu,
        customer: { name: profile.responsible_name, email: profile.responsible_email, phone_number: profile.responsible_phone },
      redirect_url: `${baseUrl}/portal-do-atleta?status=concluido`,
        webhook_url: `${baseUrl}/api/payments/infinitepay-webhook`,
        items: [{ quantity: 1, price: event.amount_cents, description: `Taxa esportiva · ${event.title} · ${athlete.category}`.slice(0, 120) }],
      }),
    });
    const providerData = await providerResponse.json().catch(() => ({}));
    if (!providerResponse.ok || !providerData.url) {
      await admin.from('financial_payments').update({ provider_status: 'failed', provider_payload: { status: providerResponse.status }, updated_at: new Date().toISOString() }).eq('event_id', body.eventId).eq('athlete_id', athlete.id);
      throw new Error(providerData.message || providerData.error || 'A InfinitePay não gerou o link.');
    }

    const now = new Date().toISOString();
    const { error: updateError } = await admin.from('financial_payments').update({ provider: 'infinitepay', provider_status: 'pending', provider_order_nsu: orderNsu, provider_checkout_url: providerData.url, provider_payload: { link_created: true, flow: 'family-portal' }, link_created_at: now, updated_at: now }).eq('event_id', body.eventId).eq('athlete_id', athlete.id);
    if (updateError) throw updateError;
    return res.status(201).json({ url: providerData.url, reused: false });
  } catch (error) {
    return res.status(500).json({ error: safeError(error) });
  }
}
