import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3, CalendarCheck, Check, CircleDollarSign, Copy, Download, ExternalLink, FilePlus2, Link2, LoaderCircle,
  Plus, Trash2, UserCheck, UserRoundX, Users, X,
} from 'lucide-react';
import { useAthleteAdmin } from './AthleteAdminContext';
import { paymentAthletes } from '../../server/paymentAthletes.js';
import {
  archiveFinancialEvent,
  createOnlinePaymentLink,
  createAttendanceSession,
  createFinancialEvent,
  deleteAttendanceSession,
  getStaffOperationsSnapshot,
  saveAttendanceStatus,
  savePaymentStatus,
  saveInfinitePaySettings,
  subscribeToPaymentUpdates,
} from '../services/staffOperations';

const EMPTY_DATA = { sessions: [], attendance: [], financialEvents: [], payments: [], paymentSettings: [] };
const ATTENDANCE_OPTIONS = [
  { value: 'present', label: 'Veio', short: 'P', icon: UserCheck },
  { value: 'absent', label: 'Faltou', short: 'F', icon: UserRoundX },
  { value: 'justified', label: 'Justificada', short: 'J', icon: CalendarCheck },
];
const PAYMENT_LABELS = { pending: 'Pendente', paid: 'Pago', waived: 'Isento' };
const PAYMENT_CYCLE = { pending: 'paid', paid: 'waived', waived: 'pending' };
const PAYMENT_CODE_BY_ATHLETE_ID = new Map(paymentAthletes.map((athlete) => [athlete.id, athlete.code]));

function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

function monthInput() {
  return new Date().toISOString().slice(0, 7);
}

function formatDate(date) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(`${date}T12:00:00`));
}

function formatMoney(cents) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((Number(cents) || 0) / 100);
}

function csvCell(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

function downloadCsv(filename, rows) {
  const content = `\uFEFF${rows.map((row) => row.map(csvCell).join(';')).join('\n')}`;
  const href = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);
}

export default function StaffOperationsPanel({ categories }) {
  const { isAdmin, isCoordinator, isAdministrator, staff } = useAthleteAdmin();
  const canAccessFinance = isCoordinator || isAdministrator;
  const firstCategoryLabel = categories[0]?.label ?? 'Sub-7';
  const [data, setData] = useState(EMPTY_DATA);
  const [activeModule, setActiveModule] = useState('dashboard');
  const [category, setCategory] = useState(firstCategoryLabel);
  const [month, setMonth] = useState(monthInput());
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [attendanceFormOpen, setAttendanceFormOpen] = useState(false);
  const [financeFormOpen, setFinanceFormOpen] = useState(false);
  const [attendanceForm, setAttendanceForm] = useState({ sessionDate: todayInput(), title: 'Treino', notes: '' });
  const [financeForm, setFinanceForm] = useState({ eventDate: todayInput(), title: '', amount: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState('');
  const [error, setError] = useState('');
  const [paymentNotice, setPaymentNotice] = useState('');
  const [providerHandle, setProviderHandle] = useState('');

  const load = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      setData(await getStaffOperationsSnapshot());
      setError('');
    } catch (loadError) {
      setError(loadError.message || 'Não foi possível carregar a central da equipe.');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const setting = data.paymentSettings.find((item) => item.provider === 'infinitepay');
    setProviderHandle(setting?.handle ?? '');
  }, [data.paymentSettings]);
  useEffect(() => {
    if (!isAdmin || !canAccessFinance) return undefined;
    return subscribeToPaymentUpdates((payment) => {
      setData((current) => ({
        ...current,
        payments: [...current.payments.filter((item) => !(item.event_id === payment.event_id && item.athlete_id === payment.athlete_id)), payment],
      }));
      if (payment.status === 'paid' && payment.provider_status === 'paid') setPaymentNotice('Pagamento confirmado automaticamente pela InfinitePay.');
    });
  }, [canAccessFinance, isAdmin]);
  useEffect(() => {
    if (!canAccessFinance && activeModule === 'finance') setActiveModule('attendance');
  }, [activeModule, canAccessFinance]);
  useEffect(() => {
    setCategory((current) => {
      if (isAdministrator && current === firstCategoryLabel) return 'Todas';
      if (!isAdministrator && current === 'Todas') return firstCategoryLabel;
      return current;
    });
  }, [firstCategoryLabel, isAdministrator]);

  const selectedCategory = categories.find((item) => item.label === category) ?? categories[0];
  const athletes = category === 'Todas'
    ? categories.flatMap((item) => item.athletes.map((athlete) => ({ ...athlete, category: item.label })))
    : (selectedCategory?.athletes ?? []).map((athlete) => ({ ...athlete, category }));
  const monthSessions = data.sessions.filter((session) => (category === 'Todas' || session.category === category) && session.session_date.startsWith(month));
  const monthEvents = data.financialEvents.filter((event) => (category === 'Todas' || event.category === category) && event.event_date.startsWith(month));
  const selectedSession = monthSessions.find((session) => session.id === selectedSessionId) ?? monthSessions[0] ?? null;
  const selectedEvent = monthEvents.find((event) => event.id === selectedEventId) ?? monthEvents[0] ?? null;

  useEffect(() => {
    setSelectedSessionId((current) => monthSessions.some((item) => item.id === current) ? current : (monthSessions[0]?.id ?? ''));
    setSelectedEventId((current) => monthEvents.some((item) => item.id === current) ? current : (monthEvents[0]?.id ?? ''));
  }, [category, month, data.sessions, data.financialEvents]);

  const attendanceMap = useMemo(() => new Map(data.attendance.map((record) => [`${record.session_id}:${record.athlete_id}`, record])), [data.attendance]);
  const paymentMap = useMemo(() => new Map(data.payments.map((payment) => [`${payment.event_id}:${payment.athlete_id}`, payment])), [data.payments]);

  const dashboard = useMemo(() => {
    const athleteRows = athletes.map((athlete) => {
      const athleteSessions = monthSessions.filter((session) => session.category === athlete.category);
      const statuses = athleteSessions.map((session) => attendanceMap.get(`${session.id}:${athlete.id}`)?.status ?? 'unmarked');
      const present = statuses.filter((status) => status === 'present').length;
      const absent = statuses.filter((status) => status === 'absent').length;
      const justified = statuses.filter((status) => status === 'justified').length;
      const unmarked = statuses.filter((status) => status === 'unmarked').length;
      const marked = present + absent + justified;
      return { ...athlete, present, absent, justified, unmarked, marked, rate: marked ? Math.round((present / marked) * 100) : null };
    }).sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1) || a.name.localeCompare(b.name, 'pt-BR'));
    const totals = athleteRows.reduce((sum, athlete) => ({
      present: sum.present + athlete.present,
      absent: sum.absent + athlete.absent,
      justified: sum.justified + athlete.justified,
      unmarked: sum.unmarked + athlete.unmarked,
    }), { present: 0, absent: 0, justified: 0, unmarked: 0 });
    const marked = totals.present + totals.absent + totals.justified;
    const payments = monthEvents.flatMap((event) => athletes.filter((athlete) => athlete.category === event.category).map((athlete) => ({
      event,
      status: paymentMap.get(`${event.id}:${athlete.id}`)?.status ?? 'pending',
    })));
    const receivedCents = payments.reduce((sum, item) => sum + (item.status === 'paid' ? item.event.amount_cents : 0), 0);
    const pendingCents = payments.reduce((sum, item) => sum + (item.status === 'pending' ? item.event.amount_cents : 0), 0);
    return {
      athleteRows,
      ...totals,
      marked,
      rate: marked ? Math.round((totals.present / marked) * 100) : null,
      receivedCents,
      pendingCents,
      paidCount: payments.filter((item) => item.status === 'paid').length,
      pendingCount: payments.filter((item) => item.status === 'pending').length,
      categoryRows: categories.map((item) => {
        const rows = athleteRows.filter((athlete) => athlete.category === item.label);
        const summary = rows.reduce((sum, athlete) => ({
          present: sum.present + athlete.present,
          absent: sum.absent + athlete.absent,
          justified: sum.justified + athlete.justified,
          unmarked: sum.unmarked + athlete.unmarked,
        }), { present: 0, absent: 0, justified: 0, unmarked: 0 });
        const markedRecords = summary.present + summary.absent + summary.justified;
        return { category: item.label, athletes: item.athletes.length, sessions: monthSessions.filter((session) => session.category === item.label).length, ...summary, rate: markedRecords ? Math.round((summary.present / markedRecords) * 100) : null };
      }),
    };
  }, [athletes, attendanceMap, categories, monthEvents, monthSessions, paymentMap]);

  if (!isAdmin) return null;

  const createSession = async (event) => {
    event.preventDefault();
    if (category === 'Todas') return;
    setLoading(true);
    setError('');
    try {
      const created = await createAttendanceSession({
        category,
        ...attendanceForm,
        athleteIds: athletes.map((athlete) => athlete.id),
      });
      await load();
      setSelectedSessionId(created.id);
      setMonth(created.session_date.slice(0, 7));
      setAttendanceFormOpen(false);
      setAttendanceForm({ sessionDate: todayInput(), title: 'Treino', notes: '' });
    } catch (createError) {
      setError(createError.message || 'Não foi possível criar a chamada.');
    } finally {
      setLoading(false);
    }
  };

  const updateAttendance = async (athleteId, status) => {
    if (!selectedSession) return;
    const key = `${selectedSession.id}:${athleteId}`;
    const previous = attendanceMap.get(key);
    setSavingKey(key);
    setData((current) => ({
      ...current,
      attendance: [...current.attendance.filter((item) => !(item.session_id === selectedSession.id && item.athlete_id === athleteId)), { ...previous, session_id: selectedSession.id, athlete_id: athleteId, status }],
    }));
    try {
      const saved = await saveAttendanceStatus(selectedSession.id, athleteId, status);
      setData((current) => ({
        ...current,
        attendance: [...current.attendance.filter((item) => !(item.session_id === saved.session_id && item.athlete_id === saved.athlete_id)), saved],
      }));
    } catch (saveError) {
      setError(saveError.message || 'Não foi possível salvar a presença.');
      await load();
    } finally {
      setSavingKey('');
    }
  };

  const removeSession = async () => {
    if (!selectedSession || !window.confirm(`Excluir a chamada “${selectedSession.title}” de ${formatDate(selectedSession.session_date)}?`)) return;
    try {
      await deleteAttendanceSession(selectedSession.id);
      await load();
    } catch (deleteError) {
      setError(deleteError.message || 'Não foi possível excluir a chamada.');
    }
  };

  const exportAttendance = () => {
    if (category === 'Todas') {
      const rows = [['Categoria', 'Atleta', 'Chamadas', 'Presenças', 'Faltas', 'Justificadas', 'Sem marcação', 'Frequência']];
      dashboard.athleteRows.forEach((athlete) => rows.push([
        athlete.category,
        athlete.name,
        athlete.marked + athlete.unmarked,
        athlete.present,
        athlete.absent,
        athlete.justified,
        athlete.unmarked,
        athlete.rate === null ? '—' : `${athlete.rate}%`,
      ]));
      downloadCsv(`frequencia-geral-${month}.csv`, rows);
      return;
    }
    const rows = [['Atleta', ...monthSessions.map((session) => `${formatDate(session.session_date)} - ${session.title}`), 'Presenças', 'Faltas', 'Justificadas', 'Frequência']];
    athletes.forEach((athlete) => {
      const statuses = monthSessions.map((session) => attendanceMap.get(`${session.id}:${athlete.id}`)?.status ?? 'unmarked');
      const present = statuses.filter((status) => status === 'present').length;
      const absent = statuses.filter((status) => status === 'absent').length;
      const justified = statuses.filter((status) => status === 'justified').length;
      const considered = present + absent + justified;
      rows.push([athlete.name, ...statuses.map((status) => ({ present: 'Presente', absent: 'Faltou', justified: 'Justificada', unmarked: 'Não marcado' })[status]), present, absent, justified, considered ? `${Math.round((present / considered) * 100)}%` : '—']);
    });
    downloadCsv(`frequencia-${category.toLowerCase()}-${month}.csv`, rows);
  };

  const createFinanceEvent = async (event) => {
    event.preventDefault();
    if (category === 'Todas') return;
    const amountCents = Math.round(Number(financeForm.amount.replace(',', '.')) * 100);
    if (!financeForm.title.trim() || !Number.isFinite(amountCents) || amountCents < 0) return;
    setLoading(true);
    setError('');
    try {
      const created = await createFinancialEvent({
        category,
        title: financeForm.title,
        eventDate: financeForm.eventDate,
        amountCents,
        description: financeForm.description,
        athleteIds: athletes.map((athlete) => athlete.id),
      });
      await load();
      setSelectedEventId(created.id);
      setMonth(created.event_date.slice(0, 7));
      setFinanceFormOpen(false);
      setFinanceForm({ eventDate: todayInput(), title: '', amount: '', description: '' });
    } catch (createError) {
      setError(createError.message || 'Não foi possível criar a cobrança.');
    } finally {
      setLoading(false);
    }
  };

  const updatePayment = async (event, athleteId) => {
    const key = `${event.id}:${athleteId}`;
    const current = paymentMap.get(key)?.status ?? 'pending';
    const status = PAYMENT_CYCLE[current];
    setSavingKey(key);
    try {
      const saved = await savePaymentStatus(event, athleteId, status);
      setData((previous) => ({
        ...previous,
        payments: [...previous.payments.filter((item) => !(item.event_id === saved.event_id && item.athlete_id === saved.athlete_id)), saved],
      }));
    } catch (saveError) {
      setError(saveError.message || 'Não foi possível atualizar o pagamento.');
    } finally {
      setSavingKey('');
    }
  };

  const copyPaymentLink = async (event, athlete) => {
    const key = `link:${event.id}:${athlete.id}`;
    setSavingKey(key);
    setPaymentNotice('');
    setError('');
    try {
      const currentPayment = paymentMap.get(`${event.id}:${athlete.id}`);
      const result = currentPayment?.provider_checkout_url
        ? { url: currentPayment.provider_checkout_url, reused: true }
        : await createOnlinePaymentLink(event.id, athlete.id);
      await navigator.clipboard.writeText(result.url);
      setPaymentNotice(`Link de ${athlete.name} copiado. Envie somente à família responsável.`);
      if (!currentPayment?.provider_checkout_url) await load();
    } catch (linkError) {
      setError(linkError.message || 'Não foi possível criar ou copiar o link.');
    } finally {
      setSavingKey('');
    }
  };

  const saveProviderSettings = async (event) => {
    event.preventDefault();
    setSavingKey('provider-settings');
    setError('');
    try {
      await saveInfinitePaySettings(providerHandle);
      setPaymentNotice('InfinitePay configurada. Os links de cobrança já podem ser gerados.');
      await load();
    } catch (settingsError) {
      setError(settingsError.message || 'Não foi possível salvar a configuração da InfinitePay.');
    } finally {
      setSavingKey('');
    }
  };

  const removeFinancialEvent = async () => {
    if (!selectedEvent || !window.confirm(`Arquivar a cobrança “${selectedEvent.title}”? O histórico será preservado.`)) return;
    try {
      await archiveFinancialEvent(selectedEvent.id);
      await load();
    } catch (archiveError) {
      setError(archiveError.message || 'Não foi possível arquivar a cobrança.');
    }
  };

  const exportFinance = () => {
    if (category === 'Todas') {
      const rows = [['Categoria', 'Atleta', 'Eventos', 'Pagos', 'Pendentes', 'Isentos', 'Total pago', 'Total pendente']];
      dashboard.athleteRows.forEach((athlete) => {
        const athleteEvents = monthEvents.filter((event) => event.category === athlete.category);
        const payments = athleteEvents.map((event) => ({ event, payment: paymentMap.get(`${event.id}:${athlete.id}`) }));
        const paidCount = payments.filter(({ payment }) => payment?.status === 'paid').length;
        const pendingCount = payments.filter(({ payment }) => (payment?.status ?? 'pending') === 'pending').length;
        const waivedCount = payments.filter(({ payment }) => payment?.status === 'waived').length;
        const paid = payments.reduce((sum, { event, payment }) => sum + (payment?.status === 'paid' ? event.amount_cents : 0), 0);
        const pending = payments.reduce((sum, { event, payment }) => sum + ((payment?.status ?? 'pending') === 'pending' ? event.amount_cents : 0), 0);
        rows.push([athlete.category, athlete.name, athleteEvents.length, paidCount, pendingCount, waivedCount, formatMoney(paid), formatMoney(pending)]);
      });
      downloadCsv(`financeiro-geral-${month}.csv`, rows);
      return;
    }
    const rows = [['Atleta', ...monthEvents.map((event) => `${formatDate(event.event_date)} - ${event.title} (${formatMoney(event.amount_cents)})`), 'Total pago', 'Total pendente']];
    athletes.forEach((athlete) => {
      const payments = monthEvents.map((event) => paymentMap.get(`${event.id}:${athlete.id}`));
      const paid = payments.reduce((sum, payment) => sum + (payment?.status === 'paid' ? payment.amount_paid_cents : 0), 0);
      const pending = monthEvents.reduce((sum, event, index) => sum + ((payments[index]?.status ?? 'pending') === 'pending' ? event.amount_cents : 0), 0);
      rows.push([athlete.name, ...payments.map((payment) => PAYMENT_LABELS[payment?.status ?? 'pending']), formatMoney(paid), formatMoney(pending)]);
    });
    downloadCsv(`financeiro-${category.toLowerCase()}-${month}.csv`, rows);
  };

  const sessionCounts = selectedSession ? athletes.reduce((counts, athlete) => {
    const status = attendanceMap.get(`${selectedSession.id}:${athlete.id}`)?.status ?? 'unmarked';
    counts[status] += 1;
    return counts;
  }, { present: 0, absent: 0, justified: 0, unmarked: 0 }) : null;

  const eventCounts = selectedEvent ? athletes.reduce((counts, athlete) => {
    const status = paymentMap.get(`${selectedEvent.id}:${athlete.id}`)?.status ?? 'pending';
    counts[status] += 1;
    return counts;
  }, { paid: 0, pending: 0, waived: 0 }) : null;

  return (
    <section className="staff-operations" aria-labelledby="staff-operations-title">
      <header className="staff-operations-head">
        <div>
          <span>{isAdministrator ? 'ADMINISTRAÇÃO' : isCoordinator ? 'COORDENAÇÃO' : 'COMISSÃO TÉCNICA'} · ÁREA PROTEGIDA</span>
          <h2 id="staff-operations-title">Central da Equipe</h2>
          <p>Olá, {staff?.display_name || 'equipe'}. Presenças e pagamentos são salvos automaticamente.</p>
        </div>
        <div className="staff-operations-role"><Users size={18} />{isAdministrator ? 'Visão geral do clube' : isCoordinator ? 'Acesso completo' : 'Frequência dos atletas'}</div>
      </header>

      <div className="staff-operations-toolbar">
        <div className={`staff-module-tabs${canAccessFinance ? ' has-finance' : ''}`} role="tablist" aria-label="Módulos administrativos">
          <button type="button" className={activeModule === 'dashboard' ? 'is-active' : ''} onClick={() => setActiveModule('dashboard')}><BarChart3 size={18} /> Dashboard</button>
          <button type="button" className={activeModule === 'attendance' ? 'is-active' : ''} onClick={() => setActiveModule('attendance')}><CalendarCheck size={18} /> Frequência</button>
          {canAccessFinance ? <button type="button" className={activeModule === 'finance' ? 'is-active' : ''} onClick={() => setActiveModule('finance')}><CircleDollarSign size={18} /> Financeiro</button> : null}
        </div>
        <label>Categoria<select value={category} onChange={(event) => setCategory(event.target.value)}>{isAdministrator ? <option>Todas</option> : null}{categories.map((item) => <option key={item.label}>{item.label}</option>)}</select></label>
        <label>Mês<input type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></label>
      </div>

      {error ? <div className="staff-operations-error" role="alert">{error}<button type="button" onClick={() => setError('')} aria-label="Fechar"><X size={15} /></button></div> : null}
      {paymentNotice ? <div className="staff-payment-notice" role="status"><Check size={17} />{paymentNotice}<button type="button" onClick={() => setPaymentNotice('')} aria-label="Fechar"><X size={15} /></button></div> : null}
      {loading ? <div className="staff-operations-loading"><LoaderCircle size={20} /> Atualizando dados...</div> : null}

      {activeModule === 'dashboard' ? (
        <div className="staff-module-panel staff-dashboard">
          <div className="staff-dashboard-title">
            <div><strong>{category === 'Todas' ? 'Visão geral de todas as categorias' : `Visão mensal do ${category}`}</strong><span>Indicadores calculados com os registros de {month}</span></div>
            <div className="staff-dashboard-exports">
              <button type="button" className="staff-secondary-action" onClick={exportAttendance} disabled={!monthSessions.length}><Download size={17} /> Frequência CSV</button>
              {canAccessFinance ? <button type="button" className="staff-secondary-action" onClick={exportFinance} disabled={!monthEvents.length}><Download size={17} /> Financeiro CSV</button> : null}
            </div>
          </div>

          <div className="staff-dashboard-kpis">
            <article><span>Frequência geral</span><strong>{dashboard.rate === null ? '—' : `${dashboard.rate}%`}</strong><small>{dashboard.present} presenças em {dashboard.marked} marcações</small></article>
            <article><span>Chamadas no mês</span><strong>{monthSessions.length}</strong><small>{athletes.length} atletas {category === 'Todas' ? `em ${categories.length} categorias` : `no ${category}`}</small></article>
            <article><span>Faltas</span><strong>{dashboard.absent}</strong><small>{dashboard.justified} justificadas</small></article>
            <article className={dashboard.unmarked ? 'has-warning' : ''}><span>Sem marcação</span><strong>{dashboard.unmarked}</strong><small>{!monthSessions.length ? 'Nenhuma chamada no mês' : dashboard.unmarked ? 'Requer conferência' : 'Tudo conferido'}</small></article>
            {canAccessFinance ? <article><span>Recebido no mês</span><strong>{formatMoney(dashboard.receivedCents)}</strong><small>{dashboard.paidCount} pagamento(s)</small></article> : null}
            {canAccessFinance ? <article className={dashboard.pendingCents ? 'has-warning' : ''}><span>Pendente</span><strong>{formatMoney(dashboard.pendingCents)}</strong><small>{dashboard.pendingCount} cobrança(s)</small></article> : null}
          </div>

          {category === 'Todas' ? (
            <section className="staff-dashboard-categories" aria-labelledby="category-summary-title">
              <div className="staff-dashboard-section-head"><strong id="category-summary-title">Resumo por categoria</strong><span>Todas as equipes no mesmo relatório</span></div>
              <div className="staff-dashboard-table-wrap">
                <table>
                  <thead><tr><th>Categoria</th><th>Atletas</th><th>Chamadas</th><th>Presenças</th><th>Faltas</th><th>Just.</th><th>Pendentes</th><th>Frequência</th></tr></thead>
                  <tbody>{dashboard.categoryRows.map((row) => <tr key={row.category}><th>{row.category}</th><td>{row.athletes}</td><td>{row.sessions}</td><td>{row.present}</td><td>{row.absent}</td><td>{row.justified}</td><td>{row.unmarked}</td><td><strong>{row.rate === null ? '—' : `${row.rate}%`}</strong></td></tr>)}</tbody>
                </table>
              </div>
            </section>
          ) : null}

          <div className="staff-dashboard-grid">
            <section className="staff-dashboard-breakdown" aria-labelledby="attendance-breakdown-title">
              <div className="staff-dashboard-section-head"><strong id="attendance-breakdown-title">Distribuição da frequência</strong><span>{dashboard.marked} registros conferidos</span></div>
              {[
                ['Presenças', dashboard.present, 'is-present'],
                ['Faltas', dashboard.absent, 'is-absent'],
                ['Justificadas', dashboard.justified, 'is-justified'],
                ['Sem marcação', dashboard.unmarked, 'is-unmarked'],
              ].map(([label, value, className]) => {
                const total = dashboard.marked + dashboard.unmarked;
                const percent = total ? Math.round((value / total) * 100) : 0;
                return <div className="staff-dashboard-bar" key={label}><div><span>{label}</span><strong>{value} · {percent}%</strong></div><div className="staff-dashboard-track"><i className={className} style={{ width: `${percent}%` }} /></div></div>;
              })}
            </section>

            <section className="staff-dashboard-ranking" aria-labelledby="attendance-ranking-title">
              <div className="staff-dashboard-section-head"><strong id="attendance-ranking-title">Frequência por atleta</strong><span>Ordenado pelo aproveitamento mensal</span></div>
              <div className="staff-dashboard-table-wrap">
                <table>
                  <thead><tr><th>Atleta</th>{category === 'Todas' ? <th>Categoria</th> : null}<th>Presenças</th><th>Faltas</th><th>Just.</th><th>Frequência</th></tr></thead>
                  <tbody>{dashboard.athleteRows.map((athlete) => <tr key={`${athlete.category}:${athlete.id}`}><th>{athlete.name}</th>{category === 'Todas' ? <td>{athlete.category}</td> : null}<td>{athlete.present}</td><td>{athlete.absent}</td><td>{athlete.justified}</td><td><strong>{athlete.rate === null ? '—' : `${athlete.rate}%`}</strong>{athlete.unmarked ? <small>{athlete.unmarked} pendente(s)</small> : null}</td></tr>)}</tbody>
                </table>
              </div>
            </section>
          </div>
          <p className="staff-dashboard-note">Frequência = presenças ÷ registros marcados. Chamadas ainda não preenchidas são mostradas separadamente e não alteram o percentual.</p>
        </div>
      ) : activeModule === 'attendance' ? (
        <div className="staff-module-panel">
          <div className="staff-module-actions">
            <div><strong>Chamadas de {month}</strong><span>{monthSessions.length} registro(s) no mês</span></div>
            <button type="button" className="staff-secondary-action" onClick={exportAttendance} disabled={!monthSessions.length}><Download size={17} /> Relatório mensal</button>
            <button type="button" className="staff-primary-action" onClick={() => setAttendanceFormOpen((open) => !open)} disabled={category === 'Todas'} title={category === 'Todas' ? 'Selecione uma categoria para criar a chamada' : undefined}><Plus size={17} /> Nova chamada</button>
          </div>
          {attendanceFormOpen && category !== 'Todas' ? (
            <form className="staff-inline-form" onSubmit={createSession}>
              <label>Data<input type="date" value={attendanceForm.sessionDate} onChange={(event) => setAttendanceForm((current) => ({ ...current, sessionDate: event.target.value }))} required /></label>
              <label>Atividade<input value={attendanceForm.title} onChange={(event) => setAttendanceForm((current) => ({ ...current, title: event.target.value }))} placeholder="Treino, jogo, avaliação..." required /></label>
              <label className="is-wide">Observação<input value={attendanceForm.notes} onChange={(event) => setAttendanceForm((current) => ({ ...current, notes: event.target.value }))} /></label>
              <button type="submit" className="staff-primary-action"><FilePlus2 size={17} /> Criar chamada</button>
            </form>
          ) : null}
          {category === 'Todas' ? (
            <div className="staff-global-overview">
              <strong>Frequência consolidada</strong>
              <span>Use o Dashboard para comparar todas as categorias ou exporte o relatório geral. Para criar ou editar uma chamada, selecione um Sub.</span>
            </div>
          ) : monthSessions.length ? (
            <>
              <div className="staff-record-selector">
                {monthSessions.map((session) => <button type="button" key={session.id} className={selectedSession?.id === session.id ? 'is-active' : ''} onClick={() => setSelectedSessionId(session.id)}><strong>{formatDate(session.session_date)}</strong><span>{session.title}</span></button>)}
              </div>
              <div className="staff-summary-strip">
                <span className="is-present"><strong>{sessionCounts?.present}</strong> presentes</span>
                <span className="is-absent"><strong>{sessionCounts?.absent}</strong> faltas</span>
                <span><strong>{sessionCounts?.justified}</strong> justificadas</span>
                <span><strong>{sessionCounts?.unmarked}</strong> não marcados</span>
                <button type="button" onClick={removeSession} title="Excluir chamada"><Trash2 size={16} /> Excluir</button>
              </div>
              <div className="attendance-roster">
                {athletes.map((athlete) => {
                  const key = `${selectedSession.id}:${athlete.id}`;
                  const status = attendanceMap.get(key)?.status ?? 'unmarked';
                  return (
                    <article key={athlete.id}>
                      <div><strong>{athlete.name}</strong><span>{category}</span></div>
                      <div className="attendance-actions" aria-label={`Presença de ${athlete.name}`}>
                        {ATTENDANCE_OPTIONS.map((option) => {
                          const Icon = option.icon;
                          return <button type="button" key={option.value} className={status === option.value ? `is-active is-${option.value}` : ''} onClick={() => updateAttendance(athlete.id, option.value)} disabled={savingKey === key} title={option.label}><Icon size={17} /><span>{option.label}</span></button>;
                        })}
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          ) : <div className="staff-empty-state"><CalendarCheck size={28} /><strong>Nenhuma chamada neste mês</strong><span>Crie a primeira chamada para começar a frequência do {category}.</span></div>}
        </div>
      ) : (
        <div className="staff-module-panel">
          <div className="staff-module-actions">
            <div><strong>Eventos e jogos de {month}</strong><span>{monthEvents.length} cobrança(s) no mês</span></div>
            <button type="button" className="staff-secondary-action" onClick={exportFinance} disabled={!monthEvents.length}><Download size={17} /> Relatório financeiro</button>
            <button type="button" className="staff-primary-action" onClick={() => setFinanceFormOpen((open) => !open)} disabled={category === 'Todas'} title={category === 'Todas' ? 'Selecione uma categoria para criar o evento' : undefined}><Plus size={17} /> Novo evento</button>
          </div>
          {financeFormOpen && category !== 'Todas' ? (
            <form className="staff-inline-form finance-event-form" onSubmit={createFinanceEvent}>
              <label>Data<input type="date" value={financeForm.eventDate} onChange={(event) => setFinanceForm((current) => ({ ...current, eventDate: event.target.value }))} required /></label>
              <label>Evento<input value={financeForm.title} onChange={(event) => setFinanceForm((current) => ({ ...current, title: event.target.value }))} placeholder="Jogo, amistoso, torneio..." required /></label>
              <label>Valor por atleta<input inputMode="decimal" value={financeForm.amount} onChange={(event) => setFinanceForm((current) => ({ ...current, amount: event.target.value.replace(/[^0-9,.]/g, '') }))} placeholder="50,00" required /></label>
              <label className="is-wide">Descrição<input value={financeForm.description} onChange={(event) => setFinanceForm((current) => ({ ...current, description: event.target.value }))} /></label>
              <button type="submit" className="staff-primary-action"><FilePlus2 size={17} /> Criar cobrança</button>
            </form>
          ) : null}
          {category === 'Todas' ? (
            <div className="staff-global-overview">
              <strong>Financeiro consolidado</strong>
              <span>O Dashboard apresenta recebido e pendente de todo o clube. Exporte o CSV geral ou selecione um Sub para alterar pagamentos e cobranças.</span>
            </div>
          ) : monthEvents.length ? (
            <>
              <div className="staff-record-selector finance-selector">
                {monthEvents.map((event) => <button type="button" key={event.id} className={selectedEvent?.id === event.id ? 'is-active' : ''} onClick={() => setSelectedEventId(event.id)}><strong>{event.title}</strong><span>{formatDate(event.event_date)} · {formatMoney(event.amount_cents)}</span></button>)}
              </div>
              <div className="staff-summary-strip is-financial">
                <span className="is-present"><strong>{eventCounts?.paid}</strong> pagos</span>
                <span className="is-absent"><strong>{eventCounts?.pending}</strong> pendentes</span>
                <span><strong>{eventCounts?.waived}</strong> isentos</span>
                <span><strong>{formatMoney((eventCounts?.paid ?? 0) * (selectedEvent?.amount_cents ?? 0))}</strong> recebido</span>
                <button type="button" onClick={removeFinancialEvent} title="Arquivar evento"><Trash2 size={16} /> Arquivar</button>
              </div>
              <div className="online-payment-guide"><Link2 size={19} /><div><strong>Cobrança online automática</strong><span>Use “Gerar link” ao lado do atleta e envie o endereço somente à família. Pix ou cartão são confirmados automaticamente aqui após a validação da InfinitePay.</span></div></div>
              {isAdministrator ? <form className="payment-provider-settings" onSubmit={saveProviderSettings}><label>InfiniteTag da AD Suzano<span>Informe sem o símbolo $</span><input value={providerHandle} onChange={(event) => setProviderHandle(event.target.value.replace(/^\$/, ''))} placeholder="exemplo: adsuzano" autoComplete="off" required /></label><button type="submit" className="staff-secondary-action" disabled={savingKey === 'provider-settings'}>{savingKey === 'provider-settings' ? <LoaderCircle size={16} className="is-spinning" /> : <Check size={16} />} Salvar InfinitePay</button></form> : null}
              <div className="finance-matrix-wrap">
                <table className="finance-matrix">
                  <thead><tr><th>Atleta</th><th className="finance-code-heading">ID de cobrança</th>{monthEvents.map((event) => <th key={event.id}><span>{event.title}</span><small>{formatDate(event.event_date)}</small></th>)}</tr></thead>
                  <tbody>{athletes.map((athlete) => <tr key={athlete.id}><th>{athlete.name}</th><td className="finance-athlete-code"><code>{PAYMENT_CODE_BY_ATHLETE_ID.get(athlete.id) || '—'}</code></td>{monthEvents.map((event) => {
                    const key = `${event.id}:${athlete.id}`;
                    const status = paymentMap.get(key)?.status ?? 'pending';
                    const payment = paymentMap.get(key);
                    const linkKey = `link:${event.id}:${athlete.id}`;
                    return <td key={event.id}><div className="payment-cell-actions"><button type="button" className={`payment-status is-${status}`} onClick={() => updatePayment(event, athlete.id)} disabled={savingKey === key} title="Ajuste manual: clique para alternar entre pendente, pago e isento">{status === 'paid' ? <Check size={16} /> : status === 'waived' ? '—' : '!' }<span>{PAYMENT_LABELS[status]}</span></button>{status === 'pending' ? <button type="button" className="payment-link-action" onClick={() => copyPaymentLink(event, athlete)} disabled={savingKey === linkKey} title={payment?.provider_checkout_url ? 'Copiar novamente o link individual' : 'Gerar e copiar link individual'}>{savingKey === linkKey ? <LoaderCircle size={15} className="is-spinning" /> : payment?.provider_checkout_url ? <Copy size={15} /> : <Link2 size={15} />}<span>{payment?.provider_checkout_url ? 'Copiar link' : 'Gerar link'}</span></button> : payment?.provider_receipt_url ? <a className="payment-receipt-link" href={payment.provider_receipt_url} target="_blank" rel="noreferrer" title="Abrir comprovante validado"><ExternalLink size={14} /> Comprovante</a> : null}{payment?.provider_status === 'paid' ? <small className="payment-auto-badge">Automático</small> : null}</div></td>;
                  })}</tr>)}</tbody>
                </table>
              </div>
            </>
          ) : <div className="staff-empty-state"><CircleDollarSign size={28} /><strong>Nenhuma cobrança neste mês</strong><span>Use “Novo evento” para adicionar um jogo, amistoso ou torneio.</span></div>}
        </div>
      )}
    </section>
  );
}
