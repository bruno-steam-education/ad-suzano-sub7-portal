import React, { useState } from 'react';
import {
  AlertTriangle,
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

  if (!data.hasData) {
    return null;
  }

  const isTitleImpossible = data.isEliminatedFromTitle;
  const isHighRisk = data.hasSafetyData && data.chanceDeQueda >= 50;

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
          <span>Índice Real do AD Suzano (soma das 8 categorias)</span>
          <strong>{data.clubEfficiencyPercent}% de aproveitamento</strong>
          <small>{data.clubPoints} pts · {data.clubPlayed} jg disputados</small>
        </div>
      </div>

      {/* Grid Principal de Status */}
      <div className="efficiency-main-grid">
        {/* Card Chance de Título do Grupo */}
        <div className={`efficiency-stat-box access-box ${isTitleImpossible ? 'highlight-impossible' : ''}`}>
          <div className="stat-box-header">
            <span className="stat-box-tag gold">
              <Trophy size={16} /> Título do Grupo
            </span>
            <strong className="stat-percent gold-text">{data.chanceDeCampeao}%</strong>
          </div>
          <h3>Chance de Ser Campeão do Grupo</h3>
          <div className="stat-box-details">
            <div>
              <span>Líder do grupo:</span>
              <strong>{data.leaderTeam ?? '—'} ({data.leaderPoints} pts)</strong>
            </div>
            <div>
              <span>Distância para o líder:</span>
              <strong className="gold-text">
                {data.isLeader ? 'Está na liderança' : `+${data.pointsBehindLeader} pts`}
              </strong>
            </div>
          </div>
        </div>

        {/* Card Risco de Queda no Grupo */}
        <div className={`efficiency-stat-box risk-box ${isHighRisk ? 'highlight-risk' : ''}`}>
          <div className="stat-box-header">
            <span className="stat-box-tag red">
              <ShieldAlert size={16} /> Risco de Queda
            </span>
            <strong className="stat-percent red-text">
              {data.hasSafetyData ? `${data.chanceDeQueda}%` : '—'}
            </strong>
          </div>
          <h3>Posição {data.categoryPosition}º de {data.categoryTotalTeams} no Grupo</h3>
          <div className="stat-box-details">
            <div>
              <span>Pontos na tabela:</span>
              <strong>{data.categoryPoints} pts</strong>
            </div>
            <div>
              <span>Saldo de gols:</span>
              <strong className="warning-text">{data.categoryGoalDiff >= 0 ? '+' : ''}{data.categoryGoalDiff}</strong>
            </div>
          </div>
        </div>

        {/* Card Pontos a Disputar */}
        <div className="efficiency-stat-box games-box">
          <div className="stat-box-header">
            <span className="stat-box-tag blue">
              <Target size={16} /> A Disputar
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
              <span>Total no Clube (8 categorias):</span>
              <strong>{data.clubRemainingPoints} pts ({data.clubRemainingGames} jg)</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Metas Explícitas de Pontos: Mínimo / Ideal / Perfeito */}
      {data.hasSafetyData && (
        <div className="points-target-banner">
          <div className="points-target-heading">
            <Target size={18} className="target-icon" />
            <strong>Metas de Pontos do {data.categoryLabel} nos {data.categoryRemainingGames} Jogos Restantes</strong>
          </div>
          <div className="points-target-grid">
            <div className="points-target-item tier-minimo">
              <span className="tier-label">Mínimo</span>
              <strong className="tier-value">+{data.pointsNeededMinimo} pts</strong>
              <p>Para escapar da zona de risco, igualando {data.safetyTeamName} ({data.safetyLinePoints} pts).</p>
            </div>
            <div className="points-target-item tier-ideal">
              <span className="tier-label">Ideal</span>
              <strong className="tier-value">+{data.pointsNeededIdeal} pts</strong>
              <p>Para alcançar o meio de tabela, igualando {data.midTeamName} ({data.midTablePoints} pts).</p>
            </div>
            <div className="points-target-item tier-perfeito">
              <span className="tier-label">Perfeito</span>
              <strong className="tier-value">+{data.pointsNeededPerfeito} pts</strong>
              <p>Para alcançar o líder {data.leaderTeam} ({data.leaderPoints} pts) e brigar pelo título.</p>
            </div>
          </div>
        </div>
      )}

      {/* Banner Explícito de Risco de Queda */}
      {data.relegationRiskSentence && (
        <div className="relegation-risk-banner">
          <ShieldAlert size={20} className="risk-icon" />
          <div>
            <strong>Risco de Queda no Grupo</strong>
            <p>{data.relegationRiskSentence}</p>
          </div>
        </div>
      )}

      {/* Banner Alerta Realista */}
      <div className="realism-alert-box">
        <AlertTriangle size={20} className="alert-icon" />
        <div>
          <strong>Análise Baseada em Dados Reais (Art. 135º)</strong>
          <p>{data.realismAlert}</p>
        </div>
      </div>

      {/* Caixa de Diretriz e Explicação Transparente */}
      <div className="coach-directive-banner">
        <div className="coach-directive-title">
          <Target size={18} className="target-icon" />
          <div>
            <strong>Situação Real do {data.categoryLabel}</strong>
            <span>Calculada a partir da tabela oficial FPFS nos {data.categoryRemainingGames} jogos restantes</span>
          </div>
        </div>

        <div className="coach-targets-grid">
          <div className="coach-target-item stay-target">
            <span className="target-label">CONTRIBUIÇÃO PARA O ÍNDICE DO CLUBE:</span>
            <strong className="target-value">{data.categoryShareOfClubPoints}% dos pontos do clube</strong>
            <p>
              O {data.categoryLabel} já somou {data.categoryPoints} dos {data.clubPoints} pontos que o AD Suzano
              acumulou nas 8 categorias de Iniciação/Base até agora.
            </p>
          </div>

          <div className="coach-target-item promote-target">
            <span className="target-label">PARA BRIGAR PELO TÍTULO DO GRUPO:</span>
            <strong className="target-value">
              {isTitleImpossible
                ? 'Matematicamente descartado'
                : data.isLeader
                  ? 'Manter o ritmo atual'
                  : `Vencer ao menos ${data.winsNeededForTitle} jogo${data.winsNeededForTitle === 1 ? '' : 's'} a mais que o rival`}
            </strong>
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
              <strong>Artigo 135º do Regulamento Geral de Competições FPFS 2026:</strong> Nas categorias de
              Iniciação (Sub-7 ao Sub-10) e Base (Sub-12 ao Sub-18), o acesso e descenso entre as séries A1,
              A2 e A3 é apurado pelo <em>Ranking de Eficiência Anual do clube</em> — a soma da pontuação de
              todas as categorias, não a tabela de uma categoria isolada. As duas últimas colocações da
              série caem e as duas primeiras sobem na temporada seguinte.
            </p>
            <ul>
              <li>
                <strong>Por que usamos a tabela da própria categoria para as metas de pontos:</strong> a
                classificação combinada entre clubes (a que decide oficialmente o Art. 135º) não é publicada
                pela FPFS. Por isso calculamos mínimo/ideal/perfeito comparando o {data.categoryLabel} com
                adversários reais e verificáveis dentro do seu próprio grupo — a mesma lógica de "2 últimas
                caem, 2 primeiras sobem" aplicada à tabela que temos disponível.
              </li>
              <li>
                <strong>Índice do clube:</strong> soma de pontos ({data.clubPoints}) dividida pelo total de
                pontos possíveis nos jogos já disputados ({data.clubPlayed} jogos × 3 pts) = {data.clubEfficiencyPercent}%
                de aproveitamento real.
              </li>
              <li>
                <strong>Chance de título e risco de queda:</strong> calculados comparando quantos pontos
                faltam para o líder (título) ou para a linha de segurança (risco) com o total de pontos
                ainda em disputa nos jogos restantes. São estimativas transparentes, não probabilidades
                estatísticas oficiais da FPFS.
              </li>
              <li>
                <strong>Pontos a Disputar:</strong> cada jogo vale 3 pontos. No {data.categoryLabel}, restam{' '}
                {data.categoryRemainingGames} jogos ({data.categoryRemainingPoints} pts). No clube inteiro
                (8 categorias), restam {data.clubRemainingGames} jogos ({data.clubRemainingPoints} pts).
              </li>
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
