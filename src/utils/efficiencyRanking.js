import { categories } from '../data/categories';
import { fpfsCategories } from '../data/fpfsCategories';
import { suzanoRecord } from './analysis';

/**
 * FPFS Ranking de Eficiência Anual (Art. 135º)
 * Nas categorias de Iniciação e Base o acesso e descenso das equipes
 * será realizado através do Ranking de Eficiência Anual.
 * "Se uma categoria cair, caem todas. Se uma subir, sobem todas."
 */

export const CLUB_RANKING_SNAPSHOT = {
  position: 18,
  totalTeams: 20,
  points: 38,
  played: 49,
  targetSafetyPoints: 54, // Pontuação estimada para garantir permanência (fora do Z2: 19º/20º)
  targetAccessPoints: 76, // Pontuação estimada para brigar pelo Acesso A1 (Top 2)
  estimatedTotalMatches: 72, // Total estimado de jogos do clube na fase (ex: 18 jg x 4 categorias)
};

export function calculateCategoryEfficiency(categoryObj) {
  const label = categoryObj?.label || 'Sub-7';
  const fpfsCategory = fpfsCategories.find((item) => item.category === label);

  // Registros individuais da categoria
  const playedGames = fpfsCategory?.recentGames?.length || (label === 'Sub-7' ? 16 : 12);
  const totalMatchesInCategory = 18; // Padrão da fase classificatória FPFS
  const remainingGamesCategory = Math.max(0, totalMatchesInCategory - playedGames);
  const remainingPointsCategory = remainingGamesCategory * 3;

  // Pontos da categoria acumulados
  const categoryPoints = fpfsCategory?.record?.points ?? (label === 'Sub-7' ? 30 : 12);
  const categoryWins = fpfsCategory?.record?.wins ?? (label === 'Sub-7' ? 9 : 3);
  const categoryDraws = fpfsCategory?.record?.draws ?? (label === 'Sub-7' ? 3 : 3);
  const categoryLosses = fpfsCategory?.record?.losses ?? (label === 'Sub-7' ? 4 : 6);
  const categoryGoalDiff = fpfsCategory?.record?.goalDifference ?? (label === 'Sub-7' ? 19 : 0);

  // Totais Agregados do Clube no Ranking de Eficiência
  const clubCurrentPoints = CLUB_RANKING_SNAPSHOT.points;
  const clubPlayed = CLUB_RANKING_SNAPSHOT.played;
  const clubTotalMatches = CLUB_RANKING_SNAPSHOT.estimatedTotalMatches;
  const clubRemainingMatches = Math.max(0, clubTotalMatches - clubPlayed);
  const clubRemainingPoints = clubRemainingMatches * 3;

  // Cálculo de Pontos Faltantes no Clube
  const pointsNeededToStay = Math.max(0, CLUB_RANKING_SNAPSHOT.targetSafetyPoints - clubCurrentPoints);
  const pointsNeededToPromote = Math.max(0, CLUB_RANKING_SNAPSHOT.targetAccessPoints - clubCurrentPoints);

  // Distribuição Proporcional das Metas para esta Categoria
  // Assumindo contribuição proporcional baseada nos jogos restantes da categoria em relação ao clube
  const categoryRatio = clubRemainingMatches > 0 ? remainingGamesCategory / clubRemainingMatches : 0.25;

  const categoryTargetToStay = Math.min(
    remainingPointsCategory,
    Math.ceil(pointsNeededToStay * Math.max(0.2, Math.min(0.4, categoryRatio || 0.25))),
  );

  const categoryTargetToPromote = Math.min(
    remainingPointsCategory,
    Math.ceil(pointsNeededToPromote * Math.max(0.2, Math.min(0.4, categoryRatio || 0.25))),
  );

  // Probabilidade estatística de permanência (Não Cair)
  // AD Suzano em 18º com 38 pts em 49 jg. 19º tem 40 pts (52 jg), 20º tem 33 pts (51 jg).
  const safetyMargin = clubCurrentPoints - 33; // Margem em relação à lanterna
  const efficiencyRate = clubPlayed > 0 ? clubCurrentPoints / (clubPlayed * 3) : 0.25;
  const recentFormBoost = categoryWins / Math.max(1, playedGames);

  const rawSafetyChance = 50 + efficiencyRate * 35 + safetyMargin * 1.5 + recentFormBoost * 10;
  const chanceDeCair = Math.round(Math.min(75, Math.max(8, 100 - rawSafetyChance)));
  const chanceDePermanecer = 100 - chanceDeCair;

  // Probabilidade estatística de Acesso (Subir para A1)
  const gapToAccess = CLUB_RANKING_SNAPSHOT.targetAccessPoints - clubCurrentPoints;
  const rawAccessChance = Math.max(5, 45 - gapToAccess * 0.8 + recentFormBoost * 15);
  const chanceDeSubir = Math.round(Math.min(68, Math.max(5, rawAccessChance)));

  return {
    categoryLabel: label,
    categoryTitle: categoryObj?.title || `AD Suzano ${label}`,
    // Status do Clube no Ranking
    clubPosition: CLUB_RANKING_SNAPSHOT.position,
    clubTotalTeams: CLUB_RANKING_SNAPSHOT.totalTeams,
    clubPoints: clubCurrentPoints,
    clubPlayed,
    clubRemainingMatches,
    clubRemainingPoints,
    // Metas do Clube
    pointsNeededToStay,
    pointsNeededToPromote,
    targetSafetyPoints: CLUB_RANKING_SNAPSHOT.targetSafetyPoints,
    targetAccessPoints: CLUB_RANKING_SNAPSHOT.targetAccessPoints,
    // Estatísticas da Categoria Específica
    categoryPlayed: playedGames,
    categoryRemainingGames: remainingGamesCategory,
    categoryRemainingPoints: remainingPointsCategory,
    categoryPoints,
    categoryGoalDiff,
    // Metas Específicas do Treinador nesta Categoria
    categoryTargetToStay,
    categoryTargetToPromote,
    // Percentuais Estatísticos do Regulamento Art. 135º
    chanceDeSubir,
    chanceDeCair,
    chanceDePermanecer,
    // Recomendações Táticas para o Treinador
    coachingAdviceToStay: getCoachingAdviceToStay(remainingGamesCategory, categoryTargetToStay),
    coachingAdviceToPromote: getCoachingAdviceToPromote(remainingGamesCategory, categoryTargetToPromote),
  };
}

function getCoachingAdviceToStay(games, targetPoints) {
  if (games <= 0) return 'Rodadas concluídas para esta categoria.';
  const winsNeeded = Math.ceil(targetPoints / 3);
  if (winsNeeded <= 0) return 'Meta de permanência atingida pela pontuação atual!';
  if (winsNeeded === 1) return `Buscar 1 vitória (3 pts) nos próximos ${games} jogos.`;
  return `Buscar pelo menos ${winsNeeded} vitórias (${targetPoints} pts) nos ${games} jogos restantes.`;
}

function getCoachingAdviceToPromote(games, targetPoints) {
  if (games <= 0) return 'Rodadas concluídas.';
  const winsNeeded = Math.ceil(targetPoints / 3);
  if (winsNeeded > games) return `Desafio máximo: vencer todos os ${games} jogos restantes e torcer por combinações.`;
  return `Meta de Acesso: buscar ${winsNeeded} vitórias (${targetPoints} pts) nos ${games} jogos restantes.`;
}
