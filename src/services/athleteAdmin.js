import { isSupabaseConfigured, supabase } from './supabase';

const PROFILE_FIELDS = [
  'athlete_id', 'category', 'full_name', 'is_active', 'role', 'age', 'height_cm',
  'weight_kg', 'coach', 'photo_path', 'photo_url', 'speed', 'shot',
  'ball_control', 'defense', 'updated_at',
].join(',');

const EVENT_FIELDS = [
  'id', 'athlete_id', 'source', 'note', 'games', 'goals', 'assists', 'steals',
  'yellow_cards', 'red_cards', 'goals_conceded', 'saves', 'created_at',
].join(',');

function requireSupabase() {
  if (!isSupabaseConfigured) {
    throw new Error('A conexão com o banco ainda não está configurada neste ambiente.');
  }
  return supabase;
}

export async function getAthleteAdminSnapshot() {
  const client = requireSupabase();
  const [profilesResult, eventsResult] = await Promise.all([
    client.from('athlete_profiles').select(PROFILE_FIELDS),
    client.from('athlete_stat_events').select(EVENT_FIELDS).order('created_at', { ascending: true }),
  ]);

  if (profilesResult.error) throw profilesResult.error;
  if (eventsResult.error) throw eventsResult.error;
  return { profiles: profilesResult.data ?? [], events: eventsResult.data ?? [] };
}

export async function getStaffSession() {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session ?? null;
}

export function onStaffAuthChange(callback) {
  if (!isSupabaseConfigured) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
  return () => data.subscription.unsubscribe();
}

const STAFF_ACCOUNTS = {
  technical: 'comissao@adsuzano.com.br',
  coordinator: 'coordenacao@adsuzano.com.br',
  administrator: 'administrador@adsuzano.com.br',
};

export async function getStaffIdentity() {
  const client = requireSupabase();
  const { data, error } = await client
    .from('staff_admins')
    .select('user_id,email,role,display_name')
    .single();
  if (error) throw error;
  return data;
}

export async function signInStaff(account, password) {
  const client = requireSupabase();
  const email = STAFF_ACCOUNTS[account];
  if (!email) throw new Error('Perfil de acesso inválido.');
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data.session;
}

export async function signOutStaff() {
  const client = requireSupabase();
  const { error } = await client.auth.signOut();
  if (error) throw error;
}

export async function saveAthleteProfile(profile) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('athlete_profiles')
    .upsert(profile, { onConflict: 'athlete_id' })
    .select(PROFILE_FIELDS)
    .single();
  if (error) throw error;
  return data;
}

export async function addAthleteStatEvent(event) {
  const client = requireSupabase();
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError) throw userError;
  const { data, error } = await client
    .from('athlete_stat_events')
    .insert({ ...event, created_by: userData.user.id })
    .select(EVENT_FIELDS)
    .single();
  if (error) throw error;
  return data;
}

export async function archiveAthleteProfile(profile) {
  return saveAthleteProfile({ ...profile, is_active: false });
}

export async function uploadAthletePhoto(athleteId, file) {
  const client = requireSupabase();
  if (!file?.type?.startsWith('image/')) throw new Error('Selecione um arquivo de imagem válido.');
  if (file.size > 5 * 1024 * 1024) throw new Error('A imagem deve ter no máximo 5 MB.');

  const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-');
  const path = `${athleteId}/${Date.now()}-${safeName}`;
  const { error } = await client.storage.from('athlete-photos').upload(path, file, {
    cacheControl: '3600', contentType: file.type, upsert: false,
  });
  if (error) throw error;
  const { data } = client.storage.from('athlete-photos').getPublicUrl(path);
  return { photo_path: path, photo_url: data.publicUrl };
}
