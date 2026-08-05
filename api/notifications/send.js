import { allowMethods, getAdminClient, parseJsonBody, requireStaff, safeError } from '../../server/paymentServer.js';
import { paymentAthletes } from '../../server/paymentAthletes.js';
import { sendFamilyNotification } from '../../server/familyNotifications.js';

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['POST'])) return;
  try {
    const context = await requireStaff(req, res);
    if (!context) return;
    const body = await parseJsonBody(req);
    const athleteIds = [...new Set((body.athleteIds || []).map(String))].filter((id) => paymentAthletes.some((athlete) => athlete.id === id));
    const title = String(body.title || 'Novidade no Portal da Família').slice(0, 80);
    const message = String(body.body || 'Há uma nova atualização para consultar.').slice(0, 180);
    const result = await sendFamilyNotification(context.admin, { athleteIds, title, body: message, url: body.url || '/portal-do-atleta' });
    return res.status(200).json(result);
  } catch (error) { return res.status(500).json({ error: safeError(error) }); }
}
