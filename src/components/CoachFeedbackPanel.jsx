import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Check, ClipboardCheck, FilePenLine, LoaderCircle, UserRound } from 'lucide-react';
import { athleteRoster } from '../data/athleteRoster';
import { fpfsCategories } from '../data/fpfsCategories';
import { generateCoachFeedback, saveCoachFeedback } from '../services/staffOperations';

const QUESTIONS = [
  { key: 'training', title: 'Treino e aprendizagem', help: 'Como participou, tentou e aprendeu nas atividades?', options: ['Participa com energia e tenta novas soluções.', 'Mantém boa participação, mas pode assumir mais iniciativa.', 'Precisa sustentar a atenção durante as explicações e tarefas.', 'Responde bem aos desafios quando recebe uma orientação clara.', 'Está em fase de adaptação e precisa de acompanhamento mais próximo.'] },
  { key: 'game', title: 'Jogo e decisões', help: 'Como resolveu situações com e sem a bola?', options: ['Reconhece espaços e escolhe soluções úteis para a equipe.', 'Tenta jogar para frente e aprende com os erros da partida.', 'Precisa decidir mais rápido quando recebe sob pressão.', 'Está evoluindo no posicionamento e no apoio aos companheiros.', 'Precisa ganhar confiança para participar mais das ações do jogo.'] },
  { key: 'emotional', title: 'Emocional e resposta', help: 'Como reagiu a erros, acertos e momentos de pressão?', options: ['Recupera-se bem dos erros e volta a participar da jogada.', 'Demonstra confiança e aceita desafios compatíveis com sua fase.', 'Precisa de uma pausa curta para reorganizar-se após um erro.', 'Mostra frustração em alguns momentos; vamos trabalhar a retomada.', 'Responde melhor quando recebe encorajamento e uma orientação objetiva.'] },
  { key: 'teamwork', title: 'Convivência e cooperação', help: 'Como se comunicou e contribuiu para o grupo?', options: ['Ajuda os companheiros e fortalece o ambiente da equipe.', 'Comunica-se bem e está aprendendo a liderar pelo exemplo.', 'Escuta as orientações e coopera nas tarefas coletivas.', 'Está ampliando sua participação e sua comunicação com o grupo.', 'Precisa reforçar respeito, fair play e colaboração nas atividades.'] },
  { key: 'next_focus', title: 'Próximo foco', help: 'Qual direção prática deve orientar o próximo período?', options: ['Domínio, passe e condução em situações de jogo.', 'Percepção do espaço e velocidade para decidir.', 'Movimento sem bola e apoio ao companheiro.', 'Transição, recuperação e proteção do gol.', 'Confiança, comunicação e participação nas decisões.'] },
];

const EMPTY_RUBRIC = Object.fromEntries(QUESTIONS.map(({ key }) => [key, '']));
const EMPTY_NOTES = Object.fromEntries(QUESTIONS.map(({ key }) => [key, '']));
const VARIATIONS = ['comece com uma imagem de caminho e evolução', 'comece reconhecendo uma atitude concreta do atleta', 'use uma abertura curta, vibrante e ligada ao jogo', 'comece destacando uma pequena conquista observada', 'use uma metáfora simples de treino e crescimento', 'comece com uma convocação positiva para o próximo desafio'];
const allAthletes = athleteRoster.categories.flatMap((category) => category.players.map((player) => ({ id: player.url.split('/').pop(), name: player.name, category: category.label, detail: player.detail || {} })));

function gameTitle(game) {
  return `${game.home || 'AD Suzano'} x ${game.away || 'Adversário'}`;
}

export default function CoachFeedbackPanel() {
  const [category, setCategory] = useState(athleteRoster.categories[0]?.label || 'Sub-7');
  const [scope, setScope] = useState('individual');
  const categoryAthletes = useMemo(() => allAthletes.filter((athlete) => athlete.category === category), [category]);
  const [athleteId, setAthleteId] = useState(categoryAthletes[0]?.id || '');
  const [rubric, setRubric] = useState({ ...EMPTY_RUBRIC });
  const [notes, setNotes] = useState({ ...EMPTY_NOTES });
  const [matchId, setMatchId] = useState('');
  const [match, setMatch] = useState({ title: '', date: '', competition: 'Paulista A2' });
  const [drafts, setDrafts] = useState([]);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const athlete = useMemo(() => categoryAthletes.find((item) => item.id === athleteId) || categoryAthletes[0], [athleteId, categoryAthletes]);
  const matches = useMemo(() => {
    const source = fpfsCategories.find((item) => item.category === category);
    return [...(source?.playedGames || []), ...(source?.upcomingGames || [])].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }, [category]);
  const complete = QUESTIONS.every(({ key }) => rubric[key] || notes[key].trim());

  useEffect(() => {
    setAthleteId(categoryAthletes[0]?.id || '');
    setMatchId('');
    setMatch({ title: '', date: '', competition: 'Paulista A2' });
    setDrafts([]);
  }, [category, categoryAthletes]);

  const selectMatch = (value) => {
    setMatchId(value);
    const selected = matches[Number(value)];
    if (selected) setMatch({ title: gameTitle(selected), date: selected.date || '', competition: 'Campeonato Paulista A2' });
  };

  const generate = async (event) => {
    event.preventDefault();
    if (!complete || !match.title || !match.date) return;
    const targets = scope === 'category' ? categoryAthletes : [athlete];
    setBusy(true); setDrafts([]); setStatus(`Preparando ${targets.length} feedback${targets.length > 1 ? 's' : ''}...`);
    try {
      const generated = [];
      for (const [index, target] of targets.entries()) {
        const text = await generateCoachFeedback({
          athleteName: target.name,
          category: target.category,
          rubric: { selections: rubric, personalized: notes },
          match,
          athleteProfile: { age: target.detail.age || '', season: target.detail.season || '', image: target.detail.image || '', stats: target.detail.stats || [] },
          variation: VARIATIONS[index % VARIATIONS.length],
        });
        generated.push({ athlete: target, text });
        setDrafts([...generated]);
        setStatus(`Feedback ${index + 1} de ${targets.length} pronto. Revise antes de publicar.`);
      }
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  };

  const updateDraft = (athleteKey, text) => setDrafts((current) => current.map((draft) => draft.athlete.id === athleteKey ? { ...draft, text } : draft));

  const approve = async () => {
    if (!drafts.length) return;
    setBusy(true); setStatus('Salvando feedbacks aprovados...');
    try {
      await Promise.all(drafts.map((draft) => saveCoachFeedback({
        athleteId: draft.athlete.id,
        text: draft.text,
        rubric: { selections: rubric, personalized: notes },
        match,
        athleteProfile: { age: draft.athlete.detail.age || '', season: draft.athlete.detail.season || '' },
      })));
      setStatus(`${drafts.length} feedback${drafts.length > 1 ? 's' : ''} aprovado${drafts.length > 1 ? 's' : ''} e publicado${drafts.length > 1 ? 's' : ''}.`);
      setDrafts([]);
      setRubric({ ...EMPTY_RUBRIC });
      setNotes({ ...EMPTY_NOTES });
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  };

  return <div className="coach-feedback-panel">
    <div className="coach-feedback-intro"><div><span>ASSISTENTE DA COMISSÃO</span><h3>Feedback na voz do treinador</h3><p>Escolha o jogo uma vez, responda a matriz e gere textos individuais para um atleta ou para toda a categoria. Cada texto recebe contexto e variação próprios.</p></div><ClipboardCheck size={30} /></div>
    <form onSubmit={generate}>
      <div className="coach-feedback-context-grid">
        <label>Categoria<select value={category} onChange={(event) => setCategory(event.target.value)}>{athleteRoster.categories.map((item) => <option key={item.label}>{item.label}</option>)}</select></label>
        <label>Jogo avaliado<select value={matchId} onChange={(event) => selectMatch(event.target.value)} required><option value="">Selecione a partida...</option>{matches.map((game, index) => <option key={`${game.date}-${index}`} value={index}>{gameTitle(game)} · {game.date}</option>)}</select></label>
        <label>Data da partida<input type="date" value={match.date} onChange={(event) => setMatch({ ...match, date: event.target.value })} required /></label>
        <label>Competição ou contexto<input value={match.competition} onChange={(event) => setMatch({ ...match, competition: event.target.value })} placeholder="Paulista A2, amistoso..." /></label>
      </div>
      <div className="coach-feedback-scope"><strong>Aplicar feedback para:</strong><label><input type="radio" checked={scope === 'individual'} onChange={() => setScope('individual')} /> Um atleta</label><label><input type="radio" checked={scope === 'category'} onChange={() => setScope('category')} /> Toda a categoria ({categoryAthletes.length})</label></div>
      {scope === 'individual' ? <label className="coach-feedback-athlete">Atleta<select value={athleteId} onChange={(event) => setAthleteId(event.target.value)}>{categoryAthletes.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.category}</option>)}</select></label> : <div className="coach-feedback-category-target"><UserRound size={18} /><span>Serão gerados textos individuais para todos os atletas do {category}.</span></div>}
      {athlete ? <div className="coach-feedback-profile"><UserRound size={18} /><span><strong>Perfil usado pela IA:</strong> {athlete.name}, {athlete.category}{athlete.detail.age ? ` · ${athlete.detail.age}` : ''}. Dados disponíveis são usados sem inventar informações.</span></div> : null}
      <div className="coach-feedback-rubric">{QUESTIONS.map((question, index) => <fieldset key={question.key}><legend>{index + 1}. {question.title}</legend><small>{question.help}</small><div className="coach-feedback-options">{question.options.map((option) => <button type="button" key={option} className={rubric[question.key] === option ? 'is-selected' : ''} onClick={() => setRubric({ ...rubric, [question.key]: option })}>{option}</button>)}</div><textarea value={notes[question.key]} onChange={(event) => setNotes({ ...notes, [question.key]: event.target.value })} placeholder="Ou escreva uma observação personalizada…" /></fieldset>)}</div>
      <button className="staff-primary-action coach-feedback-generate" type="submit" disabled={busy || !complete || !match.title || !match.date}>{busy ? <><LoaderCircle size={17} className="is-spinning" /> Preparando…</> : <><FilePenLine size={17} /> {scope === 'category' ? 'Gerar feedbacks da categoria' : 'Redigir feedback'}</>}</button>
    </form>
    {drafts.length ? <section className="coach-feedback-preview"><div className="coach-feedback-preview-heading"><span>RASCUNHOS INDIVIDUALIZADOS · {drafts.length}</span><strong>{match.title} · {match.date}</strong></div>{drafts.map((draft) => <article className="coach-feedback-draft" key={draft.athlete.id}><div><UserRound size={16} /><strong>{draft.athlete.name}</strong><small>{draft.athlete.category}</small></div><textarea value={draft.text} onChange={(event) => updateDraft(draft.athlete.id, event.target.value)} /></article>)}<button className="staff-primary-action" type="button" onClick={approve} disabled={busy}><Check size={17} /> Aprovar e publicar todos</button></section> : null}
    {status ? <div className="coach-feedback-status" role="status"><CalendarDays size={16} />{status}</div> : null}
  </div>;
}
