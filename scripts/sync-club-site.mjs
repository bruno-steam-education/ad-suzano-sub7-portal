import * as cheerio from 'cheerio';
import { writeFile } from 'node:fs/promises';

const SITE_URL = 'https://adsuzano.com.br';
const HEADERS = { 'User-Agent': 'AD-Suzano-Digital-Lab/1.0' };
const MAIN_LABELS = ['HOME', 'ATLETAS', 'JOGOS', 'CAMPEONATOS', 'RANKING', 'CAMPOS', 'NOTÍCIAS', 'VÍDEOS', 'FOTOS', 'MATRÍCULA', 'TRANSPARÊNCIA', 'CONTATO'];
const TOP_LABELS = ['SOBRE', 'DIRETORIA', 'PATROCINADORES', 'TROFÉUS', 'ENQUETES'];
const FOOTER_LABELS = ['Acessibilidade', 'Política de Cookies', 'Política de Privacidade', 'Termos de Uso', 'Contato'];
const KNOWN_ROLES = ['Aux Técnico', 'Coordenador', 'Técnico'];

function cleanText(value = '') {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (/[ÃÂ�]/.test(normalized)) {
    return Buffer.from(normalized, 'latin1').toString('utf8').replace(/\s+/g, ' ').trim();
  }
  return normalized;
}

function toAbsolute(url = '') {
  if (!url) return SITE_URL;
  return url.startsWith('http') ? url : new URL(url, SITE_URL).toString();
}

async function fetchPage(path) {
  const response = await fetch(toAbsolute(path), { headers: HEADERS });
  if (!response.ok) throw new Error(`Falha ao buscar ${path}: ${response.status}`);
  const buffer = await response.arrayBuffer();
  const html = new TextDecoder('utf-8').decode(buffer);
  return cheerio.load(html);
}

function uniqueLinks(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = `${item.label}|${item.url}`;
    if (!item.label || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function extractNamedLinks($, labels) {
  return uniqueLinks(
    $('a')
      .map((_, anchor) => ({
        label: cleanText($(anchor).text()),
        url: toAbsolute($(anchor).attr('href')),
      }))
      .get()
      .filter((item) => labels.includes(item.label)),
  );
}

function extractSocialLinks($) {
  return $('a')
    .map((_, anchor) => ({
      label: cleanText($(anchor).text()) || toAbsolute($(anchor).attr('href')),
      url: toAbsolute($(anchor).attr('href')),
    }))
    .get()
    .filter((item) => /instagram|youtube|facebook/i.test(item.url));
}

function extractCardLinks($, matcher) {
  return $('a')
    .map((_, anchor) => ({
      url: toAbsolute($(anchor).attr('href')),
      text: cleanText($(anchor).text()),
    }))
    .get()
    .filter((item) => matcher.test(item.url) && item.text);
}

function splitBoardMember(raw) {
  const label = cleanText(raw);
  const role = KNOWN_ROLES.find((candidate) => label.endsWith(candidate)) ?? '';
  return {
    name: role ? cleanText(label.slice(0, -role.length)) : label,
    role: role || 'Diretoria',
  };
}

function parseFieldItem(raw) {
  const label = cleanText(raw);
  const separator = label.match(/\bRua\b/i)?.index ?? label.length;
  return {
    name: cleanText(label.slice(0, separator)),
    address: separator < label.length ? cleanText(label.slice(separator)) : '',
  };
}

function parseRankingItem(raw, index) {
  const label = cleanText(raw);
  const match = label.match(/^(?:(\d+)º\s+)?(.+?)\s+(Goleiro|Fixo|Ala|Pivô|Atleta)\s+(\d+)\s+(\d+)$/i);
  if (!match) {
    return {
      position: index + 1,
      athlete: label,
      role: 'Atleta',
      matches: null,
      goals: null,
    };
  }

  return {
    position: Number(match[1] ?? index + 1),
    athlete: cleanText(match[2]),
    role: cleanText(match[3]),
    matches: Number(match[4]),
    goals: Number(match[5]),
  };
}

function parseGameCard(raw) {
  const label = cleanText(raw);
  const dateMatch = label.match(/(\w{3},\s+\d{2}\/\d{2}\/\d{4})/i);
  const timeMatch = label.match(/(\d{2}:\d{2})/);
  return {
    raw: label,
    tag: label.split(' ')[0] || 'Jogo',
    dateLabel: dateMatch?.[1] ?? '',
    timeLabel: timeMatch?.[1] ?? '',
  };
}

function parseChampionshipCard(raw) {
  const label = cleanText(raw);
  const status = label.startsWith('Em andamento') ? 'Em andamento' : 'Cadastro';
  return { raw: label, status };
}

function parseStatBlocks($) {
  const lines = $.text().split('\n').map(cleanText).filter(Boolean);
  const statsIndex = lines.indexOf('Estatísticas');
  if (statsIndex === -1) return [];
  const pairs = [];

  for (let i = statsIndex + 1; i < lines.length; i += 2) {
    const label = lines[i];
    const value = lines[i + 1];
    if (!label || !value || label === 'Últimos Jogos que Participou') break;
    pairs.push({ label, value });
  }

  return pairs;
}

function parsePlayerDetail($, url) {
  const breadcrumb = $('a[href*="/atletas/"]').map((_, anchor) => cleanText($(anchor).text())).get();
  const title = cleanText($('h1').first().text()) || breadcrumb.at(-1) || 'Atleta';
  const pageText = $.text().split('\n').map(cleanText).filter(Boolean);
  const ageLine = pageText.find((line) => line.startsWith('Idade:'));
  const seasonLine = pageText.find((line) => line.startsWith('Temporada:'));

  return {
    name: title,
    url,
    image: toAbsolute($('img').filter((_, image) => cleanText($(image).attr('alt')) === title).first().attr('src') ?? ''),
    age: ageLine ? cleanText(ageLine.replace('Idade:', '')) : '',
    season: seasonLine ? cleanText(seasonLine.replace('Temporada:', '')) : '',
    stats: parseStatBlocks($),
  };
}

async function runPool(items, limit, worker) {
  const queue = [...items];
  const results = [];
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (queue.length) {
      const current = queue.shift();
      results.push(await worker(current));
    }
  });
  await Promise.all(runners);
  return results;
}

const home = await fetchPage('/');
const athletesPage = await fetchPage('/atletas/modalidade/2/categoria/1');
const gamesPage = await fetchPage('/jogos');
const championshipsPage = await fetchPage('/campeonatos');
const rankingPage = await fetchPage('/ranking');
const aboutPage = await fetchPage('/sobre');
const boardPage = await fetchPage('/diretoria');
const sponsorsPage = await fetchPage('/patrocinadores');
const trophiesPage = await fetchPage('/trofeus');
const fieldsPage = await fetchPage('/campos');
const transparencyPage = await fetchPage('/transparencia');
const newsPage = await fetchPage('/noticias');
const videosPage = await fetchPage('/videos');
const photosPage = await fetchPage('/fotos');
const contactPage = await fetchPage('/contato');
const searchPage = await fetchPage('/pesquisar');

const categoryLinks = athletesPage('a')
  .map((_, anchor) => ({
    label: cleanText(athletesPage(anchor).text()),
    url: toAbsolute(athletesPage(anchor).attr('href')),
  }))
  .get()
  .filter((item) => /\/atletas\/modalidade\/2\/categoria\//.test(item.url));

const categoryPages = await runPool(uniqueLinks(categoryLinks), 4, async (categoryLink) => {
  const page = await fetchPage(categoryLink.url);
  const playerLinks = uniqueLinks(
    page('a')
      .map((_, anchor) => ({
        label: cleanText(page(anchor).text()),
        url: toAbsolute(page(anchor).attr('href')),
      }))
      .get()
      .filter((item) => /\/atletas\/\d+$/.test(item.url)),
  );

  return {
    ...categoryLink,
    players: playerLinks,
  };
});

const uniquePlayers = uniqueLinks(categoryPages.flatMap((category) => category.players));
const playerDetails = await runPool(uniquePlayers, 6, async (player) => {
  const detailPage = await fetchPage(player.url);
  return parsePlayerDetail(detailPage, player.url);
});

const playerMap = new Map(playerDetails.map((player) => [player.url, player]));

const clubSiteData = {
  syncedAt: new Date().toISOString(),
  source: SITE_URL,
  topLinks: extractNamedLinks(home, TOP_LABELS),
  mainLinks: extractNamedLinks(home, MAIN_LABELS),
  footerLinks: extractNamedLinks(home, FOOTER_LABELS),
  socialLinks: extractSocialLinks(home),
  creator: { label: 'jfut.club', url: 'https://jfut.club' },
  home: {
    heading: 'AD Suzano TV',
    intro: 'Confira os lances das partidas, entrevistas exclusivas, tudo o que rola nos bastidores e muito mais.',
    videos: extractCardLinks(home, /\/videos\/\d+$/).map((item) => ({
      title: item.text,
      url: item.url,
    })),
    photos: extractCardLinks(home, /\/fotos\/\d+$/).map((item) => ({
      title: item.text,
      url: item.url,
    })),
    sponsorImages: sponsorsPage('img')
      .map((_, image) => ({
        name: cleanText(sponsorsPage(image).attr('alt')),
        image: toAbsolute(sponsorsPage(image).attr('src')),
      }))
      .get()
      .filter((item) => item.name && item.name !== 'AD Suzano'),
  },
  about: {
    name: cleanText(aboutPage('h1').first().text()) || 'AD Suzano',
    tagline: cleanText(aboutPage.text()).includes('escolinha') ? 'escolinha' : '',
    phone: cleanText(aboutPage.text()).match(/11\d{9}/)?.[0] ?? '',
    cnpj: cleanText(aboutPage.text()).match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/)?.[0] ?? '',
  },
  board: {
    members: boardPage('a')
      .map((_, anchor) => cleanText(boardPage(anchor).text()))
      .get()
      .filter((label) => KNOWN_ROLES.some((role) => label.endsWith(role)))
      .map(splitBoardMember),
  },
  sponsors: {
    items: sponsorsPage('img')
      .map((_, image) => ({
        name: cleanText(sponsorsPage(image).attr('alt')),
        image: toAbsolute(sponsorsPage(image).attr('src')),
      }))
      .get()
      .filter((item) => item.name && item.name !== 'AD Suzano'),
    external: uniqueLinks(
      sponsorsPage('a')
        .map((_, anchor) => ({
          label: cleanText(sponsorsPage(anchor).text()) || new URL(toAbsolute(sponsorsPage(anchor).attr('href'))).hostname,
          url: toAbsolute(sponsorsPage(anchor).attr('href')),
        }))
        .get()
        .filter((item) => !item.url.includes('adsuzano.com.br') && !item.url.includes('instagram') && !item.url.includes('facebook') && !item.url.includes('youtube')),
    ),
  },
  trophies: {
    emptyText: cleanText(trophiesPage.text()).includes('Nenhum troféu cadastrado.') ? 'Nenhum troféu cadastrado.' : '',
  },
  fields: {
    items: extractCardLinks(fieldsPage, /\/campos$/).map((item) => parseFieldItem(item.text)),
  },
  transparency: {
    emptyText: cleanText(transparencyPage.text()).includes('Nenhum documento disponível.') ? 'Nenhum documento disponível.' : '',
  },
  search: {
    placeholder: 'Buscar',
  },
  contact: {
    title: 'Contato',
    fields: ['Nome Completo', 'E-mail', 'WhatsApp', 'Sua Mensagem'],
    buttonLabel: 'Enviar Mensagem',
  },
  registration: {
    title: 'Matrícula',
    url: 'https://adsuzano.com.br/pre/matricula',
  },
  news: {
    emptyText: cleanText(newsPage.text()).includes('Nenhuma notícia publicada ainda.') ? 'Nenhuma notícia publicada ainda.' : '',
  },
  videos: {
    items: extractCardLinks(videosPage, /\/videos\/\d+$/).map((item) => ({
      title: item.text,
      url: item.url,
    })),
  },
  photos: {
    items: extractCardLinks(photosPage, /\/fotos\/\d+$/).map((item) => ({
      title: item.text,
      url: item.url,
    })),
  },
  athletes: {
    modality: 'Futsal',
    categories: categoryPages.map((category) => ({
      label: category.label,
      url: category.url,
      players: category.players.map((player) => ({
        name: player.label,
        url: player.url,
        detail: playerMap.get(player.url) ?? null,
      })),
    })),
  },
  games: {
    items: extractCardLinks(gamesPage, /\/jogos\/\d+$/).map((item) => ({
      ...parseGameCard(item.text),
      url: item.url,
    })),
  },
  championships: {
    items: extractCardLinks(championshipsPage, /\/campeonatos\/\d+$/).map((item) => ({
      ...parseChampionshipCard(item.text),
      url: item.url,
    })),
  },
  ranking: {
    topScorers: extractCardLinks(rankingPage, /\/atletas\/\d+$/).map((item, index) => ({
      ...parseRankingItem(item.text, index),
      url: item.url,
    })),
  },
  contentPlan: [
    { area: 'Jogos, campeonatos e ranking', mode: 'API/automação', details: 'Pode continuar vindo do robô FPFS e do espelho do site institucional.' },
    { area: 'Atletas e estatísticas individuais', mode: 'API/automação', details: 'Base pode ser sincronizada por scraping do site atual e depois migrada para API própria.' },
    { area: 'Sobre, diretoria e campos', mode: 'Input manual', details: 'Conteúdo institucional muda pouco e vale controlar por painel manual.' },
    { area: 'Patrocinadores', mode: 'Híbrido', details: 'Cadastro manual com logos e links, com opção futura de upload em CMS.' },
    { area: 'Vídeos e fotos', mode: 'Híbrido', details: 'Pode puxar links automaticamente, mas capa, ordem e destaque devem ter curadoria manual.' },
    { area: 'Contato, matrícula e transparência', mode: 'Manual + integração', details: 'Formulários e documentos precisam fluxo operacional próprio, não só scraping.' },
  ],
};

const fileContent = `// Arquivo gerado por scripts/sync-club-site.mjs.\n// Fonte: ${SITE_URL}\nexport const clubSiteData = ${JSON.stringify(clubSiteData, null, 2)};\n`;

await writeFile(new URL('../src/data/clubSite.js', import.meta.url), fileContent);
console.log(`Site institucional sincronizado: ${clubSiteData.athletes.categories.length} categorias e ${playerDetails.length} atletas.`);
