import React, { useState } from 'react';
import { ArrowRight, CalendarDays, CheckCircle2, CreditCard, LockKeyhole, Search, ShieldCheck, Trophy } from 'lucide-react';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const date = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const statusLabel = { present: 'Presente', absent: 'Falta', justified: 'Justificada', unmarked: 'Pendente' };

export default function FamilyPaymentPage() {
  const [form, setForm] = useState({ firstName: '', lastName: '', code: '' });
  const [result, setResult] = useState(null);
  const [profile, setProfile] = useState({ responsibleName: '', responsibleEmail: '', responsiblePhone: '' });
  const [profileSaved, setProfileSaved] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [paying, setPaying] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [crop, setCrop] = useState(null);
  const [drag, setDrag] = useState(null);

  const lookup = async (event) => {
    event.preventDefault(); setBusy(true); setError(''); setResult(null);
    try {
      const response = await fetch('/api/payments/family-lookup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Não foi possível localizar o cadastro.');
      setResult(payload);
      if (payload.profile) { setProfile({ responsibleName: payload.profile.responsible_name, responsibleEmail: payload.profile.responsible_email, responsiblePhone: payload.profile.responsible_phone }); setProfileSaved(true); }
      else { setProfile({ responsibleName: '', responsibleEmail: '', responsiblePhone: '' }); setProfileSaved(false); }
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

  const openCropper = (event) => {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file || !file.type.startsWith('image/')) return;
    setCrop({ file, url: URL.createObjectURL(file), zoom: 1, x: 0, y: 0 });
  };

  const closeCropper = () => { if (crop?.url) URL.revokeObjectURL(crop.url); setCrop(null); setDrag(null); };

  const uploadPhoto = async (data, fileName = 'foto-atleta.jpg') => {
    setUploadingPhoto(true); setError('');
    try {
      const response = await fetch('/api/payments/family-photo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, athleteId: result.athlete.id, fileName, contentType: 'image/jpeg', data }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Não foi possível enviar a foto.');
      setResult({ ...result, athleteProfile: { ...(result.athleteProfile || {}), photo_url: payload.photoUrl } });
      closeCropper();
    } catch (photoError) { setError(photoError.message); } finally { setUploadingPhoto(false); }
  };

  const applyCrop = () => {
    if (!crop) return;
    const image = new Image();
    image.onload = () => {
      const outputSize = 900; const viewportSize = 340;
      const cover = Math.max(outputSize / image.naturalWidth, outputSize / image.naturalHeight) * crop.zoom;
      const canvas = document.createElement('canvas'); canvas.width = outputSize; canvas.height = outputSize;
      const context = canvas.getContext('2d'); context.fillStyle = '#ffffff'; context.fillRect(0, 0, outputSize, outputSize);
      const width = image.naturalWidth * cover; const height = image.naturalHeight * cover;
      const offsetX = (outputSize - width) / 2 + (crop.x * outputSize / viewportSize);
      const offsetY = (outputSize - height) / 2 + (crop.y * outputSize / viewportSize);
      context.drawImage(image, offsetX, offsetY, width, height);
      uploadPhoto(canvas.toDataURL('image/jpeg', 0.9), `${crop.file.name.replace(/\.[^.]+$/, '')}-recortada.jpg`);
    };
    image.src = crop.url;
  };

  return <main className="family-payment-page">
    <header className="family-payment-header"><a href="/" className="family-payment-brand"><img src="/ad-suzano-logo.png" alt="AD Suzano" /><span><strong>AD Suzano</strong><small>Portal do Atleta</small></span></a><span className="family-safe-badge"><ShieldCheck size={17} /> Ambiente seguro</span></header>
    <section className="family-payment-hero"><div><span className="family-eyebrow">PORTAL DO ATLETA · AD SUZANO</span><h1>Acompanhe sua jornada de perto</h1><p>Consulte frequência, agenda, feedback da comissão e pagamentos em um só lugar.</p></div><div className="family-payment-icon"><CreditCard size={32} /></div></section>
    <section className="family-payment-card">
      <form onSubmit={lookup} className="family-lookup-form"><label>Primeiro nome<input value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} placeholder="Ex.: Bruno" required /></label><label>Último nome<input value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} placeholder="Ex.: Paola" required /></label><label className="family-code-field">Código do atleta<input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.replace(/\D/g, '').slice(0, 4) })} inputMode="numeric" maxLength={4} placeholder="0000" required /></label><button className="family-primary-action" type="submit" disabled={busy}>{busy ? 'Consultando…' : <><Search size={18} /> Consultar cobranças</>}</button></form>
      {error ? <div className="family-payment-error" role="alert">{error}</div> : null}
      {result ? <div className="family-dashboard"><div className="family-athlete-found"><div><span>PORTAL DO ATLETA · PERFIL LOCALIZADO</span><h2>{result.athleteProfile?.full_name || result.athlete.name}</h2><p>{result.athlete.category} · Código {result.athlete.code}{result.athleteProfile?.coach ? ` · Treinador: ${result.athleteProfile.coach}` : ''}</p></div><CheckCircle2 size={25} /></div><div className="family-dashboard-grid"><section className="family-dashboard-card family-athlete-summary">{result.athleteProfile?.photo_url ? <img src={result.athleteProfile.photo_url} alt={`Foto de ${result.athlete.name}`} /> : <div className="family-photo-placeholder">Foto do atleta</div>}<div><span>PERFIL DO ATLETA</span><h3>{result.athlete.name}</h3><p>Idade: {result.athleteProfile?.age || '—'} · Altura: {result.athleteProfile?.height_cm ? `${result.athleteProfile.height_cm} cm` : '—'} · Peso: {result.athleteProfile?.weight_kg ? `${result.athleteProfile.weight_kg} kg` : '—'}</p><div className="family-mini-stats"><strong>{result.attendance.filter((item) => item.status === 'present').length}<small>presenças recentes</small></strong><strong>{result.feedback.length}<small>feedbacks</small></strong></div></div></section><section className="family-dashboard-card"><div className="family-card-title"><CalendarDays size={18} /><h3>Agenda e próximos jogos</h3></div>{result.upcomingGames.length ? result.upcomingGames.map((game) => <div className="family-agenda-row" key={`${game.date}-${game.home}-${game.away}`}><strong>{date.format(new Date(`${game.date}T12:00:00`))}</strong><span>{game.home} x {game.away}{game.time ? ` · ${game.time}` : ''}</span></div>) : <p className="family-muted">Nenhum próximo jogo cadastrado.</p>}</section></div><div className="family-dashboard-grid"><section className="family-dashboard-card"><div className="family-card-title"><CheckCircle2 size={18} /><h3>Frequência recente</h3></div>{result.attendance.slice(0, 6).map((item) => <div className="family-agenda-row" key={item.id}><strong>{date.format(new Date(`${item.session_date}T12:00:00`))}</strong><span>{item.title}<em className={`family-attendance-status is-${item.status}`}>{statusLabel[item.status]}</em></span></div>)}</section><section className="family-dashboard-card"><div className="family-card-title"><Trophy size={18} /><h3>Feedback da comissão</h3></div>{result.feedback.length ? result.feedback.slice(0, 2).map((item) => <article className="family-feedback" key={item.created_at}><strong>{item.text}</strong><small>Publicado em {date.format(new Date(item.created_at))}</small></article>) : <p className="family-muted">O primeiro feedback aparecerá aqui após a aprovação do treinador.</p>}</section></div><section className="family-dashboard-card family-finance-section"><div className="family-card-title"><CreditCard size={18} /><h3>Financeiro</h3></div>{!profileSaved ? <form className="family-responsible-form" onSubmit={saveProfile}><div><span className="family-section-label">PRIMEIRO ACESSO · DADOS DO RESPONSÁVEL</span><p>Preencha uma vez. Nos próximos pagamentos, a InfinitePay receberá esses dados automaticamente.</p></div><label>Nome completo<input value={profile.responsibleName} onChange={(event) => setProfile({ ...profile, responsibleName: event.target.value })} required /></label><label>E-mail<input type="email" value={profile.responsibleEmail} onChange={(event) => setProfile({ ...profile, responsibleEmail: event.target.value })} required /></label><label>WhatsApp<input value={profile.responsiblePhone} onChange={(event) => setProfile({ ...profile, responsiblePhone: event.target.value })} inputMode="tel" required /></label><button className="family-primary-action" type="submit" disabled={busy}>{busy ? 'Salvando…' : 'Salvar e continuar'}</button></form> : <div className="family-profile-saved"><CheckCircle2 size={17} /> Dados do responsável salvos.</div>}<div className="family-charges">{result.charges.length ? result.charges.map((charge) => <article className="family-charge" key={charge.id}><div><span>{date.format(new Date(`${charge.event_date}T12:00:00`))}</span><h3>{charge.title}</h3><p>{money.format(charge.amount_cents / 100)}</p></div>{charge.payment?.status === 'paid' ? <strong className="family-paid"><CheckCircle2 size={17} /> Pago</strong> : <button type="button" className="family-pay-action" onClick={() => startPayment(charge)} disabled={paying === charge.id || !profileSaved}>{paying === charge.id ? 'Abrindo…' : <>Pagar agora <ArrowRight size={17} /> </>}</button>}</article>) : <div className="family-empty">Não há cobranças ativas para este atleta.</div>}</div></section></div> : null}
    </section>
    <footer className="family-payment-footer"><LockKeyhole size={16} /> O pagamento é processado pela InfinitePay. A AD Suzano não armazena dados do cartão.</footer>
    {result ? <div className="family-photo-upload-strip"><span>FOTO DO ATLETA · ENVIE UMA FOTO COM UNIFORME</span><label>{uploadingPhoto ? 'Enviando foto…' : 'Escolher foto'}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={openCropper} disabled={uploadingPhoto} /></label></div> : null}
    {crop ? <div className="family-crop-modal" role="dialog" aria-modal="true" aria-labelledby="crop-title"><div className="family-crop-dialog"><div className="family-crop-heading"><div><span>AJUSTE DA FOTO</span><h2 id="crop-title">Enquadre o atleta</h2><p>Arraste a imagem e ajuste o zoom antes de salvar.</p></div><button type="button" className="family-crop-close" onClick={closeCropper} aria-label="Fechar editor">×</button></div><div className="family-crop-viewport" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setDrag({ startX: event.clientX, startY: event.clientY, originX: crop.x, originY: crop.y }); }} onPointerMove={(event) => { if (!drag) return; setCrop({ ...crop, x: drag.originX + event.clientX - drag.startX, y: drag.originY + event.clientY - drag.startY }); }} onPointerUp={() => setDrag(null)} onPointerCancel={() => setDrag(null)}><img src={crop.url} alt="Prévia da foto do atleta" style={{ transform: `translate(${crop.x}px, ${crop.y}px) scale(${crop.zoom})` }} /><span className="family-crop-guide" /></div><label className="family-crop-zoom">Zoom <input type="range" min="1" max="2.5" step="0.01" value={crop.zoom} onChange={(event) => setCrop({ ...crop, zoom: Number(event.target.value) })} /><strong>{Math.round(crop.zoom * 100)}%</strong></label><div className="family-crop-actions"><button type="button" className="family-crop-secondary" onClick={closeCropper}>Cancelar</button><button type="button" className="family-primary-action" onClick={applyCrop} disabled={uploadingPhoto}>{uploadingPhoto ? 'Enviando…' : 'Recortar e salvar'}</button></div></div></div> : null}
  </main>;
}
