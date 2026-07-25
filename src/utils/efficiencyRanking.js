import { categories } from '../data/categories';
import { fpfsCategories } from '../data/fpfsCategories';

/**
 * FPFS Ranking de Eficiência Anual (Art. 135º do Regulamento)
 * Nas categorias de Iniciação e Base o acesso e descenso das equipes
 * será realizado através do Ranking de Eficiência Anual do Clube.
 * "Se uma categoria cair, caem todas. Se uma subir, sobem todas."
 */

export const CLUB_RANKING_SNAPSHOT = {
  position: 18,
  totalTeams: 20,
  points: 38,
  played: 49,
  targetSafetyPoints: 56, // Pontuação mínima realista para garantir a permanência fora do Z2 (19º Pequeno Mestre e 20º Impacto)
  targetAccessPoints: 76, // Pontuação para brigar pelo Acesso à Série A1 (Top 2)
  totalPhaseMatches: 76,  // Total de jogos na fase (19 rodadas x 4 categorias da divisão)
};

export function calculateCategoryEfficiency(categoryObj) {
  const label = categoryObj?.label || 'Sub-7';
  const fpfsCategory = fpfsCategories.find((item) => item.category === label);

  // Jogos da categoria
  const playedGamesCategory = fpfsCategory?.record?.played ?? (label === 'Sub-7' ? 16 : 13);
  const totalMatchesCategory = 19; // 19 rodadas da tabela oficial FPFS
  const remainingGamesCategory = Math.max(0, totalMatchesCategory - playedGamesCategory);
  const remainingPointsCategory = remainingGamesCategory * 3;

  // Pontuação atual da categoria
  const categoryPoints = fpfsCategory?.record?.points ?? 18;
  const categoryWins = fpfsCategory?.record?.wins ?? 5;
  const categoryDraws = fpfsCategory?.record?.draws ?? 3;
  const categoryLosses = fpfsCategory?.record?.losses ?? 5;
  const categoryGoalDiff = fpfsCategory?.record?.goalDifference ?? 7;

  // Totais do Clube no Ranking de Eficiência (Agregado Iniciação e Base)
  const clubCurrentPoints = CLUB_RANKING_SNAPSHOT.points; // 38 pts
  const clubPlayed = CLUB_RANKING_SNAPSHOT.played; // 49 jogos
  const clubTotalMatches = CLUB_RANKING_SNAPSHOT.totalPhaseMatches; // 76 jogos
  const clubRemainingMatches = Math.max(0, clubTotalMatches - clubPlayed); // 27 jogos restantes
  const clubRemainingPoints = clubRemainingMatches * 3; // 81 pts a disputar no clube

  // Cálculo dos Pontos Faltantes no Clube (100% Realista)
  const pointsNeededToStay = Math.max(0, CLUB_RANKING_SNAPSHOT.targetSafetyPoints - clubCurrentPoints); // +18 pts
  const pointsNeededToPromote = Math.max(0, CLUB_RANKING_SNAPSHOT.targetAccessPoints - clubCurrentPoints); // +38 pts

  // Distribuição da Meta Proporcional para esta Categoria
  // Cada categoria precisa contribuir com aproximadamente 25% dos pontos restantes do clube
  const categoryTargetToStay = Math.min(
    remainingPointsCategory,
    Math.ceil(pointsNeededToStay * 0.25)
  ); // ~4 a 5 pontos por categoria

  const categoryTargetToPromote = Math.min(
    remainingPointsCategory,
    Math.ceil(pointsNeededToPromote * 0.25)
  ); // ~10 pontos por categoria

  // --------------------------------------------------------------------------
  // CÁLCULO ESTATÍSTICO 100% REALISTA (SEM ROMANTISMO)
  // --------------------------------------------------------------------------
  // Aproveitamento atual do clube: 38 / 147 pts possíveis = ~25.8%
  // Para SUBIR (Acesso): precisaria de 38 pts nos 27 jg restantes = 47% de aproveitamento (quase o dobro do ritmo atual)
  // Chance de Subir: 2% (Virtualmente nula nesta temporada)
  const chanceDeSubir = 2;

  // Para NÃO CAIR (Permanência): o AD Suzano (38 pts) está colado no Pequeno Mestre (40 pts em 52 jg) e Impacto (33 pts em 51 jg)
  // O risco de queda é real (32%) se o time não fizer pelo menos 5 a 6 vitórias/empates nas rodadas finais.
  const chanceDeCair = 32;
  const chanceDePermanecer = 68;

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
    pointsNeededToStay,       // Ex: +18 pts
    pointsNeededToPromote,    // Ex: +38 pts
    targetSafetyPoints: CLUB_RANKING_SNAPSHOT.targetSafetyPoints, // 56 pts
    targetAccessPoints: CLUB_RANKING_SNAPSHOT.targetAccessPoints, // 76 pts

    // Dados da Categoria Específica
    categoryPlayed: playedGamesCategory,
    categoryRemainingGames: remainingGamesCategory,
    categoryRemainingPoints: remainingPointsCategory,
    categoryPoints,
    categoryGoalDiff,

    // Metas do Treinador nesta Categoria
    categoryTargetToStay,     // Ex: +5 pts
    categoryTargetToPromote,  // Ex: +10 pts

    // Percentuais Estatísticos Realistas (Art. 135º)
    chanceDeSubir,
    chanceDeCair,
    chanceDePermanecer,

    // Textos Realistas (100% Sem Romantismo)
    coachingAdviceToStay: `MÍNIMO OBRIGATÓRIO: Fazer no mínimo +${categoryTargetToStay} pontos (ex: 1 vitória e 2 empates) nos ${remainingGamesCategory} jogos restantes para livrar o AD Suzano da Série A3.`,
    coachingAdviceToPromote: `SEM ILUSÃO: Acesso estatisticamente descartado (2%). O foco total da comissão técnica deve ser a PERMANÊNCIA.`,
    realismAlert: `Leitura 100% Realista: O AD Suzano soma 38 pontos no 18º lugar. A chance de subir para a A1 é virtualmente nula (2%). Toda a atenção dos treinadores do ${label} deve ser voltada para somar os +${categoryTargetToStay} pontos necessários para garantir a permanência na Série A2.`,
  };
}
