import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  CalendarCheck2,
  Check,
  ClipboardCheck,
  KeyRound,
  LayoutDashboard,
  MessageSquareText,
  ShieldCheck,
  Users,
  WalletCards,
  X,
} from 'lucide-react';
import { technicalStaffDirectory } from '../data/technicalStaff';
import StaffOperationsPanel from './StaffOperationsPanel';
import { useAthleteAdmin } from './AthleteAdminContext';

const ACCESS_KEY = 'ad-suzano-teacher-portal-session';

const teacherPasswords = {
  'Prof. Alex': 'Alex4827br',
  'Prof. Jonathan': 'Jonathan7314br',
  'Prof. Henrique': 'Henrique1968br',
  'Prof. Danny': 'Danny8542br',
  Lucimar: 'Lucimar4073br',
  Giba: 'Giba6291br',
};

function firstName(name = '') {
  return name.replace(/^Prof\.\s*/i, '').split(' ')[0];
}

function categoryLabel(value = '') {
  return value.replace(/\s+e\s+/gi, ' · ');
}

function operationsCategories(categories = []) {
  return categories.map((category) => ({
    label: category.label,
    athletes: (category.players ?? []).map((player) => ({
      id: player.url?.split('/').pop(),
      name: player.name,
    })),
  }));
}

export default function TeacherPortalPage({ categories = [] }) {
  const { isAdmin } = useAthleteAdmin();
  const [selectedStaff, setSelectedStaff] = useState(technicalStaffDirectory[0]?.name ?? '');
  const [password, setPassword] = useState('');
  const [session, setSession] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(ACCESS_KEY) || 'null'); } catch { return null; }
  });
  const [error, setError] = useState('');

  const selected = technicalStaffDirectory.find((person) => person.name === (session?.name || selectedStaff)) ?? technicalStaffDirectory[0];
  const scopedCategoryNames = useMemo(() => (
    selected?.categories?.split(/\s+e\s+/i).map((item) => item.trim()) ?? []
  ), [selected]);
  const scopedCategories = useMemo(() => categories.filter((category) => scopedCategoryNames.includes(category.label)), [categories, scopedCategoryNames]);
  const scopedAthletes = scopedCategories.reduce((total, category) => total + (category.players?.length ?? 0), 0);

  const enterPortal = (event) => {
    event.preventDefault();
    if (password !== teacherPasswords[selectedStaff]) {
      setError('Senha não reconhecida para este profissional.');
      return;
    }
    const next = { name: selectedStaff };
    sessionStorage.setItem(ACCESS_KEY, JSON.stringify(next));
    setSession(next);
    setPassword('');
    setError('');
  };

  const exitPortal = () => {
    sessionStorage.removeItem(ACCESS_KEY);
    setSession(null);
  };

  return (
    <div className="club-page teacher-portal-page">
      <section className="teacher-portal-hero">
        <div>
          <span className="teacher-portal-eyebrow"><ShieldCheck size={15} /> ÁREA INTERNA AD SUZANO</span>
          <h1>Painel dos professores</h1>
          <p>Chamada, atletas, feedbacks e rotina de cada categoria em um só lugar.</p>
        </div>
        <div className="teacher-portal-hero-mark"><Users size={28} /><strong>{technicalStaffDirectory.length}</strong><span>profissionais cadastrados</span></div>
      </section>

      {!session ? (
        <>
          <section className="teacher-login-card">
            <div className="teacher-login-heading"><KeyRound size={21} /><div><span>ACESSO INDIVIDUAL</span><h2>Entre no seu painel</h2></div></div>
            <form onSubmit={enterPortal} className="teacher-login-form">
              <label>Professor ou coordenação<select value={selectedStaff} onChange={(event) => { setSelectedStaff(event.target.value); setError(''); }}>
                {technicalStaffDirectory.map((person) => <option key={person.name} value={person.name}>{person.name} · {person.role}</option>)}
              </select></label>
              <label>Senha de acesso<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Digite sua senha" autoComplete="current-password" /></label>
              <button type="submit" className="teacher-primary-button"><KeyRound size={17} /> Entrar no painel <ArrowRight size={17} /></button>
            </form>
            {error ? <p className="teacher-login-error" role="alert"><X size={15} /> {error}</p> : null}
            <p className="teacher-login-note">O painel usa o vínculo de categorias cadastrado para cada profissional. As senhas são individuais e não ficam expostas nesta tela.</p>
          </section>

          <section className="teacher-directory-section">
            <div className="teacher-section-heading"><div><span>ESTRUTURA TÉCNICA</span><h2>Professores e categorias</h2></div><p>Selecione seu nome acima para abrir o ambiente correspondente.</p></div>
            <div className="teacher-directory-table-wrap"><table className="teacher-directory-table"><thead><tr><th>Profissional</th><th>Função</th><th>Categorias vinculadas</th><th>Status</th></tr></thead><tbody>
              {technicalStaffDirectory.map((person) => <tr key={person.name}><td><strong>{person.name}</strong><span>{person.fullName}</span></td><td>{person.role}</td><td>{categoryLabel(person.categories)}</td><td><span className="teacher-status"><Check size={14} /> Ativo</span></td></tr>)}
            </tbody></table></div>
          </section>
        </>
      ) : (
        <>
          <section className="teacher-workspace-head">
            <div><span>PAINEL DE {selected.role?.toUpperCase()}</span><h2>Olá, {firstName(selected.name)}.</h2><p>{selected.fullName} · {categoryLabel(selected.categories)}</p></div>
            <div className="teacher-workspace-actions"><a href="/portal-do-atleta" className="teacher-family-button"><Users size={17} /> Portal da Família <ArrowRight size={16} /></a><button type="button" className="teacher-logout-button" onClick={exitPortal}>Sair</button></div>
          </section>
          <section className="teacher-quick-grid">
            <article><ClipboardCheck size={20} /><strong>Chamada</strong><span>{scopedAthletes} atletas disponíveis nas suas categorias.</span></article>
            <article><MessageSquareText size={20} /><strong>Feedback</strong><span>Registre observações objetivas por atleta e por período.</span></article>
            <article><WalletCards size={20} /><strong>Financeiro</strong><span>Consulte o controle de eventos e pagamentos da coordenação.</span></article>
          </section>
          {isAdmin ? <StaffOperationsPanel categories={operationsCategories(scopedCategories)} /> : (
            <section className="teacher-connect-card"><LayoutDashboard size={24} /><div><h3>Pronto para preencher sua rotina</h3><p>O acesso de banco da comissão ainda não está conectado neste navegador. Use o botão abaixo para abrir a autenticação técnica e depois retorne a este painel.</p></div><a href="#/portal/atletas" className="teacher-primary-button">Abrir área técnica <ArrowRight size={17} /></a></section>
          )}
        </>
      )}

      <a className="teacher-family-banner" href="/portal-do-atleta"><Users size={20} /><div><strong>Portal da Família</strong><span>Frequência, feedbacks, agenda e pagamentos para os responsáveis.</span></div><ArrowRight size={19} /></a>
    </div>
  );
}
