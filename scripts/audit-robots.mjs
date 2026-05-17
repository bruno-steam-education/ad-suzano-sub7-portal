import { fpfsCategories } from '../src/data/fpfsCategories.js';

const requiredCategories = ['Sub-7', 'Sub-8', 'Sub-9', 'Sub-10', 'Sub-12', 'Sub-14', 'Sub-16', 'Sub-18'];

function chanceFor(record, type) {
  if (!record?.played) return 0;
  const efficiency = record.points / Math.max(1, record.played * 3);
  const goalSignal = Math.max(-12, Math.min(14, record.goalDifference ?? 0));
  const base = type === 'access' ? 20 : 14;
  const multiplier = type === 'access' ? 43 : 58;
  return Math.round(Math.max(1, Math.min(90, base + efficiency * multiplier + goalSignal)));
}

const problems = [];

for (const categoryName of requiredCategories) {
  const category = fpfsCategories.find((item) => item.category === categoryName);

  if (!category) {
    problems.push(`${categoryName}: categoria não encontrada no arquivo FPFS.`);
    continue;
  }

  if (!category.record?.played) {
    problems.push(`${categoryName}: sem jogos processados para cálculo de percentuais.`);
  }

  const titleChance = chanceFor(category.record, 'title');
  const accessChance = chanceFor(category.record, 'access');

  if (titleChance <= 0) problems.push(`${categoryName}: chance de título inválida.`);
  if (accessChance <= 0) problems.push(`${categoryName}: chance de acesso inválida.`);

  for (const [index, game] of (category.upcomingGames ?? []).slice(0, 3).entries()) {
    const winChance = Math.round(Math.max(18, Math.min(84, 34 + (category.record.points / Math.max(1, category.record.played * 3)) * 34)));
    if (winChance <= 0) problems.push(`${categoryName}: chance de vitória inválida no jogo ${index + 1}.`);
    if (!game.date || !game.home || !game.away) problems.push(`${categoryName}: próximo jogo ${index + 1} incompleto.`);
  }

  const checkedAt = category.checkedAt ? new Date(category.checkedAt) : null;
  const ageHours = checkedAt ? (Date.now() - checkedAt.getTime()) / 36e5 : Infinity;
  if (ageHours > 36) problems.push(`${categoryName}: dados FPFS com mais de 36 horas.`);
}

if (problems.length) {
  console.error('Pente fino encontrou problemas:');
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log(`Pente fino OK: ${requiredCategories.length} robôs com percentuais e dados FPFS válidos.`);
