import React, { useEffect, useMemo, useState } from 'react';
import { Activity, Bot, CheckCircle2, Database, Info, TrendingUp } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { buildAnalyticsSnapshot } from '../utils/analyticsRobots';
import { YouthDevelopmentAgent } from './YouthDevelopmentAgent';

const formatDate = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' });
const formatSync = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Sao_Paulo',
});
const RECORD_FIELDS = ['played', 'wins', 'draws', 'losses', 'goalsFor', 'goalsAgainst', 'points'];

function signed(value) {
  return Number(value) > 0 ? `+${value}` : String(value ?? 0);
}

function percent(value) {
  return `${String(value ?? 0).replace('.', ',')}%`;
}

function mergeCompetitionCategories(primary = [], secondary = []) {
  const labels = [...new Set([...primary, ...secondary].map((category) => category.category))];
  return labels.map((label) => {
    const sources = [primary.find((category) => category.category === label), secondary.find((category) => category.category === label)].filter(Boolean);
    const record = Object.fromEntries(RECORD_FIELDS.map((field) => [
      field,
      sources.reduce((sum, category) => sum + Number(category.record?.[field] ?? 0), 0),
    ]));
    record.goalDifference = record.goalsFor - record.goalsAgainst;
    const playedGames = sources
      .flatMap((category) => category.playedGames ?? [])
      .sort((a, b) => `${a.date} ${a.time ?? ''}`.localeCompare(`${b.date} ${b.time ?? ''}`));
    const checkedAt = sources.map((category) => category.checkedAt).filter(Boolean).sort().at(-1) ?? null;
    return {
      category: label,
      competition: 'Consolidado 2026',
      record,
      playedGames,
      recentGames: playedGames.slice(-5),
      upcomingGames: sources.flatMap((category) => category.upcomingGames ?? []),
      standings: [],
      source: 'FPFS + Liga da Juventude',
      checkedAt,
    };
  });
}

function CampaignChart({ analytics, reduceMotion }) {
  const rounds = analytics.rounds;
  const width = Math.max(820, rounds.length * 54);
  const height = 330;
  const top = 32;
  const baseline = 228;
  const chartHeight = baseline - top;
  const step = rounds.length > 1 ? (width - 110) / (rounds.length - 1) : 0;
  const xAt = (index) => 72 + index * step;
  const yAt = (points) => baseline - (points / 3) * chartHeight;
  const line = rounds.map((round, index) => `${index === 0 ? 'M' : 'L'} ${xAt(index)} ${yAt(round.points)}`).join(' ');
  const resultLabel = (points) => points === 3 ? 'V' : points === 1 ? 'E' : 'D';

  if (!rounds.length) {
    return <div className="graph-empty">A campanha completa ainda não está disponível para esta categoria.</div>;
  }

  return (
    <div className="campaign-chart-scroll">
      <svg
        className="campaign-chart"
        viewBox={`0 0 ${width} ${height}`}
        style={{ minWidth: width }}
        role="img"
        aria-label={`Pontos obtidos pelo ${analytics.category} em ${rounds.length} rodadas`}
      >
        {[0, 1, 2, 3].map((tick) => (
          <g key={tick}>
            <line x1="58" x2={width - 20} y1={yAt(tick)} y2={yAt(tick)} className="chart-grid-line" />
            <text x="50" y={yAt(tick) + 4} textAnchor="end" className="chart-axis-label">{tick}</text>
          </g>
        ))}
        <text
          x="15"
          y={(top + baseline) / 2}
          textAnchor="middle"
          className="chart-axis-title"
          transform={`rotate(-90 15 ${(top + baseline) / 2})`}
        >
          Pontos conquistados
        </text>
        {rounds.map((round, index) => {
          const barWidth = 24;
          const barHeight = Math.max(3, (round.points / 3) * chartHeight);
          return (
            <g key={`${round.date}-${round.round}`}>
              <motion.rect
                x={xAt(index) - barWidth / 2}
                width={barWidth}
                rx="3"
                className={`chart-bar chart-bar-${round.points}`}
                initial={reduceMotion ? false : { y: baseline, height: 0, opacity: 0 }}
                whileInView={{ y: baseline - barHeight, height: barHeight, opacity: 1 }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{ duration: 0.45, delay: Math.min(index * 0.025, 0.35) }}
              />
              <text x={xAt(index)} y="238" textAnchor="middle" className="chart-round-label">R{round.round}</text>
              <text x={xAt(index)} y="271" textAnchor="middle" className="chart-date-label">{formatDate.format(new Date(`${round.date}T12:00:00`))}</text>
              <text
                x={xAt(index)}
                y={Math.max(20, yAt(round.points) - 13)}
                textAnchor="middle"
                className={`chart-result-label result-${resultLabel(round.points).toLowerCase()}`}
              >
                {resultLabel(round.points)}
              </text>
            </g>
          );
        })}
        <motion.path
          d={line}
          className="chart-points-line"
          fill="none"
          initial={reduceMotion ? false : { pathLength: 0, opacity: 0 }}
          whileInView={{ pathLength: 1, opacity: 1 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 1.1, ease: 'easeOut' }}
        />
        {rounds.map((round, index) => (
          <motion.circle
            key={`point-${round.date}-${round.round}`}
            cx={xAt(index)}
            cy={yAt(round.points)}
            r="5"
            className="chart-point"
            initial={reduceMotion ? false : { scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: Math.min(0.35 + index * 0.025, 0.7) }}
          >
            <title>{`Rodada ${round.round}: ${round.points} ponto(s), ${round.scoreLabel ?? `${round.goalsFor} x ${round.goalsAgainst}`} contra ${round.opponent}`}</title>
          </motion.circle>
        ))}
        <text x={width / 2} y="314" textAnchor="middle" className="chart-axis-title chart-x-axis-title">
          Rodadas da campanha · ordem cronológica
        </text>
      </svg>
    </div>
  );
}

export function GraphicalAnalysis({ categories, youthCategories = [], youthCompetition, activeCategoryLabel }) {
  const competitionSets = useMemo(() => ([
    {
      id: 'combined',
      label: 'Consolidado 2026',
      shortLabel: 'Consolidado',
      source: 'FPFS + Liga da Juventude',
      categories: mergeCompetitionCategories(categories, youthCategories),
    },
    {
      id: 'paulista',
      label: 'Campeonato Paulista A2',
      shortLabel: 'Paulista A2',
      source: 'FPFS Súmula Online',
      categories,
    },
    {
      id: 'youth',
      label: 'Copa da Juventude Gold 2026',
      shortLabel: 'Copa da Juventude',
      source: 'Liga da Juventude Oficial',
      categories: youthCategories,
      status: youthCompetition?.status,
      url: youthCompetition?.url,
    },
  ]), [categories, youthCategories, youthCompetition]);
  const [competitionId, setCompetitionId] = useState('combined');
  const competition = competitionSets.find((item) => item.id === competitionId) ?? competitionSets[0];
  const snapshot = useMemo(() => buildAnalyticsSnapshot(competition.categories), [competition.categories]);
  const [selected, setSelected] = useState(activeCategoryLabel ?? snapshot.categories[0]?.category);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (activeCategoryLabel) setSelected(activeCategoryLabel);
  }, [activeCategoryLabel]);

  useEffect(() => {
    if (!snapshot.categories.some((category) => category.category === selected)) {
      setSelected(snapshot.categories[0]?.category);
    }
  }, [selected, snapshot.categories]);

  const selectedAnalytics = snapshot.categories.find((category) => category.category === selected)
    ?? snapshot.categories[0];

  if (!selectedAnalytics) return null;

  const syncLabel = snapshot.latestCheck ? formatSync.format(new Date(snapshot.latestCheck)) : 'não informada';
  const goalDiff = snapshot.totals.goalDifference;

  return (
    <motion.section
      className="graphical-analysis"
      initial={reduceMotion ? false : { opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <header className="graphical-analysis-head">
        <div>
          <span className="analysis-kicker"><Activity size={15} /> Análise gráfica</span>
          <h2>Campanha calculada jogo a jogo</h2>
          <p>Paulista e Copa da Juventude separados, com visão consolidada e conferência automática das fontes oficiais.</p>
        </div>
        <div className={`robot-status ${snapshot.audit.status}`}>
          <span className="robot-pulse" />
          <div>
            <strong>Robôs ativos</strong>
            <small>{snapshot.audit.verified}/{snapshot.audit.total} campanhas conferidas</small>
          </div>
        </div>
      </header>

      <div className="competition-switcher" role="tablist" aria-label="Selecionar competição da análise">
        {competitionSets.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={item.id === competitionId}
            className={item.id === competitionId ? 'active' : ''}
            onClick={() => setCompetitionId(item.id)}
          >
            <span>{item.shortLabel}</span>
            <small>{item.id === 'youth' && item.status ? item.status : item.source}</small>
          </button>
        ))}
        {competition.url ? (
          <a href={competition.url} target="_blank" rel="noreferrer">Abrir fonte oficial</a>
        ) : null}
      </div>

      <div className="analytics-robot-grid">
        <motion.article whileHover={reduceMotion ? undefined : { y: -3 }} className="robot-card">
          <Bot size={21} />
          <div><span>Robô de campanha</span><strong>{snapshot.totals.points} pontos</strong><small>{snapshot.totals.played} jogos · {competition.shortLabel}</small></div>
        </motion.article>
        <motion.article whileHover={reduceMotion ? undefined : { y: -3 }} className="robot-card">
          <TrendingUp size={21} />
          <div><span>Aproveitamento geral</span><strong>{percent(snapshot.totals.efficiency)}</strong><small>Iniciação: {percent(snapshot.segments.initiation.efficiency)} · Base: {percent(snapshot.segments.base.efficiency)}</small></div>
        </motion.article>
        <motion.article whileHover={reduceMotion ? undefined : { y: -3 }} className="robot-card">
          <Database size={21} />
          <div><span>Saldo agregado</span><strong>{signed(goalDiff)}</strong><small>{snapshot.totals.goalsFor} pró · {snapshot.totals.goalsAgainst} contra</small></div>
        </motion.article>
        <motion.article whileHover={reduceMotion ? undefined : { y: -3 }} className="robot-card verified">
          <CheckCircle2 size={21} />
          <div><span>Última sincronização</span><strong>{syncLabel}</strong><small>{competition.source}</small></div>
        </motion.article>
      </div>

      <div className="campaign-table-wrap">
        <table className="campaign-table">
          <caption>Desempenho oficial por categoria · {competition.label}</caption>
          <thead>
            <tr>
              <th>Categoria</th><th>PTS</th><th>J</th><th>V</th><th>E</th><th>D</th><th>GP</th><th>GC</th><th>SG</th><th>Pos. 1ª fase</th><th>Aprov.</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.categories.map((category, index) => (
              <motion.tr
                key={category.category}
                className={category.category === selected ? 'selected' : ''}
                initial={reduceMotion ? false : { opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: Math.min(index * 0.04, 0.24) }}
                onClick={() => setSelected(category.category)}
              >
                <th scope="row"><button type="button" onClick={() => setSelected(category.category)}>{category.category}</button></th>
                <td><strong>{category.record.points}</strong></td>
                <td>{category.record.played}</td><td>{category.record.wins}</td><td>{category.record.draws}</td><td>{category.record.losses}</td>
                <td>{category.record.goalsFor}</td><td>{category.record.goalsAgainst}</td>
                <td className={category.record.goalDifference < 0 ? 'negative' : 'positive'}>{signed(category.record.goalDifference)}</td>
                <td>{category.position ? `${category.position}º` : '—'}</td>
                <td><strong>{percent(category.efficiency)}</strong></td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="chart-panel">
        <div className="chart-panel-head">
          <div>
            <span>Evolução jogo a jogo · {competition.shortLabel}</span>
            <h3>{selectedAnalytics.category} · pontos obtidos por partida</h3>
            <p className="chart-explainer">Cada coluna é uma partida: 3 pontos = vitória, 1 = empate e 0 = derrota.</p>
          </div>
          <div className="chart-summary">
            <strong>{percent(selectedAnalytics.efficiency)}</strong>
            <small>aproveitamento na campanha</small>
          </div>
        </div>
        <div className="category-chart-tabs" role="tablist" aria-label="Selecionar categoria do gráfico">
          {snapshot.categories.map((category) => (
            <button
              key={category.category}
              type="button"
              role="tab"
              aria-selected={category.category === selected}
              className={category.category === selected ? 'active' : ''}
              onClick={() => setSelected(category.category)}
            >
              {category.category}
            </button>
          ))}
        </div>
        <CampaignChart analytics={selectedAnalytics} reduceMotion={reduceMotion} />
        <div className="chart-legend">
          <span><i className="legend-bar" /> Pontos conquistados na rodada</span>
          <span><i className="legend-line" /> Evolução cronológica da campanha</span>
          <span className="result-key"><b>V</b> vitória <b>E</b> empate <b>D</b> derrota</span>
          <span><Info size={14} /> Passe o cursor nos pontos para ver o placar</span>
        </div>
      </div>

      <footer className="analysis-method-note">
        <CheckCircle2 size={16} />
        <span><strong>Fórmula conferida:</strong> pontos = 3×vitórias + empates; aproveitamento = pontos ÷ (jogos × 3). O consolidado soma jogos, pontos e gols das duas competições. Na Copa, a posição exibida é a da primeira fase; W.O. conta como jogo, vitória e pontos, sem inventar gols.</span>
      </footer>
      <YouthDevelopmentAgent analytics={selectedAnalytics} reduceMotion={reduceMotion} />
    </motion.section>
  );
}
