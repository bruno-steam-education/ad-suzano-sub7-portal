import { athleteRoster } from '../src/data/athleteRoster.js';

function athleteId(player) {
  return String(player.url || '').split('/').pop();
}

// Códigos curtos, estáveis e não sequenciais para o Portal do Atleta.
function codeSeed(value) {
  let hash = 2166136261;
  for (const character of `${value}:ADSUZANO-2026`) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function buildPaymentCodes(players) {
  const used = new Set();
  return players.map((player) => {
    let codeNumber = 1000 + (codeSeed(athleteId(player)) % 9000);
    while (used.has(codeNumber)) codeNumber = 1000 + ((codeNumber - 999) % 9000);
    used.add(codeNumber);
    return String(codeNumber);
  });
}

const rosterPlayers = athleteRoster.categories.flatMap((category) =>
  category.players.map((player) => ({ player, category: category.label })),
);
const paymentCodes = buildPaymentCodes(rosterPlayers.map(({ player }) => player));

export const paymentAthletes = rosterPlayers.map(({ player, category }, index) => ({
  id: athleteId(player),
  name: player.name,
  category,
  code: paymentCodes[index],
}));

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
