import { allowMethods, getAdminClient, parseJsonBody, safeError } from '../../server/paymentServer.js';
import { findPaymentAthlete } from '../../server/paymentAthletes.js';

function clean(value, max = 120) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, max);
}

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['POST'])) return;
  res.setHeader('Cache-Control', 'no-store');
  try {
    const body = await parseJsonBody(req);
    const athlete = findPaymentAthlete(body);
    if (!athlete || athlete.id !== body.athleteId) return res.status(404).json({ error: 'Atleta não localizado.' });

    const responsibleName = clean(body.responsibleName);
    const responsibleEmail = clean(body.responsibleEmail, 180).toLowerCase();
    const responsiblePhone = clean(body.responsiblePhone, 30);
    if (responsibleName.length < 5) return res.status(400).json({ error: 'Informe o nome completo do responsável.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(responsibleEmail)) return res.status(400).json({ error: 'Informe um e-mail válido.' });
    if (responsiblePhone.replace(/\D/g, '').length < 10) return res.status(400).json({ error: 'Informe um WhatsApp válido.' });

    const admin = getAdminClient();
    const { data: paymentRows, error: paymentError } = await admin.from('financial_payments').select('event_id,athlete_id,provider_payload').eq('athlete_id', athlete.id).order('updated_at', { ascending: false }).limit(1);
    if (paymentError) throw paymentError;
    const target = paymentRows?.[0];
    if (!target) return res.status(404).json({ error: 'Nenhuma cobrança ativa encontrada para este atleta.' });
    const profile = { responsible_name: responsibleName, responsible_email: responsibleEmail, responsible_phone: responsiblePhone };
    const nextPayload = { ...(target.provider_payload || {}), family_profile: profile, family_profile_updated_at: new Date().toISOString() };
    const { error } = await admin.from('financial_payments').update({ provider_payload: nextPayload, updated_at: new Date().toISOString() }).eq('event_id', target.event_id).eq('athlete_id', athlete.id);
    if (error) throw error;
    return res.status(200).json({ profile });
  } catch (error) {
    return res.status(500).json({ error: safeError(error) });
  }
}
