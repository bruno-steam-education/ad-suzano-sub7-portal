import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

export function getAdminClient() {
  if (!supabaseUrl || !supabaseSecretKey) throw new Error('Servidor de pagamentos sem conexão administrativa com o banco.');
  return createClient(supabaseUrl, supabaseSecretKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function allowMethods(req, res, methods) {
  if (methods.includes(req.method)) return true;
  res.setHeader('Allow', methods.join(', '));
  res.status(405).json({ error: 'Método não permitido.' });
  return false;
}

export async function requireFinanceStaff(req, res) {
  const authorization = req.headers.authorization || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!token) {
    res.status(401).json({ error: 'Sessão administrativa ausente.' });
    return null;
  }
  const admin = getAdminClient();
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) {
    res.status(401).json({ error: 'Sessão administrativa inválida ou expirada.' });
    return null;
  }
  const { data: staff, error: staffError } = await admin.from('staff_admins').select('user_id,role,display_name').eq('user_id', authData.user.id).single();
  if (staffError || !['coordinator', 'administrator'].includes(staff?.role)) {
    res.status(403).json({ error: 'Somente coordenação e administração podem gerar cobranças.' });
    return null;
  }
  return { admin, staff, user: authData.user };
}

export async function requireStaff(req, res) {
  const authorization = req.headers.authorization || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!token) {
    res.status(401).json({ error: 'Sessão administrativa ausente.' });
    return null;
  }
  const admin = getAdminClient();
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) {
    res.status(401).json({ error: 'Sessão administrativa inválida ou expirada.' });
    return null;
  }
  const { data: staff, error: staffError } = await admin.from('staff_admins').select('user_id,role,display_name').eq('user_id', authData.user.id).single();
  if (staffError || !['technical', 'coordinator', 'administrator'].includes(staff?.role)) {
    res.status(403).json({ error: 'Somente a equipe autorizada pode acessar este recurso.' });
    return null;
  }
  return { admin, staff, user: authData.user };
}

export function siteUrl() {
  return (process.env.SITE_URL || 'https://adsuzano.com.br').replace(/\/$/, '');
}

export async function infinitePayHandle(admin) {
  const handle = (process.env.INFINITEPAY_HANDLE || '').trim().replace(/^\$/, '');
  if (handle) return handle;
  const { data, error } = await admin.from('payment_provider_settings').select('handle').eq('provider', 'infinitepay').eq('is_active', true).maybeSingle();
  if (error) throw error;
  if (!data?.handle) throw new Error('InfiniteTag ainda não configurada. O administrador pode cadastrá-la no Financeiro.');
  return data.handle;
}

export async function parseJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

export function safeError(error) {
  const message = error instanceof Error
    ? error.message
    : error?.message || error?.details || error?.hint || String(error || 'Erro desconhecido.');
  return message.replace(/sb_(?:secret|publishable)_[A-Za-z0-9_-]+/g, '[credencial protegida]');
}
