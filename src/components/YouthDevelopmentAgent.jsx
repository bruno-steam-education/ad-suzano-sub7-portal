import React, { useMemo } from 'react';
import {
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  ExternalLink,
  HeartHandshake,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { motion } from 'motion/react';
import { buildYouthDevelopmentAgent } from '../utils/analyticsRobots';

const RESEARCH_SOURCES = [
  {
    label: 'FIFA · Manual de Treinamento de Futsal',
    detail: 'Formação de 6–12 anos, técnica, jogo e comunicação adequada à idade.',
    href: 'https://www.fifatrainingcentre.com/media/native/community-area-document/resources/futsal/FIFA_GFD_Futsal_Coaching_Manual_EN.pdf',
  },
  {
    label: 'FIFA · Play–Practice–Play (4–8 anos)',
    detail: 'Sessão centrada na criança, iniciando e terminando com jogo.',
    href: 'https://www.fifatrainingcentre.com/en/practice/grassroots/grassroots-and-youth-football-essentials/grassroots-coaching-essentials/an-introduction-to-play-practice-play.php',
  },
  {
    label: 'FIFA · Abordagem do futsal por restrições',
    detail: 'Cenários de jogo, poucas restrições e decisões dos atletas.',
    href: 'https://www.fifatrainingcentre.com/en/practice/futsal/training-foundations/graeme-dell-on-a-constraints-led-approach.php',
  },
  {
    label: 'COI · Desenvolvimento do atleta jovem',
    detail: 'Ambiente positivo, desenvolvimento integral, descanso e individualização.',
    href: 'https://bjsm.bmj.com/content/49/13/843',
  },
  {
    label: 'FIFA Guardians · Proteção de crianças',
    detail: 'Bem-estar e ambiente seguro no futebol de formação.',
    href: 'https://inside.fifa.com/human-rights/fifa-guardians/guidance',
  },
];

function FormBadge({ label, value, tone }) {
  return (
    <div className={`agent-form-badge ${tone}`}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

export function YouthDevelopmentAgent({ analytics, reduceMotion }) {
  const report = useMemo(() => buildYouthDevelopmentAgent(analytics), [analytics]);

  return (
    <motion.section
      className="youth-agent"
      aria-labelledby="youth-agent-title"
      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.45 }}
    >
      <header className="youth-agent-header">
        <div className="youth-agent-title-group">
          <span className="youth-agent-icon"><BrainCircuit size={24} /></span>
          <div>
            <span className="youth-agent-kicker"><Sparkles size={14} /> Agente IA de desenvolvimento</span>
            <h3 id="youth-agent-title">Leitura formativa do {report.category}</h3>
            <p>Diagnóstico específico do recorte recente, com placares, adversários, variação de gols e próximo compromisso oficial.</p>
          </div>
        </div>
        <div className="agent-confidence">
          <span>Confiança da leitura</span>
          <strong>{report.confidence}</strong>
          <small>{report.sampleSize} jogos observados</small>
        </div>
      </header>

      <div className="agent-form-strip" aria-label="Forma nos últimos cinco jogos">
        <FormBadge label="Vitórias" value={report.form.wins} tone="win" />
        <FormBadge label="Empates" value={report.form.draws} tone="draw" />
        <FormBadge label="Derrotas" value={report.form.losses} tone="loss" />
        <FormBadge label="Pontos" value={`${report.recentPoints}/${report.sampleSize * 3}`} tone="points" />
        <FormBadge label="Gols" value={`${report.recentGoalsFor}:${report.recentGoalsAgainst}`} tone="goals" />
      </div>

      <div className="agent-evidence-box">
        <div className="agent-evidence-title"><ClipboardCheck size={18} /><strong>O que os dados realmente mostram</strong></div>
        <p>{report.formSummary}</p>
        <ul>
          {report.evidenceLines.map((line) => <li key={line}><ChevronRight size={14} />{line}</li>)}
        </ul>
      </div>

      <div className="agent-attention-grid">
        {report.attentionCards.map((card, index) => (
          <motion.article
            key={card.id}
            className={`agent-attention-card ${card.tone}`}
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: Math.min(index * 0.08, 0.16) }}
          >
            <span className="agent-card-label">
              {card.id === 'pattern' ? <HeartHandshake size={15} /> : card.id === 'training' ? <ClipboardCheck size={15} /> : <CircleAlert size={15} />}
              {card.label}
            </span>
            <h4>{card.title}</h4>
            <p>{card.finding}</p>
            <strong className="agent-actions-title">Próximas ações</strong>
            <ul>
              {card.actions.map((action) => <li key={action}><CheckCircle2 size={14} />{action}</li>)}
            </ul>
          </motion.article>
        ))}
      </div>

      <div className="agent-safety-note">
        <ShieldCheck size={19} />
        <div><strong>Limite de segurança</strong><p>{report.caveat}</p></div>
      </div>

      <details className="agent-research">
        <summary>Referências usadas pelo agente</summary>
        <div className="agent-research-grid">
          {RESEARCH_SOURCES.map((source) => (
            <a key={source.href} href={source.href} target="_blank" rel="noreferrer">
              <span><strong>{source.label}</strong><small>{source.detail}</small></span>
              <ExternalLink size={15} />
            </a>
          ))}
        </div>
      </details>
    </motion.section>
  );
}
