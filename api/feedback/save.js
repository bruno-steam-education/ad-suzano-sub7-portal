import { allowMethods, parseJsonBody, requireStaff, safeError } from '../../server/paymentServer.js';
import { sendFamilyNotification } from '../../server/familyNotifications.js';

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['POST'])) return;
  res.setHeader('Cache-Control', 'no-store');
  try {
    const context = await requireStaff(req, res);
    if (!context) return;
    const body = await parseJsonBody(req);
    const text = String(body.text || '').trim().slice(0, 1600);
    const athleteId = String(body.athleteId || '').trim();
    if (!athleteId || text.length < 20) return res.status(400).json({ error: 'Feedback ou atleta inválido.' });
    const { data, error } = await context.admin.from('athlete_stat_events').insert({
      athlete_id: athleteId,
      source: 'coach_feedback',
      note: JSON.stringify({ text, rubric: body.rubric || {}, match: body.match || {}, athleteProfile: body.athleteProfile || {}, approved_by: context.staff.display_name || context.user.email, approved_at: new Date().toISOString() }),
      games: 0, goals: 0, assists: 0, steals: 0, yellow_cards: 0, red_cards: 0, goals_conceded: 0, saves: 0,
      created_by: context.user.id,
    }).select('id,athlete_id,source,note,created_at').single();
    if (error) throw error;
    await sendFamilyNotification(context.admin, { athleteIds: [athleteId], title: 'Novo feedback da comissão', body: 'A comissão técnica publicou um novo feedback no Portal da Família.', url: '/portal-do-atleta' });
    return res.status(201).json({ feedback: data });
  } catch (error) {
    return res.status(500).json({ error: safeError(error) });
  }
}
