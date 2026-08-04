import { athleteRoster } from '../src/data/athleteRoster.js';
import { fpfsCategories } from '../src/data/fpfsCategories.js';
import { athleteSeasonStats } from '../src/data/athleteSeasonStats.js';

const errors = [];
const portalPlayers = athleteRoster.categories.flatMap((category) => category.players);
const expectedGames = fpfsCategories.reduce((total, category) => total + category.playedGames.length, 0);

if (athleteSeasonStats.summary.officialGamesRead !== expectedGames) {
  errors.push(`Súmulas lidas: ${athleteSeasonStats.summary.officialGamesRead}; esperado: ${expectedGames}.`);
}

for (const player of portalPlayers) {
  const id = String(player.url).replace(/\/$/, '').split('/').at(-1);
  if (!athleteSeasonStats.athletes[id]) errors.push(`Atleta sem registro gerado: ${player.name} (${id}).`);
}

for (const category of fpfsCategories) {
  const totals = athleteSeasonStats.categoryTotals?.[category.category];
  if (!totals) {
    errors.push(`Categoria sem totais auditados: ${category.category}.`);
    continue;
  }
  if (totals.goals !== category.record.goalsFor) {
    errors.push(`${category.category}: ${totals.goals} gols individuais; campanha informa ${category.record.goalsFor}.`);
  }
}

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join('\n'));
  process.exit(1);
}

console.log(`Auditoria aprovada: ${expectedGames} súmulas, ${portalPlayers.length} perfis e gols conciliados em 8 categorias.`);
