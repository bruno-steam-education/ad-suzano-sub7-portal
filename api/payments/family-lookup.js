import { allowMethods, getAdminClient, infinitePayHandle, parseJsonBody, safeError } from '../../server/paymentServer.js';
import { findPaymentAthlete } from '../../server/paymentAthletes.js';
import { fpfsCategories } from '../../src/data/fpfsCategories.js';

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['POST'])) return;
  res.setHeader('Cache-Control', 'no-store');
  try {
    const body = await parseJsonBody(req);
    const athlete = findPaymentAthlete(body);
    if (!athlete) return res.status(404).json({ error: 'Não encontramos um atleta com esses dados. Confira o primeiro nome, o último nome e o código.' });

    const admin = getAdminClient();
    const orderNsu = body.order_nsu || body.order_id;
    const transactionNsu = body.transaction_nsu || body.transaction_id;
    const invoiceSlug = body.invoice_slug || body.slug;
    if ((body.status === 'concluido' || body.status === 'completed') && orderNsu && transactionNsu && invoiceSlug) {
      const { data: returnPayment } = await admin.from('financial_payments')
        .select('event_id,athlete_id,status,financial_events!inner(amount_cents)')
        .eq('provider', 'infinitepay').eq('provider_order_nsu', orderNsu).single();
      if (returnPayment && returnPayment.status !== 'paid') {
        const verificationResponse = await fetch('https://api.checkout.infinitepay.io/payment_check', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ handle: await infinitePayHandle(admin), order_nsu: orderNsu, transaction_nsu: transactionNsu, slug: invoiceSlug }),
        });
        const verification = await verificationResponse.json().catch(() => ({}));
        const expectedAmount = returnPayment.financial_events.amount_cents;
        if (verificationResponse.ok && verification.success === true && verification.paid === true && Number(verification.amount) === Number(expectedAmount)) {
          const now = new Date().toISOString();
          await admin.from('financial_payments').update({
            status: 'paid', amount_paid_cents: expectedAmount, paid_at: now, provider_status: 'paid',
            provider_transaction_nsu: transactionNsu, provider_invoice_slug: invoiceSlug,
            provider_receipt_url: body.receipt_url || null,
            provider_payload: { capture_method: verification.capture_method, installments: verification.installments, paid_amount: verification.paid_amount, confirmed_by: 'return' },
            confirmed_at: now, updated_at: now,
          }).eq('event_id', returnPayment.event_id).eq('athlete_id', returnPayment.athlete_id);
        }
      }
    }
    const [{ data: events, error: eventsError }, { data: payments, error: paymentsError }, { data: athleteProfile, error: athleteProfileError }, { data: statEvents, error: statEventsError }, { data: sessions, error: sessionsError }, { data: attendanceRecords, error: attendanceError }] = await Promise.all([
      admin.from('financial_events').select('id,title,event_date,amount_cents,description').eq('category', athlete.category).eq('is_active', true).order('event_date', { ascending: false }),
      admin.from('financial_payments').select('event_id,athlete_id,status,amount_paid_cents,provider_checkout_url,provider_receipt_url,confirmed_at,provider_payload').eq('athlete_id', athlete.id),
      admin.from('athlete_profiles').select('full_name,category,age,height_cm,weight_kg,coach,photo_url,role,speed,shot,ball_control,defense').eq('athlete_id', athlete.id).maybeSingle(),
      admin.from('athlete_stat_events').select('source,note,created_at').eq('athlete_id', athlete.id).order('created_at', { ascending: false }),
      admin.from('attendance_sessions').select('id,session_date,title,notes').eq('category', athlete.category).order('session_date', { ascending: false }).limit(12),
      admin.from('attendance_records').select('session_id,status,note').eq('athlete_id', athlete.id),
    ]);
    if (eventsError) throw eventsError;
    if (paymentsError) throw paymentsError;
    if (athleteProfileError) throw athleteProfileError;
    if (statEventsError) throw statEventsError;
    if (sessionsError) throw sessionsError;
    if (attendanceError) throw attendanceError;

    const paymentByEvent = new Map((payments || []).map((payment) => [payment.event_id, payment]));
    const profile = (payments || []).map((payment) => payment.provider_payload?.family_profile).find(Boolean) || null;
    const charges = (events || [])
      .map((event) => ({ ...event, payment: paymentByEvent.get(event.id) || null }))
      .filter((event) => event.payment);

    const attendance = (sessions || []).map((session) => ({ ...session, status: attendanceRecords?.find((record) => record.session_id === session.id)?.status || 'unmarked' }));
    const feedback = (statEvents || []).filter((event) => event.source === 'coach_feedback').map((event) => {
      try { return { ...JSON.parse(event.note || '{}'), created_at: event.created_at }; } catch { return null; }
    }).filter(Boolean).slice(0, 5);
    const upcomingGames = fpfsCategories.find((item) => item.category === athlete.category)?.upcomingGames?.slice(0, 3) || [];

    return res.status(200).json({ athlete: { id: athlete.id, name: athlete.name, category: athlete.category, code: athlete.code }, profile: profile || null, athleteProfile: athleteProfile || null, feedback, attendance, upcomingGames, charges });
  } catch (error) {
    return res.status(500).json({ error: safeError(error) });
  }
}
