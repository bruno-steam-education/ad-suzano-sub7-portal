import { fpfsCategories } from '../src/data/fpfsCategories.js';
import { buildAnalyticsSnapshot, deriveRecordFromGames } from '../src/utils/analyticsRobots.js';

const requiredCategories = ['Sub-7', 'Sub-8', 'Sub-9', 'Sub-10', 'Sub-12', 'Sub-14', 'Sub-16', 'Sub-18'];
const fields = ['played', 'wins', 'draws', 'losses', 'goalsFor', 'goalsAgainst', 'points', 'goalDifference'];
const problems = [];

for (const categoryName of requiredCategories) {
  const category = fpfsCategories.find((item) => item.category === categoryName);
  if (!category) {
    problems.push(`${categoryName}: categoria ausente.`);
    continue;
  }

  const games = category.playedGames ?? [];
  const derived = deriveRecordFromGames(games);
  const expectedSeasonGames = Math.max(0, (category.standings?.length ?? 1) - 1);
  const expectedRemaining = Math.max(0, expectedSeasonGames - (category.record?.played ?? 0));
  if (games.length !== category.record?.played) {
    problems.push(`${categoryName}: ${games.length} jogos armazenados, mas o registro informa ${category.record?.played ?? 0}.`);
  }

  for (const field of fields) {
    if (Number(derived[field]) !== Number(category.record?.[field])) {
      problems.push(`${categoryName}: divergência em ${field} (jogos=${derived[field]}, tabela=${category.record?.[field]}).`);
    }
  }

  if (category.record.points !== category.record.wins * 3 + category.record.draws) {
    problems.push(`${categoryName}: pontos não correspondem a 3×V + E.`);
  }
  if (category.record.played !== category.record.wins + category.record.draws + category.record.losses) {
    problems.push(`${categoryName}: jogos não correspondem a V + E + D.`);
  }
  if (category.record.goalDifference !== category.record.goalsFor - category.record.goalsAgainst) {
    problems.push(`${categoryName}: saldo não corresponde a GP − GC.`);
  }
  if ((category.upcomingGames?.length ?? 0) !== expectedRemaining) {
    problems.push(`${categoryName}: calendário tem ${category.upcomingGames?.length ?? 0} jogos futuros; pela chave única deveriam restar ${expectedRemaining}.`);
  }

  const standing = category.standings?.find((item) => item.team?.includes('SUZANO'));
  if (!standing) problems.push(`${categoryName}: AD Suzano não localizada na classificação.`);
  for (const field of fields) {
    if (field === 'goalDifference' || standing) {
      if (standing && Number(standing[field]) !== Number(category.record?.[field])) {
        problems.push(`${categoryName}: registro diverge da classificação em ${field}.`);
      }
    }
  }

  const checkedAt = category.checkedAt ? new Date(category.checkedAt) : null;
  const ageHours = checkedAt ? (Date.now() - checkedAt.getTime()) / 36e5 : Infinity;
  if (ageHours > 36) problems.push(`${categoryName}: dados FPFS com mais de 36 horas.`);
}

const snapshot = buildAnalyticsSnapshot(fpfsCategories);
const points = fpfsCategories.reduce((sum, category) => sum + category.record.points, 0);
const played = fpfsCategories.reduce((sum, category) => sum + category.record.played, 0);
const expectedEfficiency = played ? Math.round((points / (played * 3)) * 1000) / 10 : 0;
if (snapshot.totals.efficiency !== expectedEfficiency) {
  problems.push(`Aproveitamento geral incorreto (${snapshot.totals.efficiency}% vs. ${expectedEfficiency}% ponderado).`);
}

if (problems.length) {
  console.error('Auditoria dos robôs encontrou problemas:');
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log(`Auditoria OK: ${requiredCategories.length} categorias, ${played} jogos e ${snapshot.totals.efficiency}% de aproveitamento ponderado.`);
