import { fpfsCategories } from '../data/fpfsCategories.js';

/**
 * FPFS Ranking de Eficiência Anual (Art. 135º do Regulamento)
 * Nas categorias de Iniciação (Sub-7 a Sub-10) e Base (Sub-12 a Sub-18),
 * o acesso e descenso das equipes é apurado pelo Ranking de Eficiência Anual do Clube.
 * "Se uma categoria cair, caem todas. Se uma subir, sobem todas."
 */

const BASE_LABELS = ['Sub-12', 'Sub-14', 'Sub-16', 'Sub-18'];
const INITIATION_LABELS = ['Sub-7', 'Sub-8', 'Sub-9', 'Sub-10'];
const ALL_LABELS = [...INITIATION_LABELS, ...BASE_LABELS];

const CLUB_TEAM_NAME = 'A.D. SUZANO';

function getRealCategoryData(label) {
  const fc = fpfsCategories.find((item) => item.category === label);
  if (!fc) return null;

  const record = fc.record || {};
  const standings = fc.standings || [];
  const ownStanding = standings.find((s) => s.team === CLUB_TEAM_NAME) || null;
  const leader = standings[0] || null;

  // Chave única em turno simples: cada equipe enfrenta as demais uma vez.
  // A quantidade muda por competição (24 equipes na Iniciação e 20 na Base),
  // portanto não pode ser um número fixo compartilhado entre categorias.
  const totalGames = standings.length > 1
    ? standings.length - 1
    : Math.max(record.played ?? 0, (record.played ?? 0) + (fc.upcomingGames?.length ?? 0));
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

function computeCategoryBenchmarks(cat) {
  const { standings, totalTeams } = cat;
  if (!standings || totalTeams < 4) return null;

  const safetyIndex = totalTeams - 3; // Posição acima do Z2
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

function buildCategoryReasoning(cat, categoryMinimo) {
  const efficiency = cat.played ? Math.round((cat.points / (cat.played * 3)) * 1000) / 10 : 0;
  const balance = cat.goalDifference > 0 ? `+${cat.goalDifference}` : cat.goalDifference;
  if (!cat.remainingGames) {
    return `O ${cat.label} encerrou os ${cat.played} jogos mapeados com ${cat.points} pontos, ${efficiency}% de aproveitamento e saldo ${balance}. A cota futura é zero porque não há partidas restantes na base.`;
  }
  return `O ${cat.label} soma ${cat.points} pontos em ${cat.played} jogos (${efficiency}% de aproveitamento), saldo ${balance} e ainda tem ${cat.remainingGames} partida(s). A cota automática de +${categoryMinimo} pontos respeita o teto de ${cat.remainingPoints} pontos disponíveis e o piso competitivo da categoria.`;
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
  const allCategoriesData = ALL_LABELS.map(getRealCategoryData).filter(Boolean);
  const allBenchmarks = allCategoriesData.map(computeCategoryBenchmarks);
  const club = computeClubStatus(allCategoriesData, allBenchmarks);

  const categoryShareOfClubPoints = club.clubPoints > 0
    ? Math.round((cat.points / club.clubPoints) * 1000) / 10
    : 0;

  // -----------------------------------------------------------------
  // Cota de contribuição competitiva da categoria (Cálculo com Piso de Segurança)
  // -----------------------------------------------------------------
  // Para não gerar cotas ilusoriamente baixas (como +3 pts quando a equipe precisa competir de verdade),
  // definimos um PISO MÍNIMO COMPETITIVO de pelo menos 55% dos pontos restantes da categoria
  // para categorias pilares (Sub-7, Sub-12, Sub-18) e no mínimo 50% para as demais (Sub-14, Sub-8, Sub-10, Sub-16).
  const isPillarCategory = ['Sub-7', 'Sub-12', 'Sub-18'].includes(label);
  const minimumSafetyRatio = isPillarCategory ? 0.60 : 0.52; // Ex: 60% dos pontos restantes no Sub-18, 52% no Sub-14

  let categoryMinimoCalculated;
  if (club.clubShortfallToSafety > 0 && club.clubRemainingGames > 0) {
    categoryMinimoCalculated = Math.round(club.clubShortfallToSafety * (cat.remainingGames / club.clubRemainingGames));
  } else {
    categoryMinimoCalculated = Math.round(cat.remainingGames * (cat.points / Math.max(1, cat.played)));
  }

  // Teto real: max pontos restantes da categoria (cat.remainingPoints = remainingGames * 3)
  const competitiveFloor = Math.round(cat.remainingPoints * minimumSafetyRatio);
  const categoryMinimo = Math.min(cat.remainingPoints, Math.max(competitiveFloor, categoryMinimoCalculated));

  const categoryIdealRaw = club.clubRemainingGames > 0
    ? Math.round(club.clubShortfallToIdeal * (cat.remainingGames / club.clubRemainingGames))
    : Math.round(cat.remainingPoints * 0.75);
  const categoryPerfeitoRaw = Math.round(cat.remainingPoints * 0.90);

  const categoryIdeal = Math.min(cat.remainingPoints, Math.max(categoryMinimo + 1, categoryIdealRaw));
  const categoryPerfeito = Math.min(cat.remainingPoints, Math.max(categoryIdeal + 1, categoryPerfeitoRaw));

  const winsNeededMinimo = categoryMinimo > 0 ? Math.ceil(categoryMinimo / 3) : 0;
  const categoryReasoning = buildCategoryReasoning(cat, categoryMinimo);

  return {
    categoryLabel: label,
    categoryTitle: categoryObj?.title || `AD Suzano ${label}`,
    hasData: true,
    isInitiation: INITIATION_LABELS.includes(label),
    isBase: BASE_LABELS.includes(label),

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

    // SITUAÇÃO ÚNICA DO CLUBE (Art. 135º)
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

    // Cota Competitiva e Justificada da Categoria
    categoryShareOfClubPoints,
    pointsNeededMinimo: categoryMinimo,
    pointsNeededIdeal: categoryIdeal,
    pointsNeededPerfeito: categoryPerfeito,
    winsNeededMinimo,

    categoryReasoning,

    realismAlert: `O AD Suzano (soma das 8 categorias de Iniciação/Base) soma ${club.clubPoints} pts em ${club.clubPlayed} jogos (${club.clubEfficiencyPercent}% aproveitamento). Risco de queda do CLUBE: ${club.clubChanceDeQueda}%. Chance de acesso do CLUBE: ${club.clubChanceDeTitulo}%. A meta do ${label} foi ajustada para +${categoryMinimo} pts (colchão competitivo) para garantir a segurança do AD Suzano.`,

    pointsTargetSentence: club.isClubTitleMathLocked
      ? `O ${label} precisa fazer no mínimo +${categoryMinimo} pts (cota competitiva de segurança nos ${cat.remainingGames} jogos restantes) e ideal +${categoryIdeal} pts. O acesso está matematicamente fora de alcance para o clube — foco total na permanência.`
      : `O ${label} precisa fazer no mínimo +${categoryMinimo} pts (cota de segurança nos ${cat.remainingGames} jogos restantes), ideal +${categoryIdeal} pts, e perfeito +${categoryPerfeito} pts para puxar o clube rumo ao topo.`,

    relegationRiskSentence: club.isClubRelegationMathLocked
      ? `O AD Suzano não alcança mais o referencial de segurança (${club.clubSafetyBenchmarkPoints} pts) mesmo vencendo tudo: risco de queda de 100%.`
      : club.clubShortfallToSafety > 0
        ? `Ficando abaixo da cota mínima do clube (+${club.clubShortfallToSafety} pts), o risco de queda do AD Suzano é de ${club.clubChanceDeQueda}%.`
        : `O AD Suzano está ${club.clubSafetyMarginPoints} pts acima do referencial de segurança agregado (${club.clubPoints} pts vs. ${club.clubSafetyBenchmarkPoints} pts necessários). O ${label} precisa entregar a cota de +${categoryMinimo} pts para não queimar essa folga.`,
  };
}

export function calculateClubEfficiencyIndex() {
  const allCategoriesData = ALL_LABELS.map(getRealCategoryData).filter(Boolean);
  const allBenchmarks = allCategoriesData.map(computeCategoryBenchmarks);
  const club = computeClubStatus(allCategoriesData, allBenchmarks);

  return {
    categories: allCategoriesData,
    ...club,
  };
}
