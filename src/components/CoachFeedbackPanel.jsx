import React, { useMemo, useState } from 'react';
import { Check, ClipboardCheck, LoaderCircle, Sparkles } from 'lucide-react';
import { athleteRoster } from '../data/athleteRoster';
import { generateCoachFeedback, saveCoachFeedback } from '../services/staffOperations';

const QUESTIONS = [
  ['attention', 'Atenção e participação', 'Como o atleta participou dos treinos e jogos?'],
  ['technical', 'Fundamentos técnicos', 'Como foi o domínio, passe, condução e finalização?'],
  ['decisions', 'Decisões no jogo', 'Como escolheu soluções com e sem a bola?'],
  ['cooperation', 'Convivência e cooperação', 'Como se relacionou com colegas e comissão?'],
  ['focus', 'Próximo foco', 'Qual ponto deve ser trabalhado no próximo período?'],
];

const EMPTY_RUBRIC = Object.fromEntries(QUESTIONS.map(([key]) => [key, '']));

const athletes = athleteRoster.categories.flatMap((category) => category.players.map((player) => ({
  id: player.url.split('/').pop(), name: player.name, category: category.label,
})));

export default function CoachFeedbackPanel() {
  const [athleteId, setAthleteId] = useState(athletes[0]?.id || '');
  const [rubric, setRubric] = useState(EMPTY_RUBRIC);
  const [text, setText] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const athlete = useMemo(() => athletes.find((item) => item.id === athleteId) || athletes[0], [athleteId]);

  const generate = async (event) => {
    event.preventDefault(); setBusy(true); setStatus('');
    try { setText(await generateCoachFeedback({ athleteName: athlete.name, category: athlete.category, rubric })); setStatus('Confira o texto e aprove antes de publicar.'); }
    catch (error) { setStatus(error.message); } finally { setBusy(false); }
  };

  const approve = async () => {
    setBusy(true); setStatus('');
    try { await saveCoachFeedback({ athleteId: athlete.id, text, rubric }); setStatus('Feedback aprovado e salvo para o atleta.'); setText(''); setRubric(EMPTY_RUBRIC); }
    catch (error) { setStatus(error.message); } finally { setBusy(false); }
  };

  return <div className="coach-feedback-panel"><div className="coach-feedback-intro"><div><span>ASSISTENTE DA COMISSÃO</span><h3>Feedback rápido do atleta</h3><p>Responda cinco perguntas. O assistente cria um rascunho objetivo; a publicação só acontece depois da sua aprovação.</p></div><Sparkles size={30} /></div><form onSubmit={generate}><label className="coach-feedback-athlete">Atleta<select value={athleteId} onChange={(event) => { setAthleteId(event.target.value); setText(''); }}>{athletes.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.category}</option>)}</select></label><div className="coach-feedback-rubric">{QUESTIONS.map(([key, title, help], index) => <label key={key}><span>{index + 1}. {title}</span><small>{help}</small><textarea value={rubric[key]} onChange={(event) => setRubric({ ...rubric, [key]: event.target.value })} placeholder="Escreva uma observação curta e concreta…" required /></label>)}</div><button className="staff-primary-action" type="submit" disabled={busy}>{busy ? <><LoaderCircle size={17} className="is-spinning" /> Gerando…</> : <><Sparkles size={17} /> Gerar rascunho com IA</>}</button></form>{text ? <section className="coach-feedback-preview"><div><span>RASCUNHO PARA APROVAÇÃO</span><strong>{athlete.name}</strong></div><textarea value={text} onChange={(event) => setText(event.target.value)} /><button className="staff-primary-action" type="button" onClick={approve} disabled={busy}><Check size={17} /> Aprovar e publicar</button></section> : null}{status ? <div className="coach-feedback-status" role="status"><ClipboardCheck size={16} />{status}</div> : null}</div>;
}
