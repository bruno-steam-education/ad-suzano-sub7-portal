import { isSupabaseConfigured, supabase } from './supabase';

const SESSION_FIELDS = 'id,category,session_date,title,notes,created_by,created_at,updated_at';
const ATTENDANCE_FIELDS = 'session_id,athlete_id,status,note,recorded_by,updated_at';
const FINANCIAL_EVENT_FIELDS = 'id,category,title,event_date,amount_cents,description,is_active,created_by,created_at,updated_at';
const PAYMENT_FIELDS = 'event_id,athlete_id,status,amount_paid_cents,paid_at,note,recorded_by,updated_at';

function requireSupabase() {
  if (!isSupabaseConfigured) throw new Error('A conexão com o banco não está configurada.');
  return supabase;
}

async function currentUserId() {
  const client = requireSupabase();
  const { data, error } = await client.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error('Sua sessão expirou. Entre novamente.');
  return data.user.id;
}

export async function getStaffOperationsSnapshot() {
  const client = requireSupabase();
  const [sessions, attendance, financialEvents, payments] = await Promise.all([
    client.from('attendance_sessions').select(SESSION_FIELDS).order('session_date', { ascending: false }),
    client.from('attendance_records').select(ATTENDANCE_FIELDS),
    client.from('financial_events').select(FINANCIAL_EVENT_FIELDS).eq('is_active', true).order('event_date', { ascending: false }),
    client.from('financial_payments').select(PAYMENT_FIELDS),
  ]);
  for (const result of [sessions, attendance, financialEvents, payments]) {
    if (result.error) throw result.error;
  }
  return {
    sessions: sessions.data ?? [],
    attendance: attendance.data ?? [],
    financialEvents: financialEvents.data ?? [],
    payments: payments.data ?? [],
  };
}

export async function createAttendanceSession({ category, sessionDate, title, notes, athleteIds }) {
  const client = requireSupabase();
  const userId = await currentUserId();
  const { data: session, error } = await client
    .from('attendance_sessions')
    .insert({ category, session_date: sessionDate, title: title.trim() || 'Treino', notes: notes?.trim() || null, created_by: userId })
    .select(SESSION_FIELDS)
    .single();
  if (error) throw error;
  if (athleteIds.length) {
    const rows = athleteIds.map((athleteId) => ({
      session_id: session.id,
      athlete_id: athleteId,
      status: 'unmarked',
      recorded_by: userId,
    }));
    const { error: recordsError } = await client.from('attendance_records').insert(rows);
    if (recordsError) throw recordsError;
  }
  return session;
}

export async function saveAttendanceStatus(sessionId, athleteId, status) {
  const client = requireSupabase();
  const userId = await currentUserId();
  const { data, error } = await client
    .from('attendance_records')
    .upsert({ session_id: sessionId, athlete_id: athleteId, status, recorded_by: userId, updated_at: new Date().toISOString() }, { onConflict: 'session_id,athlete_id' })
    .select(ATTENDANCE_FIELDS)
    .single();
  if (error) throw error;
  return data;
}

export async function deleteAttendanceSession(sessionId) {
  const client = requireSupabase();
  const { error } = await client.from('attendance_sessions').delete().eq('id', sessionId);
  if (error) throw error;
}

export async function createFinancialEvent({ category, title, eventDate, amountCents, description, athleteIds }) {
  const client = requireSupabase();
  const userId = await currentUserId();
  const { data: event, error } = await client
    .from('financial_events')
    .insert({
      category,
      title: title.trim(),
      event_date: eventDate,
      amount_cents: amountCents,
      description: description?.trim() || null,
      created_by: userId,
    })
    .select(FINANCIAL_EVENT_FIELDS)
    .single();
  if (error) throw error;
  if (athleteIds.length) {
    const rows = athleteIds.map((athleteId) => ({
      event_id: event.id,
      athlete_id: athleteId,
      status: 'pending',
      amount_paid_cents: 0,
      recorded_by: userId,
    }));
    const { error: paymentsError } = await client.from('financial_payments').insert(rows);
    if (paymentsError) throw paymentsError;
  }
  return event;
}

export async function savePaymentStatus(event, athleteId, status) {
  const client = requireSupabase();
  const userId = await currentUserId();
  const paid = status === 'paid';
  const { data, error } = await client
    .from('financial_payments')
    .upsert({
      event_id: event.id,
      athlete_id: athleteId,
      status,
      amount_paid_cents: paid ? event.amount_cents : 0,
      paid_at: paid ? new Date().toISOString() : null,
      recorded_by: userId,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'event_id,athlete_id' })
    .select(PAYMENT_FIELDS)
    .single();
  if (error) throw error;
  return data;
}

export async function archiveFinancialEvent(eventId) {
  const client = requireSupabase();
  const { error } = await client
    .from('financial_events')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', eventId);
  if (error) throw error;
}
