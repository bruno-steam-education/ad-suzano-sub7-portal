import webpush from 'web-push';

export async function sendFamilyNotification(admin, { athleteIds, title, body, url = '/portal-do-atleta' }) {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@adsuzano.com.br';
  if (!publicKey || !privateKey || !athleteIds?.length) return { sent: 0, skipped: true };
  webpush.setVapidDetails(subject, publicKey, privateKey);
  const { data: subscriptions, error } = await admin.from('family_push_subscriptions').select('id,endpoint,p256dh,auth').in('athlete_id', athleteIds).eq('is_active', true);
  if (error) throw error;
  const payload = JSON.stringify({ title, body, url });
  let sent = 0;
  await Promise.all((subscriptions || []).map(async (subscription) => {
    try { await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, payload); sent += 1; }
    catch (pushError) { if ([404, 410].includes(pushError.statusCode)) await admin.from('family_push_subscriptions').update({ is_active: false, updated_at: new Date().toISOString() }).eq('id', subscription.id); }
  }));
  return { sent, skipped: false };
}
