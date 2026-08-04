import React, { useState } from 'react';
import {
  AlertTriangle,
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
import { EfficiencyFormulaModal } from './EfficiencyFormulaModal';

export function CategoryEfficiencyHeader({ category }) {
  const [showDetails, setShowDetails] = useState(false);
  const [showFormula, setShowFormula] = useState(false);
  const data = calculateCategoryEfficiency(category);

  if (!data.hasData) {
    return null;
  }

  const isHighRisk = data.chanceDeQueda >= 50;

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
            Ranking de Eficiência Anual do CLUBE (Iniciação Sub-7 ao Sub-18)
          </span>
        </div>
        <div className="efficiency-club-rank">
          <span>Índice Real do AD Suzano (soma das 8 categorias)</span>
          <strong>{data.clubEfficiencyPercent}% de aproveitamento</strong>
          <small>{data.clubPoints} pts · {data.clubPlayed} jg disputados</small>
        </div>
      </div>

      <p className="efficiency-club-notice">
        <Info size={13} /> Os números abaixo são do <strong>AD Suzano inteiro</strong>, iguais em
        todas as categorias — o Art. 135º diz que quem sobe ou cai é o clube como um todo, nunca
        uma categoria isolada.
      </p>

      {/* Grid Principal de Status — sempre do CLUBE, nunca de uma categoria isolada */}
      <div className="efficiency-main-grid">
        {/* Card Chance de Acesso do Clube */}
        <div className={`efficiency-stat-box access-box ${data.isClubTitleMathLocked ? 'highlight-impossible' : ''}`}>
          <div className="stat-box-header">
            <span className="stat-box-tag gold">
              <Trophy size={16} /> Acesso do Clube
            </span>
            <strong className="stat-percent gold-text">{data.chanceDeCampeao}%</strong>
          </div>
          <h3>Chance de Acesso do AD Suzano</h3>
          <div className="stat-box-details">
            <div>
              <span>Referencial agregado:</span>
              <strong>{data.clubTitleBenchmarkPoints} pts</strong>
            </div>
            <div>
              <span>Falta no clube:</span>
              <strong className="gold-text">+{data.clubShortfallToTitle} pts</strong>
            </div>
          </div>
        </div>

        {/* Card Risco de Queda do Clube */}
        <div className={`efficiency-stat-box risk-box ${isHighRisk ? 'highlight-risk' : ''}`}>
          <div className="stat-box-header">
            <span className="stat-box-tag red">
              <ShieldAlert size={16} /> Risco de Queda do Clube
            </span>
            <strong className="stat-percent red-text">{data.chanceDeQueda}%</strong>
          </div>
          <h3>Permanência do AD Suzano</h3>
          <div className="stat-box-details">
            <div>
              <span>Referencial de segurança:</span>
              <strong>{data.clubSafetyBenchmarkPoints} pts</strong>
            </div>
            {data.clubShortfallToSafety > 0 ? (
              <div>
                <span>Falta no clube:</span>
                <strong className="warning-text">+{data.clubShortfallToSafety} pts</strong>
              </div>
            ) : (
              <div>
                <span>Folga do clube:</span>
                <strong className="warning-text">+{data.clubSafetyMarginPoints} pts</strong>
              </div>
            )}
          </div>
          <p className="stat-box-footnote">
            {data.clubShortfallToSafety > 0
              ? 'O risco cai conforme o clube fecha essa distância.'
              : `O risco nunca chega a 0% — é um piso mínimo de imprevisibilidade (jogo é jogo), mesmo com ${data.clubSafetyMarginPoints} pts de folga.`}
          </p>
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

      {/* Cota de Contribuição desta Categoria (isso sim varia por categoria) */}
      <div className="points-target-banner">
        <div className="points-target-heading">
          <Target size={18} className="target-icon" />
          <strong>Cota de Contribuição do {data.categoryLabel} nos {data.categoryRemainingGames} Jogos Restantes</strong>
          <button type="button" className="formula-open-btn" onClick={() => setShowFormula(true)}>
            <Calculator size={14} /> Ver Fórmula de Cálculo
          </button>
        </div>
        <div className="points-target-grid">
          <div className="points-target-item tier-minimo">
            <span className="tier-label">Mínimo</span>
            <strong className="tier-value">+{data.pointsNeededMinimo} pts</strong>
            <p>Cota real desta categoria para o clube alcançar o referencial de segurança ({data.clubSafetyBenchmarkPoints} pts agregados).</p>
          </div>
          <div className="points-target-item tier-ideal">
            <span className="tier-label">Ideal</span>
            <strong className="tier-value">+{data.pointsNeededIdeal} pts</strong>
            <p>Cota desta categoria para o clube alcançar o meio de tabela agregado ({data.clubMidBenchmarkPoints} pts).</p>
          </div>
          <div className="points-target-item tier-perfeito">
            <span className="tier-label">Perfeito</span>
            <strong className="tier-value">
              {data.isClubTitleMathLocked ? 'Máximo possível' : `+${data.pointsNeededPerfeito} pts`}
            </strong>
            <p>
              {data.isClubTitleMathLocked
                ? `+${data.pointsNeededPerfeito} pts é o máximo que o ${data.categoryLabel} pode somar aqui — mesmo TODAS as categorias fazendo o máximo, o clube não alcança mais o acesso (${data.clubTitleBenchmarkPoints} pts agregados são matematicamente inatingíveis). O foco real é a permanência.`
                : `Cota desta categoria para o clube brigar pelo acesso (${data.clubTitleBenchmarkPoints} pts agregados).`}
            </p>
          </div>
        </div>
      </div>

      {showFormula && <EfficiencyFormulaModal data={data} onClose={() => setShowFormula(false)} />}

      {/* Banner Explícito de Risco de Queda (do clube) */}
      <div className="relegation-risk-banner">
        <ShieldAlert size={20} className="risk-icon" />
        <div>
          <strong>Risco de Queda do AD Suzano (Art. 135º)</strong>
          <p>{data.relegationRiskSentence}</p>
        </div>
      </div>

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
            <span className="target-label">COTA MÍNIMA PARA AJUDAR O CLUBE:</span>
            <strong className="target-value">
              +{data.pointsNeededMinimo} pts ({data.winsNeededMinimo} vitória{data.winsNeededMinimo === 1 ? '' : 's'} ou combinações)
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
          aria-expanded={showDetails}
          aria-controls="efficiency-rules-details"
          onClick={() => setShowDetails(!showDetails)}
        >
          <Info size={16} />
          <span>Como funciona a conta geral e a regra do Ranking de Eficiência?</span>
          {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showDetails && (
          <div className="efficiency-accordion-content" id="efficiency-rules-details">
            <p>
              <strong>Artigo 135º do Regulamento Geral de Competições FPFS 2026:</strong> Nas categorias de
              Iniciação (Sub-7 ao Sub-10) e Base (Sub-12 ao Sub-18), o acesso e descenso entre as séries A1,
              A2 e A3 é apurado pelo <em>Ranking de Eficiência Anual do clube</em> — a soma da pontuação de
              todas as categorias. As duas últimas colocações da série caem e as duas primeiras sobem na
              temporada seguinte, e isso vale para o clube inteiro, não para uma categoria isolada.
            </p>
            <ul>
              <li>
                <strong>Por que a % de risco/acesso é igual em todas as categorias:</strong> porque o Art. 135º
                trata o clube como uma unidade só. Mostrar percentuais diferentes por categoria (uma com 3%,
                outra com 40%) contradiz a regra — por isso unificamos em um único número, o mesmo em
                qualquer aba do site.
              </li>
              <li>
                <strong>Por que a classificação oficial exata não aparece:</strong> a FPFS não publica a
                classificação combinada entre clubes. Por isso usamos referenciais REAIS construídos a partir
                da própria tabela de cada categoria (linha de segurança, meio de tabela e líder de cada
                grupo, somados nas 8 categorias) — é a aproximação mais honesta possível sem esse dado
                oficial. Toque em "Ver Fórmula de Cálculo" para a conta completa.
              </li>
              <li>
                <strong>Cota de contribuição por categoria:</strong> o que falta no clube é dividido entre as
                8 categorias, proporcional aos jogos que cada uma ainda tem pela frente — por isso o
                {' '}{data.categoryLabel} tem uma cota própria de pontos, mesmo com a % de risco sendo do clube.
              </li>
              <li>
                <strong>Índice do clube:</strong> soma de pontos ({data.clubPoints}) dividida pelo total de
                pontos possíveis nos jogos já disputados ({data.clubPlayed} jogos × 3 pts) = {data.clubEfficiencyPercent}%
                de aproveitamento real.
              </li>
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
