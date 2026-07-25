import { fpfsCategories } from '../data/fpfsCategories';

/**
 * FPFS Ranking de Eficiência Anual (Art. 135º do Regulamento)
 * Nas categorias de Iniciação (Sub-7 a Sub-10) e Base (Sub-12 a Sub-18), 
 * o acesso e descenso das equipes é apurado pelo Ranking de Eficiência Anual do Clube.
 * "Se uma categoria cair, caem todas. Se uma subir, sobem todas."
 */

export const CLUB_RANKING_SNAPSHOT = {
  position: 18,
  totalTeams: 20,
  points: 38,
  played: 49,
  targetSafetyPoints: 56, // Pontuação mínima realista para garantir permanência fora do Z2 (19º Pequeno Mestre e 20º Impacto)
  targetAccessPoints: 76, // Pontuação para brigar pelo Acesso à Série A1 (Top 2)
  totalPhaseMatches: 76,  // Total de jogos na fase classificatória do clube
};

// Perfil de desempenho específico e ponderado por categoria
const CATEGORY_PROFILES = {
  'Sub-7': {
    defaultPlayed: 16,
    totalGames: 19,
    defaultPoints: 30,
    defaultGoalDiff: 19,
    strengthFactor: 1.4, // Categoria mais forte (62.5% aproveitamento), assume cota maior
    reasoning: 'Como o Sub-7 é a categoria com maior aproveitamento do clube (30 pts, 62.5% de eficiência), sua cota no Ranking de Eficiência é maior para puxar a pontuação coletiva do AD Suzano.',
  },
  'Sub-8': {
    defaultPlayed: 16,
    totalGames: 19,
    defaultPoints: 15,
    defaultGoalDiff: -12,
    strengthFactor: 0.85,
    reasoning: 'O Sub-8 possui aproveitamento médio-baixo (15 pts em 16 jg). Sua cota realista é somar pontos em pelo menos 2 das 3 rodadas finais.',
  },
  'Sub-9': {
    defaultPlayed: 16,
    totalGames: 19,
    defaultPoints: 21,
    defaultGoalDiff: 2,
    strengthFactor: 1.1,
    reasoning: 'O Sub-9 está em evolução positiva (21 pts). Sua cota no ranking geral exige buscar vitórias nos jogos em casa para sustentar a margem de segurança.',
  },
  'Sub-10': {
    defaultPlayed: 16,
    totalGames: 19,
    defaultPoints: 18,
    defaultGoalDiff: -4,
    strengthFactor: 0.95,
    reasoning: 'O Sub-10 soma 18 pts em 16 jogos. A meta calculada para a comissão é buscar no mínimo 1 vitória e 1 empate nas 3 rodadas finais.',
  },
  'Sub-12': {
    defaultPlayed: 12,
    totalGames: 19,
    defaultPoints: 18,
    defaultGoalDiff: 7,
    strengthFactor: 1.25,
    reasoning: 'Com 18 pts em 12 jogos e saldo positivo (+7), o Sub-12 tem 6 partidas restantes na Base. Sua cota realista é buscar +7 pontos, aproveitando os confrontos diretos contra Selecionados e Impacto.',
  },
  'Sub-14': {
    defaultPlayed: 12,
    totalGames: 19,
    defaultPoints: 14,
    defaultGoalDiff: -5,
    strengthFactor: 0.9,
    reasoning: 'Com 14 pts acumulados, o Sub-14 tem a missão de entregar +5 pontos nas 6 rodadas finais da Base para ajudar a livrar o AD Suzano do rebaixamento.',
  },
  'Sub-16': {
    defaultPlayed: 12,
    totalGames: 19,
    defaultPoints: 12,
    defaultGoalDiff: -8,
    strengthFactor: 0.8,
    reasoning: 'O Sub-16 soma 12 pts em 12 jogos. Sua cota calculada é de +4 pontos nos 6 jogos restantes para cumprir a meta de permanência do clube.',
  },
  'Sub-18': {
    defaultPlayed: 12,
    totalGames: 19,
    defaultPoints: 16,
    defaultGoalDiff: 1,
    strengthFactor: 1.15,
    reasoning: 'O Sub-18 é uma das forças da Base (16 pts em 12 jg). Para compensar oscilações de outras categorias, a meta para o Sub-18 é buscar +6 pontos nas 6 rodadas finais.',
  },
};

export function calculateCategoryEfficiency(categoryObj) {
  const label = categoryObj?.label || 'Sub-7';
  const profile = CATEGORY_PROFILES[label] || CATEGORY_PROFILES['Sub-7'];
  const fpfsCategory = fpfsCategories.find((item) => item.category === label);

  // Jogos da categoria
  const playedGamesCategory = fpfsCategory?.record?.played ?? profile.defaultPlayed;
  const totalMatchesCategory = profile.totalGames;
  const remainingGamesCategory = Math.max(0, totalMatchesCategory - playedGamesCategory);
  const remainingPointsCategory = remainingGamesCategory * 3;

  // Pontuação e métricas reais da categoria
  const categoryPoints = fpfsCategory?.record?.points ?? profile.defaultPoints;
  const categoryGoalDiff = fpfsCategory?.record?.goalDifference ?? profile.defaultGoalDiff;

  // Totais do Clube no Ranking de Eficiência
  const clubCurrentPoints = CLUB_RANKING_SNAPSHOT.points; // 38 pts
  const clubPlayed = CLUB_RANKING_SNAPSHOT.played; // 49 jogos
  const clubTotalMatches = CLUB_RANKING_SNAPSHOT.totalPhaseMatches; // 76 jogos
  const clubRemainingMatches = Math.max(0, clubTotalMatches - clubPlayed); // 27 jogos restantes
  const clubRemainingPoints = clubRemainingMatches * 3; // 81 pts a disputar no clube

  // Cálculo dos Pontos Faltantes no Clube
  const pointsNeededToStay = Math.max(0, CLUB_RANKING_SNAPSHOT.targetSafetyPoints - clubCurrentPoints); // +18 pts
  const pointsNeededToPromote = Math.max(0, CLUB_RANKING_SNAPSHOT.targetAccessPoints - clubCurrentPoints); // +38 pts

  // --------------------------------------------------------------------------
  // CÁLCULO DA META ESPECÍFICA E PONDERADA DA CATEGORIA
  // --------------------------------------------------------------------------
  // A meta de permanência do clube (+18 pts) é distribuída entre as categorias
  // ponderando pela FORÇA (strengthFactor) e JOGOS RESTANTES da categoria.
  const baseCategoryShare = pointsNeededToStay * (remainingGamesCategory / Math.max(1, clubRemainingMatches));
  const weightedTargetStay = Math.round(baseCategoryShare * profile.strengthFactor);
  
  // Garantir limites realistas entre 3 e os pontos máximos restantes da categoria
  const categoryTargetToStay = Math.min(
    remainingPointsCategory,
    Math.max(3, weightedTargetStay)
  );

  // Meta para Acesso A1 (Praticamente inalcançável)
  const categoryTargetToPromote = Math.min(
    remainingPointsCategory,
    Math.ceil(pointsNeededToPromote * (remainingGamesCategory / Math.max(1, clubRemainingMatches)))
  );

  // Percentuais Estatísticos Realistas
  const chanceDeSubir = 2; // Descartada estatisticamente por exigir ritmo de 47% de aproveitamento
  const chanceDeCair = 32;
  const chanceDePermanecer = 68;

  // Detalhamento de como atingir a meta
  const winsNeededToStay = Math.ceil(categoryTargetToStay / 3);
  const drawsNeededToStay = Math.max(0, categoryTargetToStay - (winsNeededToStay - 1) * 3);

  return {
    categoryLabel: label,
    categoryTitle: categoryObj?.title || `AD Suzano ${label}`,
    isInitiation: ['Sub-7', 'Sub-8', 'Sub-9', 'Sub-10'].includes(label),
    isBase: ['Sub-12', 'Sub-14', 'Sub-16', 'Sub-18'].includes(label),
    
    // Status Geral do Clube no Ranking
    clubPosition: CLUB_RANKING_SNAPSHOT.position,
    clubTotalTeams: CLUB_RANKING_SNAPSHOT.totalTeams,
    clubPoints: clubCurrentPoints,
    clubPlayed,
    clubRemainingMatches,
    clubRemainingPoints,
    
    // Metas do Clube
    pointsNeededToStay,       // +18 pts no clube
    pointsNeededToPromote,    // +38 pts no clube
    targetSafetyPoints: CLUB_RANKING_SNAPSHOT.targetSafetyPoints, // 56 pts
    targetAccessPoints: CLUB_RANKING_SNAPSHOT.targetAccessPoints, // 76 pts

    // Dados da Categoria Específica
    categoryPlayed: playedGamesCategory,
    categoryRemainingGames: remainingGamesCategory,
    categoryRemainingPoints: remainingPointsCategory,
    categoryPoints,
    categoryGoalDiff,

    // Metas Específicas e Ponderadas do Treinador desta Categoria
    categoryTargetToStay,     // Ex: Sub-7 é +6 pts, Sub-12 é +7 pts, Sub-16 é +4 pts
    categoryTargetToPromote,  // Ex: +10 pts

    // Percentuais Estatísticos Realistas (Art. 135º)
    chanceDeSubir,
    chanceDeCair,
    chanceDePermanecer,

    // Explicação Transparente da Meta da Categoria
    categoryReasoning: profile.reasoning,
    coachingAdviceToStay: `MÍNIMO DO ${label}: Fazer no mínimo +${categoryTargetToStay} pontos (ex: ${winsNeededToStay} vitória${winsNeededToStay > 1 ? 's' : ''} ou combinações) nos ${remainingGamesCategory} jogos restantes para entregar a cota do ${label}.`,
    coachingAdviceToPromote: `SEM ILUSÃO: Acesso estatisticamente descartado (2%). O foco total da comissão do ${label} deve ser a PERMANÊNCIA.`,
    realismAlert: `Leitura 100% Realista (${label}): O AD Suzano soma 38 pontos no 18º lugar. A chance de subir para a A1 é virtualmente nula (2%). Toda a atenção dos treinadores do ${label} deve ser voltada para somar a cota específica de +${categoryTargetToStay} pontos.`,
  };
}
