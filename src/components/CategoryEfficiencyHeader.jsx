import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Calculator,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Info,
  ShieldAlert,
  Target,
  Trophy,
} from 'lucide-react';
import { calculateCategoryEfficiency } from '../utils/efficiencyRanking';

export function CategoryEfficiencyHeader({ category }) {
  const [showDetails, setShowDetails] = useState(false);
  const data = calculateCategoryEfficiency(category);

  const isHighRisk = data.chanceDeCair >= 25;
  const isAccessImpossible = data.chanceDeSubir <= 5;

  return (
    <section className="panel efficiency-header-card" aria-label="Ranking de Eficiência FPFS">
      {/* Banner Superior da Liga */}
      <div className="efficiency-top-banner">
        <div className="efficiency-badge-group">
          <span className="efficiency-league-badge">
            <Trophy size={15} />
            FPFS Regulamento Art. 135º
          </span>
          <span className="efficiency-rule-chip">
            Ranking de Eficiência Anual ({data.isInitiation ? 'Iniciação Sub-7 ao Sub-10' : 'Base Sub-12 ao Sub-18'})
          </span>
        </div>
        <div className="efficiency-club-rank">
          <span>Posição Atual do AD Suzano</span>
          <strong>{data.clubPosition}º lugar</strong>
          <small>{data.clubPoints} pts · {data.clubPlayed} jg</small>
        </div>
      </div>

      {/* Grid Principal de Status */}
      <div className="efficiency-main-grid">
        {/* Card Chance de Subir */}
        <div className={`efficiency-stat-box access-box ${isAccessImpossible ? 'highlight-impossible' : ''}`}>
          <div className="stat-box-header">
            <span className="stat-box-tag gray">
              <ArrowUpRight size={16} /> Acesso A1
            </span>
            <strong className="stat-percent gray-text">{data.chanceDeSubir}%</strong>
          </div>
          <h3>Chance de Subir</h3>
          <div className="stat-box-details">
            <div>
              <span>Meta do Clube:</span>
              <strong>{data.targetAccessPoints} pts</strong>
            </div>
            <div>
              <span>Faltam no Clube:</span>
              <strong className="gray-text">+{data.pointsNeededToPromote} pts</strong>
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
              <span>Faltam no Clube p/ Não Cair:</span>
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
              <span>Jogos Restantes no {data.categoryLabel}:</span>
              <strong>{data.categoryRemainingGames} jogos</strong>
            </div>
            <div>
              <span>Total no Clube:</span>
              <strong>{data.clubRemainingPoints} pts ({data.clubRemainingMatches} jg)</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Banner Alerta Realista */}
      <div className="realism-alert-box">
        <AlertTriangle size={20} className="alert-icon" />
        <div>
          <strong>Análise Estatística 100% Realista (Art. 135º)</strong>
          <p>{data.realismAlert}</p>
        </div>
      </div>

      {/* Caixa de Diretriz e Explicação Transparente da Meta do Treinador */}
      <div className="coach-directive-banner">
        <div className="coach-directive-title">
          <Target size={18} className="target-icon" />
          <div>
            <strong>Meta Específica do Treinador do {data.categoryLabel}</strong>
            <span>Cota calculada para esta categoria nos {data.categoryRemainingGames} jogos restantes</span>
          </div>
        </div>

        <div className="coach-targets-grid">
          <div className="coach-target-item stay-target">
            <span className="target-label">COTA DO {data.categoryLabel} PARA NÃO CAIR:</span>
            <strong className="target-value">Fazer no mínimo +{data.categoryTargetToStay} pontos</strong>
            <p>{data.coachingAdviceToStay}</p>
          </div>

          <div className="coach-target-item promote-target">
            <span className="target-label">COTA PARA SUBIR (ACESSO A1):</span>
            <strong className="target-value">Fazer +{data.categoryTargetToPromote} pontos (Descartado)</strong>
            <p>{data.coachingAdviceToPromote}</p>
          </div>
        </div>

        {/* Caixa de Explicação do Porquê desta Meta */}
        <div className="category-meta-explanation">
          <HelpCircle size={16} className="help-icon" />
          <div>
            <strong>Por que a meta do {data.categoryLabel} é de +{data.categoryTargetToStay} pontos?</strong>
            <p>{data.categoryReasoning}</p>
          </div>
        </div>
      </div>

      {/* Accordion de Regras Gerais do Regulamento */}
      <div className="efficiency-accordion">
        <button
          type="button"
          className="efficiency-accordion-trigger"
          onClick={() => setShowDetails(!showDetails)}
        >
          <Info size={16} />
          <span>Como funciona a conta geral e a regra do Ranking de Eficiência?</span>
          {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showDetails && (
          <div className="efficiency-accordion-content">
            <p>
              <strong>Artigo 135º do Regulamento da FPFS:</strong> Nas categorias de Iniciação (Sub-7 ao Sub-10) e Base (Sub-12 ao Sub-18), o acesso e descenso é apurado pelo <em>Ranking de Eficiência Anual do Clube</em>. Se uma categoria cair, caem todas; se uma subir, sobem todas.
            </p>
            <ul>
              <li><strong>Metas Específicas por Categoria:</strong> A necessidade do clube (+18 pts) não é dividida de forma cega. Categorias mais fortes e com maior histórico (ex: Sub-7 ou Sub-12) recebem uma cota maior para puxar o saldo do AD Suzano, protegendo o clube como um todo.</li>
              <li><strong>Pontos a Disputar:</strong> Cada jogo vale 3 pontos. No {data.categoryLabel}, restam {data.categoryRemainingGames} jogos ({data.categoryRemainingPoints} pts). No clube inteiro, restam {data.clubRemainingMatches} jogos ({data.clubRemainingPoints} pts).</li>
              <li><strong>Cálculo para Não Cair:</strong> O AD Suzano está em {data.clubPosition}º lugar com {data.clubPoints} pontos. Para garantir a permanência no 17º ou 18º lugar (fora do Z2), o clube precisa somar no mínimo +{data.pointsNeededToStay} pontos no acumulado das categorias.</li>
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
