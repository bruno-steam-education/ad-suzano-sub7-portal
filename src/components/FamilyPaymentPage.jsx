import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, CreditCard, LockKeyhole, Search, ShieldCheck } from 'lucide-react';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const date = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

export default function FamilyPaymentPage() {
  const [form, setForm] = useState({ firstName: '', lastName: '', code: '' });
  const [result, setResult] = useState(null);
  const [profile, setProfile] = useState({ responsibleName: '', responsibleEmail: '', responsiblePhone: '' });
  const [profileSaved, setProfileSaved] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [paying, setPaying] = useState('');

  const lookup = async (event) => {
    event.preventDefault();
    setBusy(true); setError(''); setResult(null);
    try {
      const response = await fetch('/api/payments/family-lookup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Não foi possível localizar o cadastro.');
      setResult(payload);
      if (payload.profile) {
        setProfile({ responsibleName: payload.profile.responsible_name, responsibleEmail: payload.profile.responsible_email, responsiblePhone: payload.profile.responsible_phone });
        setProfileSaved(true);
      } else {
        setProfile({ responsibleName: '', responsibleEmail: '', responsiblePhone: '' });
        setProfileSaved(false);
      }
    } catch (lookupError) { setError(lookupError.message); } finally { setBusy(false); }
  };

  const saveProfile = async (event) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const response = await fetch('/api/payments/family-profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, athleteId: result.athlete.id, ...profile }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Não foi possível salvar os dados.');
      setProfileSaved(true); setResult({ ...result, profile: payload.profile });
    } catch (profileError) { setError(profileError.message); } finally { setBusy(false); }
  };

  const startPayment = async (charge) => {
    setPaying(charge.id); setError('');
    try {
      const response = await fetch('/api/payments/family-create-link', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, athleteId: result.athlete.id, eventId: charge.id }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Não foi possível iniciar o pagamento.');
      window.location.assign(payload.url);
    } catch (paymentError) { setError(paymentError.message); setPaying(''); }
  };

  return <main className="family-payment-page">
    <header className="family-payment-header"><a href="/" className="family-payment-brand"><img src="/ad-suzano-logo.png" alt="AD Suzano" /><span><strong>AD Suzano</strong><small>Portal da Família</small></span></a><span className="family-safe-badge"><ShieldCheck size={17} /> Ambiente seguro</span></header>
    <section className="family-payment-hero"><div><span className="family-eyebrow">PAGAMENTO DE EVENTOS</span><h1>Encontre a cobrança do atleta</h1><p>Informe o primeiro nome, o último nome e o código de 4 dígitos recebido da coordenação.</p></div><div className="family-payment-icon"><CreditCard size={32} /></div></section>
    <section className="family-payment-card">
      <form onSubmit={lookup} className="family-lookup-form">
        <label>Primeiro nome<input value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} placeholder="Ex.: Bruno" required /></label>
        <label>Último nome<input value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} placeholder="Ex.: Paola" required /></label>
        <label className="family-code-field">Código do atleta<input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.replace(/\D/g, '').slice(0, 4) })} inputMode="numeric" maxLength={4} placeholder="0000" required /></label>
        <button className="family-primary-action" type="submit" disabled={busy}>{busy ? 'Consultando…' : <><Search size={18} /> Consultar cobranças</>}</button>
      </form>
      {error ? <div className="family-payment-error" role="alert">{error}</div> : null}
      {result ? <div className="family-payment-result"><div className="family-athlete-found"><div><span>ATLETA LOCALIZADO</span><h2>{result.athlete.name}</h2><p>{result.athlete.category} · Código {result.athlete.code}</p></div><CheckCircle2 size={25} /></div>{!profileSaved ? <form className="family-responsible-form" onSubmit={saveProfile}><div><span className="family-section-label">PRIMEIRO ACESSO · DADOS DO RESPONSÁVEL</span><p>Preencha uma vez. Nos próximos pagamentos, a InfinitePay receberá esses dados automaticamente.</p></div><label>Nome completo<input value={profile.responsibleName} onChange={(event) => setProfile({ ...profile, responsibleName: event.target.value })} required /></label><label>E-mail<input type="email" value={profile.responsibleEmail} onChange={(event) => setProfile({ ...profile, responsibleEmail: event.target.value })} required /></label><label>WhatsApp<input value={profile.responsiblePhone} onChange={(event) => setProfile({ ...profile, responsiblePhone: event.target.value })} inputMode="tel" required /></label><button className="family-primary-action" type="submit" disabled={busy}>{busy ? 'Salvando…' : 'Salvar e continuar'}</button></form> : <div className="family-profile-saved"><CheckCircle2 size={17} /> Dados do responsável salvos. Os próximos pagamentos serão mais rápidos.</div>}<div className="family-charges">{result.charges.length ? result.charges.map((charge) => <article className="family-charge" key={charge.id}><div><span>{date.format(new Date(`${charge.event_date}T12:00:00`))}</span><h3>{charge.title}</h3><p>{money.format(charge.amount_cents / 100)}</p></div>{charge.payment?.status === 'paid' ? <strong className="family-paid"><CheckCircle2 size={17} /> Pago</strong> : <button type="button" className="family-pay-action" onClick={() => startPayment(charge)} disabled={paying === charge.id || !profileSaved}>{paying === charge.id ? 'Abrindo…' : <>Pagar agora <ArrowRight size={17} /></>}</button>}</article>) : <div className="family-empty">Não há cobranças ativas para este atleta.</div>}</div></div> : null}
    </section>
    <footer className="family-payment-footer"><LockKeyhole size={16} /> O pagamento é processado pela InfinitePay. A AD Suzano não armazena dados do cartão.</footer>
  </main>;
}
