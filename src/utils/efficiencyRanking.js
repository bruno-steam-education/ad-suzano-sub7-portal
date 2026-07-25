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
 * Ou seja: o acesso/descenso NÃO é decidido pela tabela de uma categoria isolada — é decidido
 * pela soma da pontuação de TODAS as categorias de Iniciação (Sub-7 ao Sub-10) e Base (Sub-12 ao
 * Sub-18) do clube, comparada com a soma dos demais clubes da série. A FPFS não publica essa
 * classificação combinada entre clubes, então não é possível afirmar uma posição exata (ex:
 * "18º de 20") sem esse dado oficial. Por isso este módulo usa apenas números reais e verificáveis:
 *
 * 1) Por categoria: posição, pontos e distância para o líder são tirados diretamente da tabela
 *    oficial (fpfsCategories[].standings), que já vem da Súmula Online da FPFS.
 * 2) No agregado do clube: soma-se a pontuação e os jogos de todas as categorias para calcular o
 *    índice de aproveitamento real do AD Suzano — sem inventar posição ou pontuação de adversário.
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
    isEliminatedFromTitle: maxPossiblePoints < leaderPoints,
  };
}

/**
 * Metas reais de pontos (mínimo / ideal / perfeito) e risco de queda dentro do próprio grupo da
 * categoria, usando a tabela oficial completa (todos os adversários reais, com pontos reais).
 *
 * - Mínimo: pontos necessários para igualar HOJE a equipe que ocupa a última posição seguraí
 *   (2 últimas colocações = zona de risco, espelhando o critério de acesso/descenso do Art. 135º).
 *   Considera a pontuação ATUAL do rival da zona de risco (ele também tem jogos a fazer, por isso
 *   é um piso, não uma garantia).
 * - Ideal: pontos para alcançar a equipe do meio da tabela (posição intermediária do grupo).
 * - Perfeito: pontos para alcançar o líder e brigar pelo título do grupo.
 *
 * Risco de queda: quanto do "mínimo" ainda falta dividido pelos pontos que ainda serão disputados
 * pela própria equipe. 100% quando é matematicamente impossível alcançar o piso de segurança mesmo
 * vencendo tudo que resta (o rival da zona de risco só pode SOMAR pontos, nunca perder os que já tem).
 */
function computeSafetyTargets(cat) {
  const { standings, totalTeams } = cat;
  if (!standings || totalTeams < 4) return null;

  const safetyIndex = totalTeams - 3; // posição logo acima da zona de risco (últimas 2 colocações)
  const midIndex = Math.max(0, Math.floor(totalTeams / 2) - 1);

  const safetyTeam = standings[safetyIndex];
  const midTeam = standings[midIndex];
  if (!safetyTeam || !midTeam) return null;

  const safetyLinePoints = safetyTeam.points;
  const midTablePoints = midTeam.points;

  const pointsNeededMinimo = Math.max(0, safetyLinePoints + 1 - cat.points);
  const pointsNeededIdeal = Math.max(0, midTablePoints - cat.points);
  const pointsNeededPerfeito = cat.pointsBehindLeader;

  const isRelegationMathematicallyLocked = cat.maxPossiblePoints < safetyLinePoints + 1;

  let chanceDeQueda;
  if (isRelegationMathematicallyLocked) {
    chanceDeQueda = 100;
  } else if (pointsNeededMinimo === 0) {
    // Já está acima da linha de segurança hoje; risco residual cai conforme a folga cresce.
    const margin = cat.points - safetyLinePoints;
    chanceDeQueda = Math.max(3, 22 - margin * 3);
  } else {
    const ratio = pointsNeededMinimo / Math.max(1, cat.remainingPoints);
    chanceDeQueda = 30 + ratio * 65;
  }
  chanceDeQueda = Math.max(0, Math.min(100, Math.round(chanceDeQueda)));

  return {
    safetyLinePoints,
    safetyTeamName: safetyTeam.team,
    midTablePoints,
    midTeamName: midTeam.team,
    pointsNeededMinimo,
    pointsNeededIdeal,
    pointsNeededPerfeito,
    isRelegationMathematicallyLocked,
    chanceDeQueda,
  };
}

/**
 * Chance de título (1º lugar) da categoria dentro do seu próprio grupo (Chave Única da Série A2).
 * Fórmula transparente: compara quanto falta para alcançar o líder (pointsBehindLeader) com o
 * total de pontos que ainda serão disputados (remainingPoints). Quanto menor essa razão, maior a
 * chance. É uma estimativa (não uma probabilidade estatística oficial), sempre 0% quando é
 * matematicamente impossível alcançar o líder mesmo vencendo tudo que resta.
 */
function computeTitleChance(cat) {
  if (!cat) return 0;
  if (cat.isEliminatedFromTitle) return 0;
  if (cat.isLeader) {
    // Líder: favorito, mas a chance cresce com a vantagem de pontos sobre o 2º colocado.
    return 60;
  }
  if (cat.remainingPoints === 0) return 0;

  const gapRatio = cat.pointsBehindLeader / cat.remainingPoints; // 0 = alcançável folgado, 1 = precisa vencer tudo
  const raw = Math.round((1 - gapRatio) * 55);
  return Math.max(1, Math.min(55, raw));
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

  const chanceDeCampeao = computeTitleChance(cat);
  const winsNeededForTitle = cat.pointsBehindLeader > 0 ? Math.ceil(cat.pointsBehindLeader / 3) : 0;
  const safety = computeSafetyTargets(cat);

  // -----------------------------------------------------------------
  // Agregado real do clube (soma de todas as 8 categorias de Iniciação/Base)
  // -----------------------------------------------------------------
  const allCategoriesData = ALL_LABELS.map(getRealCategoryData).filter(Boolean);
  const clubPoints = allCategoriesData.reduce((sum, c) => sum + c.points, 0);
  const clubPlayed = allCategoriesData.reduce((sum, c) => sum + c.played, 0);
  const clubRemainingGames = allCategoriesData.reduce((sum, c) => sum + c.remainingGames, 0);
  const clubRemainingPoints = clubRemainingGames * 3;
  const clubMaxPossiblePoints = clubPoints + clubRemainingPoints;
  const clubPossiblePointsSoFar = clubPlayed * 3;
  const clubEfficiencyPercent = clubPossiblePointsSoFar > 0
    ? Math.round((clubPoints / clubPossiblePointsSoFar) * 1000) / 10
    : 0;

  // Quanto a categoria já contribuiu e ainda pode contribuir para o índice do clube.
  const categoryShareOfClubPoints = clubPoints > 0 ? Math.round((cat.points / clubPoints) * 1000) / 10 : 0;

  return {
    categoryLabel: label,
    categoryTitle: categoryObj?.title || `AD Suzano ${label}`,
    hasData: true,
    isInitiation: INITIATION_LABELS.includes(label),
    isBase: BASE_LABELS.includes(label),

    // Dados reais da categoria (tabela oficial FPFS)
    categoryPosition: cat.position,
    categoryTotalTeams: cat.totalTeams,
    categoryPlayed: cat.played,
    categoryPoints: cat.points,
    categoryGoalDiff: cat.goalDifference,
    categoryRemainingGames: cat.remainingGames,
    categoryRemainingPoints: cat.remainingPoints,
    categoryMaxPossiblePoints: cat.maxPossiblePoints,
    leaderPoints: cat.leaderPoints,
    leaderTeam: cat.leaderTeam,
    pointsBehindLeader: cat.pointsBehindLeader,
    isLeader: cat.isLeader,
    isEliminatedFromTitle: cat.isEliminatedFromTitle,

    // Chance real de título do grupo desta categoria (estimativa transparente, não oficial)
    chanceDeCampeao,
    winsNeededForTitle,

    // Metas reais de pontos e risco de queda no grupo (Art. 135º usa a soma do clube, mas aqui
    // usamos a tabela real desta categoria como referência objetiva e verificável)
    hasSafetyData: Boolean(safety),
    safetyLinePoints: safety?.safetyLinePoints ?? null,
    safetyTeamName: safety?.safetyTeamName ?? null,
    midTablePoints: safety?.midTablePoints ?? null,
    midTeamName: safety?.midTeamName ?? null,
    pointsNeededMinimo: safety?.pointsNeededMinimo ?? null,
    pointsNeededIdeal: safety?.pointsNeededIdeal ?? null,
    pointsNeededPerfeito: safety?.pointsNeededPerfeito ?? null,
    isRelegationMathematicallyLocked: safety?.isRelegationMathematicallyLocked ?? false,
    chanceDeQueda: safety?.chanceDeQueda ?? null,

    // Índice real agregado do clube (soma das 8 categorias) — base do Ranking de Eficiência Anual
    clubPoints,
    clubPlayed,
    clubRemainingGames,
    clubRemainingPoints,
    clubMaxPossiblePoints,
    clubEfficiencyPercent,
    categoryShareOfClubPoints,

    // Textos explicativos
    categoryReasoning: cat.isEliminatedFromTitle
      ? `O ${label} está matematicamente sem chances de título no próprio grupo: mesmo vencendo todos os ${cat.remainingGames} jogos restantes (+${cat.remainingPoints} pts), não alcançaria o líder ${cat.leaderTeam ?? ''} (${cat.leaderPoints} pts).`
      : cat.isLeader
        ? `O ${label} está na liderança do seu grupo com ${cat.points} pts. Para manter a ponta, a comissão deve sustentar o ritmo nos ${cat.remainingGames} jogos restantes.`
        : `O ${label} está a ${cat.pointsBehindLeader} pts do líder (${cat.leaderTeam ?? 'líder do grupo'}), com ${cat.remainingGames} jogos e ${cat.remainingPoints} pts ainda em disputo. Precisaria de pelo menos ${winsNeededForTitle} vitória${winsNeededForTitle === 1 ? '' : 's'} a mais que o rival para brigar pela liderança.`,

    realismAlert: `Leitura baseada em dados reais (${label}): posição ${cat.position}º de ${cat.totalTeams} no grupo, ${cat.points} pts em ${cat.played} jogos. Chance estimada de título do grupo: ${chanceDeCampeao}%. Isso não define sozinho o acesso/descenso do clube (Art. 135º), que depende da soma de todas as categorias de Iniciação e Base frente aos demais clubes da Série A2 — dado que a FPFS não publica publicamente.`,

    // Linha explícita de meta de pontos (mínimo / ideal / perfeito) para o treinador
    pointsTargetSentence: safety
      ? `O ${label} precisa fazer no mínimo +${safety.pointsNeededMinimo} pts (igualar ${safety.safetyTeamName}, ${safety.safetyLinePoints} pts, fora da zona de risco), ideal +${safety.pointsNeededIdeal} pts (alcançar ${safety.midTeamName}, ${safety.midTablePoints} pts, meio de tabela) e perfeito +${safety.pointsNeededPerfeito} pts (alcançar o líder ${cat.leaderTeam ?? ''}, ${cat.leaderPoints} pts, e brigar pelo título).`
      : null,

    // Linha explícita de risco: "com menos pontos que o mínimo, a chance de queda é de XX%"
    relegationRiskSentence: safety
      ? safety.isRelegationMathematicallyLocked
        ? `O ${label} já não alcança mais matematicamente a linha de segurança do grupo (${safety.safetyLinePoints} pts de ${safety.safetyTeamName}) mesmo vencendo todos os jogos restantes: risco de queda de 100%.`
        : `Ficando abaixo do mínimo de +${safety.pointsNeededMinimo} pts, a chance de queda do ${label} para a zona de risco do grupo é de ${safety.chanceDeQueda}%.`
      : null,
  };
}

/**
 * Índice de eficiência agregado do clube (todas as categorias de Iniciação + Base), para uso no
 * cabeçalho geral. Não afirma posição/rank entre clubes porque a FPFS não publica essa tabela
 * combinada — mostra apenas o desempenho real e verificado do AD Suzano.
 */
export function calculateClubEfficiencyIndex() {
  const allCategoriesData = ALL_LABELS.map(getRealCategoryData).filter(Boolean);
  const clubPoints = allCategoriesData.reduce((sum, c) => sum + c.points, 0);
  const clubPlayed = allCategoriesData.reduce((sum, c) => sum + c.played, 0);
  const clubRemainingGames = allCategoriesData.reduce((sum, c) => sum + c.remainingGames, 0);
  const clubRemainingPoints = clubRemainingGames * 3;
  const clubPossiblePointsSoFar = clubPlayed * 3;
  const clubEfficiencyPercent = clubPossiblePointsSoFar > 0
    ? Math.round((clubPoints / clubPossiblePointsSoFar) * 1000) / 10
    : 0;

  return {
    categories: allCategoriesData,
    clubPoints,
    clubPlayed,
    clubRemainingGames,
    clubRemainingPoints,
    clubEfficiencyPercent,
  };
}
