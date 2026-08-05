import { allowMethods, getAdminClient, parseJsonBody, safeError } from '../../server/paymentServer.js';
import { paymentAthletes } from '../../server/paymentAthletes.js';

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['POST'])) return;
  res.setHeader('Cache-Control', 'no-store');
  try {
    const { athleteId, subscription } = await parseJsonBody(req);
    const athlete = paymentAthletes.find((item) => item.id === String(athleteId || ''));
    const endpoint = String(subscription?.endpoint || '').trim();
    const p256dh = String(subscription?.keys?.p256dh || '').trim();
    const auth = String(subscription?.keys?.auth || '').trim();
    if (!athlete || !endpoint || !p256dh || !auth || endpoint.length > 2048) return res.status(400).json({ error: 'Inscrição de notificações inválida.' });
    const admin = getAdminClient();
    const { error } = await admin.from('family_push_subscriptions').upsert({ athlete_id: athlete.id, endpoint, p256dh, auth, user_agent: String(req.headers['user-agent'] || '').slice(0, 500), is_active: true, updated_at: new Date().toISOString() }, { onConflict: 'endpoint' });
    if (error) throw error;
    return res.status(201).json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: safeError(error) });
  }
}
