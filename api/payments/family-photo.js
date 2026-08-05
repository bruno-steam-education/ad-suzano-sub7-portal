import { allowMethods, getAdminClient, parseJsonBody, safeError } from '../../server/paymentServer.js';
import { findPaymentAthlete } from '../../server/paymentAthletes.js';

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['POST'])) return;
  res.setHeader('Cache-Control', 'no-store');
  try {
    const body = await parseJsonBody(req);
    const athlete = findPaymentAthlete(body);
    if (!athlete || athlete.id !== body.athleteId) return res.status(404).json({ error: 'Atleta não localizado.' });
    const contentType = String(body.contentType || '');
    const encoded = String(body.data || '').replace(/^data:[^;]+;base64,/, '');
    if (!/^image\/(jpeg|png|webp)$/.test(contentType) || !encoded || encoded.length > 4_000_000) return res.status(400).json({ error: 'Envie uma imagem JPG, PNG ou WebP de até 3 MB.' });

    const admin = getAdminClient();
    const extension = contentType.split('/')[1].replace('jpeg', 'jpg');
    const path = `family/${athlete.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
    const { error: uploadError } = await admin.storage.from('athlete-photos').upload(path, Buffer.from(encoded, 'base64'), { contentType, cacheControl: '3600', upsert: false });
    if (uploadError) throw uploadError;
    const { data: publicUrl } = admin.storage.from('athlete-photos').getPublicUrl(path);
    const { error: profileError } = await admin.from('athlete_profiles').upsert({ athlete_id: athlete.id, category: athlete.category, full_name: athlete.name, is_active: true, photo_path: path, photo_url: publicUrl.publicUrl }, { onConflict: 'athlete_id' });
    if (profileError) throw profileError;
    return res.status(200).json({ photoUrl: publicUrl.publicUrl });
  } catch (error) {
    return res.status(500).json({ error: safeError(error) });
  }
}
