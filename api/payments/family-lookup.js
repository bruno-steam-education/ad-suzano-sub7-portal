import { allowMethods, getAdminClient, parseJsonBody, safeError } from '../../server/paymentServer.js';
import { findPaymentAthlete } from '../../server/paymentAthletes.js';

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['POST'])) return;
  res.setHeader('Cache-Control', 'no-store');
  try {
    const body = await parseJsonBody(req);
    const athlete = findPaymentAthlete(body);
    if (!athlete) return res.status(404).json({ error: 'Não encontramos um atleta com esses dados. Confira o primeiro nome, o último nome e o código.' });

    const admin = getAdminClient();
    const [{ data: events, error: eventsError }, { data: payments, error: paymentsError }] = await Promise.all([
      admin.from('financial_events').select('id,title,event_date,amount_cents,description').eq('category', athlete.category).eq('is_active', true).order('event_date', { ascending: false }),
      admin.from('financial_payments').select('event_id,athlete_id,status,amount_paid_cents,provider_checkout_url,provider_receipt_url,confirmed_at').eq('athlete_id', athlete.id),
    ]);
    if (eventsError) throw eventsError;
    if (paymentsError) throw paymentsError;

    const paymentByEvent = new Map((payments || []).map((payment) => [payment.event_id, payment]));
    const charges = (events || [])
      .map((event) => ({ ...event, payment: paymentByEvent.get(event.id) || null }))
      .filter((event) => event.payment);

    return res.status(200).json({ athlete: { id: athlete.id, name: athlete.name, category: athlete.category, code: athlete.code }, charges });
  } catch (error) {
    return res.status(500).json({ error: safeError(error) });
  }
}
