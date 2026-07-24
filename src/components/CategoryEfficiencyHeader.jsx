import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Calculator,
  ChevronDown,
  ChevronUp,
  Info,
  ShieldAlert,
  Target,
  Trophy,
  Zap,
} from 'lucide-react';
import { calculateCategoryEfficiency } from '../utils/efficiencyRanking';

export function CategoryEfficiencyHeader({ category }) {
  const [showDetails, setShowDetails] = useState(false);
  const data = calculateCategoryEfficiency(category);

  const isHighRisk = data.chanceDeCair >= 30;
  const isHighAccess = data.chanceDeSubir >= 40;

  return (
    <section className="panel efficiency-header-card" aria-label="Ranking de Eficiência FPFS">
      <div className="efficiency-top-banner">
        <div className="efficiency-badge-group">
          <span className="efficiency-league-badge">
            <Trophy size={15} />
            FPFS Regulamento Art. 135º
          </span>
          <span className="efficiency-rule-chip">
            Ranking de Eficiência Anual (Se um sobe, sobem todos; se cai, caem todos)
          </span>
        </div>
        <div className="efficiency-club-rank">
          <span>Posição Atual do AD Suzano</span>
          <strong>{data.clubPosition}º lugar</strong>
          <small>{data.clubPoints} pts · {data.clubPlayed} jg</small>
        </div>
      </div>

      <div className="efficiency-main-grid">
        {/* Card Chance de Subir */}
        <div className={`efficiency-stat-box access-box ${isHighAccess ? 'highlight-access' : ''}`}>
          <div className="stat-box-header">
            <span className="stat-box-tag green">
              <ArrowUpRight size={16} /> Acesso A1
            </span>
            <strong className="stat-percent green-text">{data.chanceDeSubir}%</strong>
          </div>
          <h3>Chance de Subir</h3>
          <div className="stat-box-details">
            <div>
              <span>Meta do Clube:</span>
              <strong>{data.targetAccessPoints} pts</strong>
            </div>
            <div>
              <span>Faltam no Clube:</span>
              <strong className="accent-text">+{data.pointsNeededToPromote} pts</strong>
            </div>
          </div>
        </div>

        {/* Card Chance de Cair */}
        <div className={`efficiency-stat-box risk-box ${isHighRisk ? 'highlight-risk' : ''}`}>
          <div className="stat-box-header">
            <span className="stat-box-tag red">
              <ShieldAlert size={16} /> Risco Rebaixamento
            </span>
            <strong className="stat-percent red-text">{data.chanceDeCair}%</strong>
          </div>
          <h3>Chance de Cair</h3>
          <div className="stat-box-details">
            <div>
              <span>Segurança Mínima:</span>
              <strong>{data.targetSafetyPoints} pts</strong>
            </div>
            <div>
              <span>Faltam p/ Não Cair:</span>
              <strong className="warning-text">+{data.pointsNeededToStay} pts</strong>
            </div>
          </div>
        </div>

        {/* Card Pontos a Disputar */}
        <div className="efficiency-stat-box games-box">
          <div className="stat-box-header">
            <span className="stat-box-tag blue">
              <Calculator size={16} /> A Disputar
            </span>
            <strong className="stat-percent blue-text">{data.categoryRemainingPoints} pts</strong>
          </div>
          <h3>Nesta Categoria ({data.categoryLabel})</h3>
          <div className="stat-box-details">
            <div>
              <span>Jogos da Categoria:</span>
              <strong>{data.categoryRemainingGames} restantes</strong>
            </div>
            <div>
              <span>Total no Clube:</span>
              <strong>{data.clubRemainingPoints} pts ({data.clubRemainingMatches} jg)</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Caixa de Diretriz para o Treinador */}
      <div className="coach-directive-banner">
        <div className="coach-directive-title">
          <Target size={18} className="target-icon" />
          <div>
            <strong>Meta do Treinador do {data.categoryLabel}</strong>
            <span>Pontuação necessária nesta categoria para blindar o clube</span>
          </div>
        </div>

        <div className="coach-targets-grid">
          <div className="coach-target-item stay-target">
            <span className="target-label">Para NÃO CAIR (Permanência):</span>
            <strong className="target-value">Fazer no mínimo +{data.categoryTargetToStay} pontos</strong>
            <p>{data.coachingAdviceToStay}</p>
          </div>

          <div className="coach-target-item promote-target">
            <span className="target-label">Para SUBIR (Acesso A1):</span>
            <strong className="target-value">Fazer no mínimo +{data.categoryTargetToPromote} pontos</strong>
            <p>{data.coachingAdviceToPromote}</p>
          </div>
        </div>
      </div>

      {/* Accordion de Explicação do Algoritmo e Regra */}
      <div className="efficiency-accordion">
        <button
          type="button"
          className="efficiency-accordion-trigger"
          onClick={() => setShowDetails(!showDetails)}
        >
          <Info size={16} />
          <span>Como funciona a conta e a regra do Ranking de Eficiência?</span>
          {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showDetails && (
          <div className="efficiency-accordion-content">
            <p>
              <strong>Artigo 135º do Regulamento da FPFS:</strong> O acesso e descenso das equipes de Iniciação e Base (Sub-7 a Sub-10 e Base) é apurado pelo <em>Ranking de Eficiência Anual</em>, que soma e tira a média de rendimento de todas as categorias do clube. Por isso, a pontuação conquistada por esta categoria ({data.categoryLabel}) entra diretamente no saldo geral do AD Suzano.
            </p>
            <ul>
              <li><strong>Pontos a Disputar:</strong> Cada jogo vale 3 pontos. Com {data.categoryRemainingGames} jogos restantes no {data.categoryLabel}, há {data.categoryRemainingPoints} pontos em jogo.</li>
              <li><strong>Cálculo para Não Cair:</strong> O AD Suzano está em {data.clubPosition}º lugar com {data.clubPoints} pontos. Para sair da faixa de perigo (19º e 20º lugares), o clube precisa somar mais +{data.pointsNeededToStay} pontos no geral.</li>
              <li><strong>Cálculo para Subir:</strong> As duas primeiras colocações da Série A2 sobem para a Série A1. A meta projetada de acesso é de {data.targetAccessPoints} pontos no total do clube.</li>
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
