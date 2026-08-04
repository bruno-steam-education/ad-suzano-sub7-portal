import React, { useEffect, useMemo, useState } from 'react';
import { Activity, Bot, CheckCircle2, Database, Info, TrendingUp } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { buildAnalyticsSnapshot } from '../utils/analyticsRobots';

const formatDate = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' });
const formatSync = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Sao_Paulo',
});

function signed(value) {
  return Number(value) > 0 ? `+${value}` : String(value ?? 0);
}

function percent(value) {
  return `${String(value ?? 0).replace('.', ',')}%`;
}

function CampaignChart({ analytics, reduceMotion }) {
  const rounds = analytics.rounds;
  const width = Math.max(820, rounds.length * 54);
  const height = 292;
  const top = 24;
  const baseline = 214;
  const chartHeight = baseline - top;
  const step = rounds.length > 1 ? (width - 84) / (rounds.length - 1) : 0;
  const xAt = (index) => 42 + index * step;
  const yAt = (points) => baseline - (points / 3) * chartHeight;
  const line = rounds.map((round, index) => `${index === 0 ? 'M' : 'L'} ${xAt(index)} ${yAt(round.points)}`).join(' ');

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
            <line x1="24" x2={width - 20} y1={yAt(tick)} y2={yAt(tick)} className="chart-grid-line" />
            <text x="12" y={yAt(tick) + 4} className="chart-axis-label">{tick}</text>
          </g>
        ))}
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
              <text x={xAt(index)} y="255" textAnchor="middle" className="chart-date-label">{formatDate.format(new Date(`${round.date}T12:00:00`))}</text>
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
            <title>{`Rodada ${round.round}: ${round.points} ponto(s), ${round.goalsFor} x ${round.goalsAgainst} contra ${round.opponent}`}</title>
          </motion.circle>
        ))}
      </svg>
    </div>
  );
}

export function GraphicalAnalysis({ categories, activeCategoryLabel }) {
  const snapshot = useMemo(() => buildAnalyticsSnapshot(categories), [categories]);
  const [selected, setSelected] = useState(activeCategoryLabel ?? snapshot.categories[0]?.category);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (activeCategoryLabel) setSelected(activeCategoryLabel);
  }, [activeCategoryLabel]);

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
          <p>Tabela exata, evolução por rodada e conferência automática da base FPFS.</p>
        </div>
        <div className={`robot-status ${snapshot.audit.status}`}>
          <span className="robot-pulse" />
          <div>
            <strong>Robôs ativos</strong>
            <small>{snapshot.audit.verified}/{snapshot.audit.total} campanhas conferidas</small>
          </div>
        </div>
      </header>

      <div className="analytics-robot-grid">
        <motion.article whileHover={reduceMotion ? undefined : { y: -3 }} className="robot-card">
          <Bot size={21} />
          <div><span>Robô de campanha</span><strong>{snapshot.totals.points} pontos</strong><small>{snapshot.totals.played} jogos processados</small></div>
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
          <div><span>Última sincronização</span><strong>{syncLabel}</strong><small>fonte FPFS</small></div>
        </motion.article>
      </div>

      <div className="campaign-table-wrap">
        <table className="campaign-table">
          <caption>Desempenho oficial por categoria</caption>
          <thead>
            <tr>
              <th>Categoria</th><th>PTS</th><th>J</th><th>V</th><th>E</th><th>D</th><th>GP</th><th>GC</th><th>SG</th><th>Pos.</th><th>Aprov.</th>
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
            <span>Evolução rodada a rodada</span>
            <h3>{selectedAnalytics.category} · pontos obtidos por partida</h3>
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
          <span><i className="legend-bar" /> Pontos na rodada (0, 1 ou 3)</span>
          <span><i className="legend-line" /> Sequência de resultados</span>
          <span><Info size={14} /> Passe o cursor nos pontos para ver o placar</span>
        </div>
      </div>

      <footer className="analysis-method-note">
        <CheckCircle2 size={16} />
        <span><strong>Fórmula conferida:</strong> pontos = 3×vitórias + empates; aproveitamento = pontos ÷ (jogos × 3). O total geral usa os jogos como peso.</span>
      </footer>
    </motion.section>
  );
}
