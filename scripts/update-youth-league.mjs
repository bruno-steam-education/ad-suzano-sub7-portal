import * as cheerio from 'cheerio';
import https from 'node:https';
import { writeFile } from 'node:fs/promises';

const BASE_URL = 'https://www.ligadajuventudeoficial.com.br';
const COMPETITION_PATH = '/futsal/copa-da-juventude-gold-2026/11-edicao-ano-2026/5336';
const TEAM_PATH = `${COMPETITION_PATH}/equipe/ad-suzano/42329`;
const REQUEST_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/138.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.7',
};
const CATEGORIES = [
  { category: 'Sub-7', slug: 'sub-07-masculino', id: 19823 },
  { category: 'Sub-8', slug: 'sub-08-masculino', id: 19824 },
  { category: 'Sub-9', slug: 'sub-09-masculino', id: 19825 },
  { category: 'Sub-10', slug: 'sub-10-masculino', id: 19826 },
  { category: 'Sub-12', slug: 'sub-12-masculino', id: 19827 },
  { category: 'Sub-14', slug: 'sub-14-masculino', id: 19828 },
];

function cleanText(value = '') {
  return String(value).replace(/\s+/g, ' ').trim();
}

function numberFrom(value = '') {
  const normalized = cleanText(value).replace(',', '.').replace(/[^\d.-]/g, '');
  return normalized === '' ? null : Number(normalized);
}

function isSuzano(value = '') {
  return cleanText(value).toUpperCase() === 'AD SUZANO';
}

function dateKey(value = '') {
  const [day, month, year] = cleanText(value).split('/');
  return year && month && day ? `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}` : '';
}

function parseScore(value = '') {
  const scoreLabel = cleanText(value);
  const regulation = scoreLabel.replace(/\([^)]*\)/g, '');
  const match = regulation.match(/(\d+)\s*X\s*(\d+)/i);
  if (!match) return { scoreLabel, walkover: /\bW\b/i.test(regulation) };
  return {
    homeGoals: Number(match[1]),
    awayGoals: Number(match[2]),
    scoreLabel,
  };
}

function insecureHttpsFallback(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, {
      rejectUnauthorized: false,
      headers: REQUEST_HEADERS,
    }, (response) => {
      if (response.statusCode < 200 || response.statusCode >= 300) {
        reject(new Error(`Falha em ${url}: ${response.statusCode}`));
        response.resume();
        return;
      }
      response.setEncoding('utf8');
      let body = '';
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => resolve(body));
    });
    request.on('error', reject);
  });
}

async function fetchHtml(path) {
  const url = `${BASE_URL}${path}`;
  try {
    const response = await fetch(url, {
      headers: REQUEST_HEADERS,
    });
    if (!response.ok) throw new Error(`Falha em ${url}: ${response.status}`);
    return response.text();
  } catch (error) {
    if (!/certificate|cert|unable to verify/i.test(String(error?.cause?.message ?? error?.message))) throw error;
    console.warn(`Aviso: cadeia TLS incompleta em ${BASE_URL}; usando fallback restrito ao host oficial.`);
    return insecureHttpsFallback(url);
  }
}

function standingFromRow($, row, positionFallback) {
  const cells = $(row).find('th,td').map((_, cell) => cleanText($(cell).text())).get();
  if (cells.length < 10 || !/^\d/.test(cells[0])) return null;
  return {
    position: numberFrom(cells[0]) ?? positionFallback,
    positionLabel: cells[0],
    team: cells[1],
    points: numberFrom(cells[2]) ?? 0,
    played: numberFrom(cells[3]) ?? 0,
    wins: numberFrom(cells[4]) ?? 0,
    draws: numberFrom(cells[5]) ?? 0,
    losses: numberFrom(cells[6]) ?? 0,
    goalsFor: numberFrom(cells[7]) ?? 0,
    goalsAgainst: numberFrom(cells[8]) ?? 0,
    goalDifference: numberFrom(cells[9]) ?? 0,
    average: numberFrom(cells[10]),
  };
}

function scrapeStandings($) {
  const sourceTable = $('table').filter((_, table) => (
    $(table).find('tr').toArray().some((row) => (
      $(row).find('th,td').toArray().some((cell) => isSuzano($(cell).text()))
    ))
  )).first();

  const standings = [];
  sourceTable.find('tr').each((index, row) => {
    const standing = standingFromRow($, row, index);
    if (standing?.team) standings.push(standing);
  });
  return standings;
}

function scrapeSuzanoGames($, category, stage) {
  const gamesById = new Map();
  $('ul.lista-partidas > li').each((_, item) => {
    const row = $(item);
    const teams = row.find('.partida-placar-equipes-nome')
      .map((__, team) => cleanText($(team).text()))
      .get();
    if (teams.length < 2 || !teams.some(isSuzano)) return;
    const rowCategory = cleanText(row.find('.partida-item-categoria-nome').first().text());
    if (rowCategory && rowCategory.replace(/^Sub-0?/, 'Sub-') !== category) return;

    const href = row.find('a[href*="/partida/"]').first().attr('href');
    if (!href || gamesById.has(href)) return;
    const id = href.split('/').filter(Boolean).at(-1);
    const score = parseScore(row.find('.partida-placar-equipes-placar').first().text());
    const suzanoHome = isSuzano(teams[0]);
    const homeWalkover = /^\s*W\s*X/i.test(score.scoreLabel);
    const awayWalkover = /X\s*W\s*$/i.test(score.scoreLabel);
    const suzanoPoints = score.walkover
      ? (suzanoHome === homeWalkover || (!suzanoHome && awayWalkover) ? 3 : 0)
      : undefined;
    gamesById.set(href, {
      id: `copa-juventude-${id}`,
      competition: 'Copa da Juventude Gold 2026',
      category,
      stage,
      date: dateKey(row.find('.partida-item-data').first().text()),
      time: cleanText(row.find('.partida-item-horario').first().text()).replace(':', 'h'),
      venue: cleanText(row.find('.partida-item-localizacao').first().text()),
      home: teams[0],
      away: teams[1],
      ...score,
      ...(Number.isFinite(suzanoPoints) ? { suzanoPoints } : {}),
      sourceUrl: `${BASE_URL}${href}`,
    });
  });

  return [...gamesById.values()]
    .filter((game) => game.date)
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
}

function deriveRecord(games) {
  return games.reduce((record, game) => {
    if (!Number.isFinite(game.homeGoals) || !Number.isFinite(game.awayGoals)) {
      if (!Number.isFinite(game.suzanoPoints)) return record;
      record.played += 1;
      record.points += game.suzanoPoints;
      if (game.suzanoPoints === 3) record.wins += 1;
      else if (game.suzanoPoints === 1) record.draws += 1;
      else record.losses += 1;
      return record;
    }
    const home = isSuzano(game.home);
    const goalsFor = home ? game.homeGoals : game.awayGoals;
    const goalsAgainst = home ? game.awayGoals : game.homeGoals;
    record.played += 1;
    record.goalsFor += goalsFor;
    record.goalsAgainst += goalsAgainst;
    if (goalsFor > goalsAgainst) {
      record.wins += 1;
      record.points += 3;
    } else if (goalsFor === goalsAgainst) {
      record.draws += 1;
      record.points += 1;
    } else {
      record.losses += 1;
    }
    return record;
  }, { played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, points: 0 });
}

function auditRecord(source, derived, category) {
  const fields = ['played', 'wins', 'draws', 'losses', 'goalsFor', 'goalsAgainst', 'points', 'goalDifference'];
  const mismatches = fields.filter((field) => Number(source[field]) !== Number(derived[field]));
  if (mismatches.length) {
    throw new Error(`${category}: divergência entre tabela e jogos em ${mismatches.join(', ')}`);
  }
}

const checkedAt = new Date().toISOString();
const categories = [];
const teamPage = cheerio.load(await fetchHtml(TEAM_PATH));

for (const config of CATEGORIES) {
  const path = `${COMPETITION_PATH}/categoria/${config.slug}/${config.id}`;
  const $ = cheerio.load(await fetchHtml(path));
  const standings = scrapeStandings($);
  const ownStanding = standings.find((standing) => isSuzano(standing.team));
  if (!ownStanding) throw new Error(`${config.category}: AD Suzano não localizado na classificação.`);

  const groupStageGames = scrapeSuzanoGames($, config.category, 'Primeira fase');
  const finalStageGames = scrapeSuzanoGames(teamPage, config.category, 'Fase final');
  const playedGames = [...new Map(
    [...groupStageGames, ...finalStageGames].map((game) => [game.id, game]),
  ).values()].sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  const stageRecord = deriveRecord(groupStageGames);
  stageRecord.goalDifference = stageRecord.goalsFor - stageRecord.goalsAgainst;
  auditRecord(ownStanding, stageRecord, config.category);
  const record = deriveRecord(playedGames);
  record.goalDifference = record.goalsFor - record.goalsAgainst;

  categories.push({
    category: config.category,
    competition: 'Copa da Juventude Gold 2026',
    season: 2026,
    status: 'encerrada',
    startDate: playedGames[0]?.date ?? null,
    endDate: playedGames.at(-1)?.date ?? null,
    url: `${BASE_URL}${path}`,
    teamUrl: `${BASE_URL}${TEAM_PATH}`,
    record,
    stageRecord,
    standings,
    playedGames,
    recentGames: playedGames.slice(-5),
    upcomingGames: [],
    source: 'Liga da Juventude Oficial',
    checkedAt,
  });
}

const content = `// Arquivo gerado por scripts/update-youth-league.mjs.
// Fonte primária: Liga da Juventude Oficial, Copa da Juventude Gold 2026.
export const youthLeagueCompetition = ${JSON.stringify({
  name: 'Copa da Juventude Gold 2026',
  edition: '11ª edição',
  season: 2026,
  status: 'encerrada',
  url: `${BASE_URL}${COMPETITION_PATH}`,
  teamUrl: `${BASE_URL}${TEAM_PATH}`,
  checkedAt,
}, null, 2)};

export const youthLeagueCategories = ${JSON.stringify(categories, null, 2)};
`;

await writeFile(new URL('../src/data/youthLeagueCategories.js', import.meta.url), content);
const totalGames = categories.reduce((sum, category) => sum + category.record.played, 0);
console.log(`Copa da Juventude atualizada: ${categories.length} categorias e ${totalGames} jogos auditados.`);
