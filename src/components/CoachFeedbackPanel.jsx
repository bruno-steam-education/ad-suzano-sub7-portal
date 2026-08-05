import React, { useMemo, useState } from 'react';
import { Check, ClipboardCheck, FilePenLine, LoaderCircle } from 'lucide-react';
import { athleteRoster } from '../data/athleteRoster';
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
const athletes = athleteRoster.categories.flatMap((category) => category.players.map((player) => ({ id: player.url.split('/').pop(), name: player.name, category: category.label })));

export default function CoachFeedbackPanel() {
  const [athleteId, setAthleteId] = useState(athletes[0]?.id || '');
  const [rubric, setRubric] = useState(EMPTY_RUBRIC);
  const [notes, setNotes] = useState(EMPTY_NOTES);
  const [text, setText] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const athlete = useMemo(() => athletes.find((item) => item.id === athleteId) || athletes[0], [athleteId]);
  const complete = QUESTIONS.every(({ key }) => rubric[key] || notes[key].trim());

  const generate = async (event) => {
    event.preventDefault();
    setBusy(true);
    setStatus('');
    try {
      setText(await generateCoachFeedback({ athleteName: athlete.name, category: athlete.category, rubric: { selections: rubric, personalized: notes } }));
      setStatus('Rascunho pronto. Leia, ajuste se quiser e aprove antes de publicar.');
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  };

  const approve = async () => {
    setBusy(true);
    setStatus('');
    try {
      await saveCoachFeedback({ athleteId: athlete.id, text, rubric: { selections: rubric, personalized: notes } });
      setStatus('Feedback aprovado e salvo para o atleta.');
      setText('');
      setRubric({ ...EMPTY_RUBRIC });
      setNotes({ ...EMPTY_NOTES });
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  };

  return <div className="coach-feedback-panel">
    <div className="coach-feedback-intro"><div><span>ASSISTENTE DA COMISSÃO</span><h3>Feedback na voz do treinador</h3><p>Marque uma alternativa ou escreva sua observação em cada bloco. A IA organiza o rascunho, mas a publicação só acontece depois da sua aprovação.</p></div><ClipboardCheck size={30} /></div>
    <form onSubmit={generate}>
      <label className="coach-feedback-athlete">Atleta<select value={athleteId} onChange={(event) => { setAthleteId(event.target.value); setText(''); }}>{athletes.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.category}</option>)}</select></label>
      <div className="coach-feedback-rubric">{QUESTIONS.map((question, index) => <fieldset key={question.key}><legend>{index + 1}. {question.title}</legend><small>{question.help}</small><div className="coach-feedback-options">{question.options.map((option) => <button type="button" key={option} className={rubric[question.key] === option ? 'is-selected' : ''} onClick={() => setRubric({ ...rubric, [question.key]: option })}>{option}</button>)}</div><textarea value={notes[question.key]} onChange={(event) => setNotes({ ...notes, [question.key]: event.target.value })} placeholder="Ou escreva uma observação personalizada…" /></fieldset>)}</div>
      <button className="staff-primary-action coach-feedback-generate" type="submit" disabled={busy || !complete}>{busy ? <><LoaderCircle size={17} className="is-spinning" /> Preparando…</> : <><FilePenLine size={17} /> Redigir feedback</>}</button>
    </form>
    {text ? <section className="coach-feedback-preview"><div><span>RASCUNHO PARA APROVAÇÃO</span><strong>{athlete.name}</strong></div><textarea value={text} onChange={(event) => setText(event.target.value)} /><button className="staff-primary-action" type="button" onClick={approve} disabled={busy}><Check size={17} /> Aprovar e publicar</button></section> : null}
    {status ? <div className="coach-feedback-status" role="status"><ClipboardCheck size={16} />{status}</div> : null}
  </div>;
}
