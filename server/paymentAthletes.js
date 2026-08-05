import { athleteRoster } from '../src/data/athleteRoster.js';

function athleteId(player) {
  return String(player.url || '').split('/').pop();
}

// Códigos curtos e estáveis para o teste do Portal da Família.
// A numeração começa em 1001 e acompanha a ordem do cadastro sincronizado.
export const paymentAthletes = athleteRoster.categories.flatMap((category) =>
  category.players.map((player, index) => ({
    id: athleteId(player),
    name: player.name,
    category: category.label,
    code: String(1001 + athleteRoster.categories
      .slice(0, athleteRoster.categories.indexOf(category))
      .reduce((total, item) => total + item.players.length, 0) + index),
  })),
);

export function normalizeSearch(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function findPaymentAthlete({ firstName, lastName, code }) {
  const first = normalizeSearch(firstName).split(' ')[0];
  const last = normalizeSearch(lastName).split(' ').filter(Boolean).at(-1);
  const normalizedCode = String(code || '').replace(/\D/g, '').slice(0, 4);
  if (!first || !last || !/^\d{1,4}$/.test(normalizedCode)) return null;

  return paymentAthletes.find((athlete) => {
    const nameParts = normalizeSearch(athlete.name).split(' ');
    return athlete.code === normalizedCode
      && nameParts[0] === first
      && nameParts.at(-1) === last;
  }) || null;
}
