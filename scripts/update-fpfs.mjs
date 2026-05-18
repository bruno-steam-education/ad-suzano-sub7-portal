import * as cheerio from 'cheerio';
import { writeFile } from 'node:fs/promises';

const BASE_URL = 'https://eventos.admfutsal.com.br';
const SEASON = 2026;
const TITLE_ID = 16;
const DIVISION_ID = 4;
const CATEGORY_ORDER = ['Sub-7', 'Sub-8', 'Sub-9', 'Sub-10', 'Sub-12', 'Sub-14', 'Sub-16', 'Sub-18'];

function cleanText(value = '') {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizeTeam(value = '') {
  const text = cleanText(value).toUpperCase();
  const parts = text.split('|').map((part) => cleanText(part));
  return parts.find((part) => part.includes('SUZANO')) ?? text;
}

function canonicalTeam(value = '') {
  return normalizeTeam(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/A\.?\s*D\.?/g, 'AD')
    .replace(/[^A-Z0-9]+/g, ' ')
    .replace(/\bFUTSAL\b/g, '')
    .replace(/\bCLUBE\b/g, '')
    .replace(/\bASSOCIACAO\b/g, 'ASS')
    .replace(/\s+/g, ' ')
    .trim();
}

function isSuzanoTeam(value = '') {
  return normalizeTeam(value).includes('SUZANO');
}

function parseScore(value = '') {
  const match = cleanText(value).match(/(\d+)\s*x\s*(\d+)/i);
  if (!match) return {};
  return {
    homeGoals: Number(match[1]),
    awayGoals: Number(match[2]),
  };
}

async function fetchJson(path) {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { 'User-Agent': 'AD-Suzano-FPFS-Bot/1.0' },
  });
  if (!response.ok) throw new Error(`Falha em ${path}: ${response.status}`);
  return response.json();
}

async function fetchHtml(path) {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { 'User-Agent': 'AD-Suzano-FPFS-Bot/1.0' },
  });
  if (!response.ok) throw new Error(`Falha em ${path}: ${response.status}`);
  return response.text();
}

async function getEvents() {
  const data = await fetchJson(`/api/get_categorias/${SEASON}/${TITLE_ID}/${DIVISION_ID}`);
  const events = Array.isArray(data) ? data : data.value ?? [];
  return events
    .map((event) => ({
      id: event.id_evento,
      category: event.categoria?.nome,
      startDate: event.dt_inicio,
      endDate: event.dt_final,
      url: `${BASE_URL}/evento/${event.id_evento}`,
      gamesUrl: `${BASE_URL}/evento/${event.id_evento}/jogos`,
    }))
    .filter((event) => CATEGORY_ORDER.includes(event.category))
    .sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category));
}

async function scrapeGames(event) {
  const html = await fetchHtml(`/evento/${event.id}/jogos`);
  const $ = cheerio.load(html);
  const games = [];

  $('.classification_table tbody tr').each((_, row) => {
    const cells = $(row).find('td');
    const dateText = cleanText($(cells[0]).text());
    const timeText = cleanText($(cells[1]).text()).replace(/h$/i, '');
    const venue = cleanText($(cells[2]).text());
    const resultCell = $(cells[3]);
    const teams = resultCell.find('.nome_clube').map((__, team) => cleanText($(team).text())).get();
    const result = cleanText(resultCell.find('.result').first().text());
    const summaryUrl = resultCell.find('a[href*="sumula"]').attr('href') ?? null;

    if (teams.length < 2) return;
    const home = normalizeTeam(teams[0]);
    const away = normalizeTeam(teams[1]);

    const [day, month] = dateText.split('/');
    const score = parseScore(result);
    games.push({
      date: `${SEASON}-${month?.padStart(2, '0')}-${day?.padStart(2, '0')}`,
      time: timeText ? `${timeText.replace(':', 'h')}` : '',
      venue,
      home,
      away,
      ...score,
      summaryUrl,
    });
  });

  return games.sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
}

async function scrapeStandings(event) {
  const html = await fetchHtml(`/evento/${event.id}`);
  const $ = cheerio.load(html);
  const standings = [];
  const table = $('.tab-pane.show.active .classification_table').first().length
    ? $('.tab-pane.show.active .classification_table').first()
    : $('.classification_table').first();

  table.find('tbody tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length < 11) return;
    const numberAt = (index) => {
      const value = cleanText($(cells[index]).text()).replace(',', '.').replace(/[^\d.-]/g, '');
      return value === '' ? null : Number(value);
    };

    standings.push({
      group: cleanText($(cells[0]).text()),
      position: numberAt(1),
      positionLabel: cleanText($(cells[1]).text()),
      team: normalizeTeam($(cells[2]).text()),
      points: numberAt(3),
      played: numberAt(4),
      wins: numberAt(5),
      draws: numberAt(6),
      losses: numberAt(7),
      goalsFor: numberAt(8),
      goalsAgainst: numberAt(9),
      goalDifference: numberAt(10),
      average: numberAt(11),
      goalsForAverage: numberAt(12),
      goalsAgainstAverage: numberAt(13),
      technicalIndex: numberAt(14),
    });
  });

  return standings;
}

function findStandingForTeam(standings, team) {
  const target = canonicalTeam(team);
  if (!target) return null;
  return standings.find((standing) => {
    const candidate = canonicalTeam(standing.team);
    return candidate === target || candidate.includes(target) || target.includes(candidate);
  }) ?? null;
}

function lastGameForTeam(games, team, beforeDate) {
  const target = canonicalTeam(team);
  if (!target) return null;
  return games
    .filter((game) => Number.isFinite(game.homeGoals) && Number.isFinite(game.awayGoals))
    .filter((game) => !beforeDate || game.date <= beforeDate)
    .filter((game) => {
      const home = canonicalTeam(game.home);
      const away = canonicalTeam(game.away);
      return home === target || away === target || home.includes(target) || away.includes(target) || target.includes(home) || target.includes(away);
    })
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
    .at(-1) ?? null;
}

function opponentForSuzanoGame(game) {
  return isSuzanoTeam(game.home) ? game.away : game.home;
}

function recordFor(games) {
  return games.reduce(
    (record, game) => {
      if (!Number.isFinite(game.homeGoals) || !Number.isFinite(game.awayGoals)) return record;
      const home = isSuzanoTeam(game.home);
      const goalsFor = home ? game.homeGoals : game.awayGoals;
      const goalsAgainst = home ? game.awayGoals : game.homeGoals;
      const result = goalsFor > goalsAgainst ? 'wins' : goalsFor === goalsAgainst ? 'draws' : 'losses';

      record.played += 1;
      record[result] += 1;
      record.goalsFor += goalsFor;
      record.goalsAgainst += goalsAgainst;
      record.points += result === 'wins' ? 3 : result === 'draws' ? 1 : 0;
      return record;
    },
    { played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, points: 0 },
  );
}

const events = await getEvents();
const categories = [];

for (const event of events) {
  const allGames = await scrapeGames(event);
  const standings = await scrapeStandings(event);
  const games = allGames.filter((game) => isSuzanoTeam(game.home) || isSuzanoTeam(game.away));
  const playedGames = games.filter((game) => Number.isFinite(game.homeGoals));
  const upcomingGames = games
    .filter((game) => !Number.isFinite(game.homeGoals))
    .map((game) => ({
      ...game,
      opponentStanding: findStandingForTeam(standings, opponentForSuzanoGame(game)),
      opponentLastGame: lastGameForTeam(allGames, opponentForSuzanoGame(game), game.date),
    }));
  const record = recordFor(games);
  const goalDifference = record.goalsFor - record.goalsAgainst;

  categories.push({
    ...event,
    record: { ...record, goalDifference },
    standings,
    upcomingGames,
    recentGames: playedGames.slice(-5),
    allRecentGames: allGames.filter((game) => Number.isFinite(game.homeGoals)).slice(-40),
    youtubeSearchUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(`AD Suzano ${event.category} futsal 2026`)}`,
    source: 'FPFS Súmula Online',
    checkedAt: new Date().toISOString(),
  });
}

const content = `// Arquivo gerado por scripts/update-fpfs.mjs.
// Fonte primária: FPFS Súmula Online (${BASE_URL}), temporada ${SEASON}, Paulista A2.
export const fpfsCategories = ${JSON.stringify(categories, null, 2)};
`;

await writeFile(new URL('../src/data/fpfsCategories.js', import.meta.url), content);
console.log(`FPFS atualizado: ${categories.length} categorias.`);
