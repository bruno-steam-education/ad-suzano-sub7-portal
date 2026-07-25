import { fpfsCategories } from '../data/fpfsCategories';

/**
 * FPFS Ranking de Eficiência Anual (Art. 135º do Regulamento Geral de Competições 2026)
 *
 * Texto oficial do Art. 135º: "Nas categorias de Iniciação e Base o acesso e descenso das
 * equipes será realizado através do Ranking de Eficiência Anual. As equipes classificadas nas
 * duas últimas posições da série A1 serão rebaixadas para a série A2 na temporada seguinte,
 * com efeito, as equipes classificadas nas duas primeiras colocações da Série A2 terão acesso
 * à série A1 na temporada seguinte. Da mesma forma, as duas últimas colocadas da série A2 serão
 * rebaixadas para a série A3 e as duas primeiras equipes classificadas da série A3 terão acesso
 * a série A2 na temporada seguinte."
 *
 * PONTO CENTRAL (relido e confirmado no regulamento): quem sobe ou cai é o CLUBE inteiro — a
 * soma da pontuação de TODAS as categorias de Iniciação (Sub-7 ao Sub-10) e Base (Sub-12 ao
 * Sub-18) — nunca uma categoria isolada. O regulamento não define uma fórmula para "quantos
 * pontos por categoria", nem publica a classificação combinada entre clubes (não temos os dados
 * agregados dos adversários). Por isso este módulo:
 *
 * 1) Calcula UMA ÚNICA leitura de risco/título para o CLUBE (mesma em todas as categorias —
 *    não faz sentido a categoria A ter "3% de chance de cair" e a categoria B ter "40%": o que
 *    cai ou sobe é o clube inteiro).
 * 2) Calcula, por categoria, apenas a COTA DE CONTRIBUIÇÃO (quantos pontos essa categoria
 *    precisa somar para ajudar o clube) — isso sim varia por categoria, pois cada uma tem jogos
 *    e situação diferentes.
 */

const BASE_LABELS = ['Sub-12', 'Sub-14', 'Sub-16', 'Sub-18'];
const INITIATION_LABELS = ['Sub-7', 'Sub-8', 'Sub-9', 'Sub-10'];
const ALL_LABELS = [...INITIATION_LABELS, ...BASE_LABELS];

const CLUB_TEAM_NAME = 'A.D. SUZANO';

// Jogos totais previstos na fase classificatória (turno único) de cada categoria, conforme
// calendário oficial FPFS 2026 já usado no site (scripts/update-fpfs.mjs / temporada mar-dez/2026).
const SEASON_LENGTH_BY_CATEGORY = {
  'Sub-7': 19,
  'Sub-8': 19,
  'Sub-9': 19,
  'Sub-10': 19,
  'Sub-12': 19,
  'Sub-14': 19,
  'Sub-16': 19,
  'Sub-18': 19,
};

function getRealCategoryData(label) {
  const fc = fpfsCategories.find((item) => item.category === label);
  if (!fc) return null;

  const record = fc.record || {};
  const standings = fc.standings || [];
  const ownStanding = standings.find((s) => s.team === CLUB_TEAM_NAME) || null;
  const leader = standings[0] || null;

  const totalGames = SEASON_LENGTH_BY_CATEGORY[label] || record.played || 0;
  const played = record.played ?? 0;
  const points = record.points ?? 0;
  const goalDifference = record.goalDifference ?? 0;

  const remainingGames = Math.max(0, totalGames - played);
  const remainingPoints = remainingGames * 3;
  const maxPossiblePoints = points + remainingPoints;

  const leaderPoints = leader?.points ?? points;
  const pointsBehindLeader = Math.max(0, leaderPoints - points);
  const isLeader = ownStanding?.position === 1;

  return {
    label,
    standings,
    totalTeams: standings.length,
    position: ownStanding?.position ?? null,
    played,
    points,
    goalDifference,
    totalGames,
    remainingGames,
    remainingPoints,
    maxPossiblePoints,
    leaderPoints,
    leaderTeam: leader?.team ?? null,
    pointsBehindLeader,
    isLeader,
  };
}

/**
 * Referências reais da tabela de cada categoria (linha de segurança, meio de tabela), usadas
 * apenas como blocos de construção do referencial AGREGADO do clube — não geram uma % própria
 * por categoria (isso violaria o Art. 135º, que trata o clube como uma unidade só).
 */
function computeCategoryBenchmarks(cat) {
  const { standings, totalTeams } = cat;
  if (!standings || totalTeams < 4) return null;

  const safetyIndex = totalTeams - 3; // posição logo acima da zona de risco (últimas 2 colocações)
  const midIndex = Math.max(0, Math.floor(totalTeams / 2) - 1);

  const safetyTeam = standings[safetyIndex];
  const midTeam = standings[midIndex];
  if (!safetyTeam || !midTeam) return null;

  return {
    safetyLinePoints: safetyTeam.points,
    safetyTeamName: safetyTeam.team,
    midTablePoints: midTeam.points,
    midTeamName: midTeam.team,
  };
}

/**
 * Situação ÚNICA do clube (mesma para todas as categorias) — risco de queda, chance de acesso e
 * pontos mínimo/ideal/perfeito, tudo agregando as 8 categorias de Iniciação/Base.
 *
 * Referenciais agregados = soma, entre as 8 categorias, dos pontos REAIS de três equipes de
 * referência em cada grupo (linha de segurança, meio de tabela, líder). É a forma mais honesta de
 * simular "quanto o clube precisaria somar" sem ter acesso à classificação combinada oficial entre
 * clubes (que a FPFS não publica).
 */
function computeClubStatus(allCategoriesData, allBenchmarks) {
  const clubPoints = allCategoriesData.reduce((sum, c) => sum + c.points, 0);
  const clubPlayed = allCategoriesData.reduce((sum, c) => sum + c.played, 0);
  const clubRemainingGames = allCategoriesData.reduce((sum, c) => sum + c.remainingGames, 0);
  const clubRemainingPoints = clubRemainingGames * 3;
  const clubMaxPossiblePoints = clubPoints + clubRemainingPoints;
  const clubPossiblePointsSoFar = clubPlayed * 3;
  const clubEfficiencyPercent = clubPossiblePointsSoFar > 0
    ? Math.round((clubPoints / clubPossiblePointsSoFar) * 1000) / 10
    : 0;

  const clubSafetyBenchmarkPoints = allBenchmarks.reduce((sum, b) => sum + (b?.safetyLinePoints ?? 0), 0);
  const clubMidBenchmarkPoints = allBenchmarks.reduce((sum, b) => sum + (b?.midTablePoints ?? 0), 0);
  const clubTitleBenchmarkPoints = allCategoriesData.reduce((sum, c) => sum + c.leaderPoints, 0);

  const clubShortfallToSafety = Math.max(0, clubSafetyBenchmarkPoints - clubPoints);
  const clubShortfallToIdeal = Math.max(0, clubMidBenchmarkPoints - clubPoints);
  const clubShortfallToTitle = Math.max(0, clubTitleBenchmarkPoints - clubPoints);

  const isClubRelegationMathLocked = clubMaxPossiblePoints < clubSafetyBenchmarkPoints;
  const isClubTitleMathLocked = clubMaxPossiblePoints < clubTitleBenchmarkPoints;

  let clubChanceDeQueda;
  if (isClubRelegationMathLocked) {
    clubChanceDeQueda = 100;
  } else if (clubShortfallToSafety === 0) {
    const marginRatio = (clubPoints - clubSafetyBenchmarkPoints) / Math.max(1, clubSafetyBenchmarkPoints);
    clubChanceDeQueda = Math.max(2, 20 - marginRatio * 60);
  } else {
    const ratio = clubShortfallToSafety / Math.max(1, clubRemainingPoints);
    clubChanceDeQueda = 25 + ratio * 70;
  }
  clubChanceDeQueda = Math.max(0, Math.min(100, Math.round(clubChanceDeQueda)));

  let clubChanceDeTitulo;
  if (isClubTitleMathLocked) {
    clubChanceDeTitulo = 0;
  } else {
    const ratio = clubShortfallToTitle / Math.max(1, clubRemainingPoints);
    clubChanceDeTitulo = Math.max(1, Math.round((1 - ratio) * 45));
  }
  clubChanceDeTitulo = Math.max(0, Math.min(100, clubChanceDeTitulo));

  const clubChanceDePermanecer = 100 - clubChanceDeQueda;
  const clubSafetyMarginPoints = Math.max(0, clubPoints - clubSafetyBenchmarkPoints);

  return {
    clubPoints,
    clubPlayed,
    clubRemainingGames,
    clubRemainingPoints,
    clubMaxPossiblePoints,
    clubEfficiencyPercent,

    clubSafetyBenchmarkPoints,
    clubMidBenchmarkPoints,
    clubTitleBenchmarkPoints,
    clubShortfallToSafety,
    clubShortfallToIdeal,
    clubShortfallToTitle,
    clubSafetyMarginPoints,
    isClubRelegationMathLocked,
    isClubTitleMathLocked,

    clubChanceDeQueda,
    clubChanceDeTitulo,
    clubChanceDePermanecer,
  };
}

export function calculateCategoryEfficiency(categoryObj) {
  const label = categoryObj?.label || 'Sub-7';
  const cat = getRealCategoryData(label);

  if (!cat) {
    return {
      categoryLabel: label,
      categoryTitle: categoryObj?.title || `AD Suzano ${label}`,
      hasData: false,
    };
  }

  const benchmarks = computeCategoryBenchmarks(cat);

  // -----------------------------------------------------------------
  // Situação única do clube (Art. 135º: o que cai ou sobe é o AD Suzano inteiro, não a categoria)
  // -----------------------------------------------------------------
  const allCategoriesData = ALL_LABELS.map(getRealCategoryData).filter(Boolean);
  const allBenchmarks = allCategoriesData.map(computeCategoryBenchmarks);
  const club = computeClubStatus(allCategoriesData, allBenchmarks);

  const categoryShareOfClubPoints = club.clubPoints > 0
    ? Math.round((cat.points / club.clubPoints) * 1000) / 10
    : 0;

  // -----------------------------------------------------------------
  // Cota de contribuição desta categoria (isso sim varia por categoria: cada uma tem jogos e
  // situação diferentes, mas todas ajudam o MESMO objetivo coletivo do clube).
  // -----------------------------------------------------------------
  let categoryMinimo;
  if (club.clubShortfallToSafety > 0 && club.clubRemainingGames > 0) {
    categoryMinimo = Math.round(club.clubShortfallToSafety * (cat.remainingGames / club.clubRemainingGames));
  } else if (cat.remainingGames > 0 && cat.played > 0) {
    // O clube já bate o referencial agregado de segurança: mesmo assim ninguém fica de fora —
    // cada categoria sustenta ao menos o próprio ritmo atual (pts/jogo) nos jogos restantes.
    categoryMinimo = Math.round(cat.remainingGames * (cat.points / cat.played));
  } else {
    categoryMinimo = 0;
  }

  const categoryIdeal = club.clubRemainingGames > 0
    ? Math.round(club.clubShortfallToIdeal * (cat.remainingGames / club.clubRemainingGames))
    : 0;
  const categoryPerfeito = club.clubRemainingGames > 0
    ? Math.round(club.clubShortfallToTitle * (cat.remainingGames / club.clubRemainingGames))
    : 0;

  const winsNeededMinimo = categoryMinimo > 0 ? Math.ceil(categoryMinimo / 3) : 0;

  return {
    categoryLabel: label,
    categoryTitle: categoryObj?.title || `AD Suzano ${label}`,
    hasData: true,
    isInitiation: INITIATION_LABELS.includes(label),
    isBase: BASE_LABELS.includes(label),

    // Dados reais da categoria (tabela oficial FPFS) — apenas contexto, sem gerar % própria
    categoryPosition: cat.position,
    categoryTotalTeams: cat.totalTeams,
    categoryPlayed: cat.played,
    categoryPoints: cat.points,
    categoryGoalDiff: cat.goalDifference,
    categoryRemainingGames: cat.remainingGames,
    categoryRemainingPoints: cat.remainingPoints,
    leaderPoints: cat.leaderPoints,
    leaderTeam: cat.leaderTeam,
    pointsBehindLeader: cat.pointsBehindLeader,
    isLeader: cat.isLeader,
    safetyLinePoints: benchmarks?.safetyLinePoints ?? null,
    safetyTeamName: benchmarks?.safetyTeamName ?? null,
    midTablePoints: benchmarks?.midTablePoints ?? null,
    midTeamName: benchmarks?.midTeamName ?? null,

    // -----------------------------------------------------------------
    // SITUAÇÃO ÚNICA DO CLUBE (igual em todas as categorias — Art. 135º)
    // -----------------------------------------------------------------
    clubPoints: club.clubPoints,
    clubPlayed: club.clubPlayed,
    clubRemainingGames: club.clubRemainingGames,
    clubRemainingPoints: club.clubRemainingPoints,
    clubEfficiencyPercent: club.clubEfficiencyPercent,
    clubSafetyBenchmarkPoints: club.clubSafetyBenchmarkPoints,
    clubMidBenchmarkPoints: club.clubMidBenchmarkPoints,
    clubTitleBenchmarkPoints: club.clubTitleBenchmarkPoints,
    clubShortfallToSafety: club.clubShortfallToSafety,
    clubShortfallToIdeal: club.clubShortfallToIdeal,
    clubShortfallToTitle: club.clubShortfallToTitle,
    clubSafetyMarginPoints: club.clubSafetyMarginPoints,
    isClubRelegationMathLocked: club.isClubRelegationMathLocked,
    isClubTitleMathLocked: club.isClubTitleMathLocked,
    chanceDeQueda: club.clubChanceDeQueda,
    chanceDeCampeao: club.clubChanceDeTitulo,
    chanceDePermanecer: club.clubChanceDePermanecer,

    // Cota de contribuição desta categoria (varia por categoria — números de responsabilidade,
    // não de probabilidade)
    categoryShareOfClubPoints,
    pointsNeededMinimo: categoryMinimo,
    pointsNeededIdeal: categoryIdeal,
    pointsNeededPerfeito: categoryPerfeito,
    winsNeededMinimo,

    // Textos explicativos
    categoryReasoning: `O ${label} soma ${cat.points} pts em ${cat.played} jogos (${categoryShareOfClubPoints}% dos pontos do clube). Nos ${cat.remainingGames} jogos restantes, a cota real desta categoria para ajudar o AD Suzano é de pelo menos +${categoryMinimo} pts.`,

    realismAlert: `O AD Suzano (soma das 8 categorias de Iniciação/Base) tem ${club.clubPoints} pts em ${club.clubPlayed} jogos, ${club.clubEfficiencyPercent}% de aproveitamento. Risco de queda do CLUBE: ${club.clubChanceDeQueda}%. Chance de acesso do CLUBE: ${club.clubChanceDeTitulo}%. Essa leitura é do clube inteiro (Art. 135º) — a mesma em todas as categorias, porque quem sobe ou cai é o AD Suzano como um todo, nunca uma categoria isolada.`,

    pointsTargetSentence: `O ${label} precisa fazer no mínimo +${categoryMinimo} pts (cota real de ajuda ao clube nos ${cat.remainingGames} jogos restantes), ideal +${categoryIdeal} pts, e perfeito +${categoryPerfeito} pts para puxar o clube rumo ao acesso.`,

    relegationRiskSentence: club.isClubRelegationMathLocked
      ? `O AD Suzano já não alcança mais matematicamente o referencial de segurança (${club.clubSafetyBenchmarkPoints} pts agregados) mesmo vencendo tudo que resta: risco de queda de 100%.`
      : club.clubShortfallToSafety > 0
        ? `Ficando abaixo da cota mínima do clube (+${club.clubShortfallToSafety} pts que ainda faltam), o risco de queda do AD Suzano é de ${club.clubChanceDeQueda}%.`
        : `O AD Suzano já está ${club.clubSafetyMarginPoints} pts acima do referencial de segurança agregado (${club.clubPoints} pts vs. ${club.clubSafetyBenchmarkPoints} pts necessários), por isso o risco de queda do clube hoje é baixo: ${club.clubChanceDeQueda}%. Essa % é do clube inteiro (Art. 135º) — o ${label} ainda contribui com sua cota de +${categoryMinimo} pts para manter essa folga.`,
  };
}

/**
 * Índice de eficiência agregado do clube (todas as categorias de Iniciação + Base), para uso no
 * cabeçalho geral. Não afirma posição/rank entre clubes porque a FPFS não publica essa tabela
 * combinada — mostra apenas o desempenho real e verificado do AD Suzano.
 */
export function calculateClubEfficiencyIndex() {
  const allCategoriesData = ALL_LABELS.map(getRealCategoryData).filter(Boolean);
  const allBenchmarks = allCategoriesData.map(computeCategoryBenchmarks);
  const club = computeClubStatus(allCategoriesData, allBenchmarks);

  return {
    categories: allCategoriesData,
    ...club,
  };
}
