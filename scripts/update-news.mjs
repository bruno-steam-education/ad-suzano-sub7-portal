import { XMLParser } from 'fast-xml-parser';
import { writeFile } from 'node:fs/promises';

const feeds = [
  {
    category: 'AD Suzano',
    url: 'https://news.google.com/rss/search?q=%22AD%20Suzano%22%20futsal&hl=pt-BR&gl=BR&ceid=BR:pt-419',
  },
  {
    category: 'Campeonato',
    url: 'https://news.google.com/rss/search?q=%22Campeonato%20Paulista%22%20%22Sub-7%22%20futsal&hl=pt-BR&gl=BR&ceid=BR:pt-419',
  },
  {
    category: 'FPFS',
    url: 'https://news.google.com/rss/search?q=%22Federa%C3%A7%C3%A3o%20Paulista%20de%20Futsal%22%20A2&hl=pt-BR&gl=BR&ceid=BR:pt-419',
  },
  {
    category: 'Suzano',
    url: 'https://news.google.com/rss/search?q=Suzano%20futsal%20base&hl=pt-BR&gl=BR&ceid=BR:pt-419',
  },
];

const evergreen = [
  {
    title: 'AD Suzano segue com foco no Paulista A2 Sub-7',
    category: 'Boletim',
    source: 'Boletim do portal',
    url: null,
    summary:
      'A rotina da semana combina leitura de tabela, desempenho recente e preparacao para os proximos confrontos do Sub-7.',
    impact: 'Mantem a comissao com um resumo objetivo mesmo quando ha pouca cobertura externa.',
  },
  {
    title: 'Analise por adversarios em comum segue no radar',
    category: 'Analise',
    source: 'Boletim do portal',
    url: null,
    summary:
      'Resultados indiretos ajudam a estimar vantagem competitiva quando equipes ainda nao se enfrentaram diretamente.',
    impact: 'Serve de base para as chances exibidas nos proximos jogos.',
  },
  {
    title: 'Videos do YouTube podem enriquecer a leitura individual',
    category: 'Atletas',
    source: 'Boletim do portal',
    url: null,
    summary:
      'Quando links forem cadastrados por atleta, o portal pode cruzar metadados e observacoes tecnicas para montar uma linha de evolucao.',
    impact: 'Ajuda pais e comissao a acompanhar desenvolvimento sem depender apenas do placar.',
  },
  {
    title: 'Calendario oficial segue como fonte principal de rodada',
    category: 'FPFS',
    source: 'Tabela FPFS',
    url: 'https://eventos.admfutsal.com.br/evento/900/jogos',
    summary:
      'A tabela publica da FPFS continua sendo a referencia para datas, horarios, ginasios e resultados do Paulista Sub-7 A2.',
    impact: 'Reduz risco de informacao desencontrada no planejamento da semana.',
  },
  {
    title: 'Clima e data passam a aparecer em tempo real no portal',
    category: 'Plataforma',
    source: 'Boletim do portal',
    url: null,
    summary:
      'O topo do site exibe a data de hoje, temperatura e sensacao termica de Suzano quando a API de clima esta disponivel.',
    impact: 'Torna o portal mais vivo para uso diario por pais, atletas e comissao.',
  },
  {
    title: 'Proximos jogos continuam priorizados na leitura da semana',
    category: 'Pre-jogo',
    source: 'Boletim do portal',
    url: null,
    summary:
      'O bloco de confrontos usa resultados recentes, mando de quadra e adversarios em comum para contextualizar a chance de vitoria.',
    impact: 'Ajuda a transformar placares soltos em uma leitura competitiva mais clara.',
  },
  {
    title: 'Sequencia recente orienta foco de treino',
    category: 'Treino',
    source: 'Boletim do portal',
    url: null,
    summary:
      'A analise semanal destaca pontos de atencao como saida de bola, segundo pau, recomposicao e comportamento em bola parada.',
    impact: 'Aproxima o portal do trabalho real de quadra.',
  },
  {
    title: 'Historico do Sub-7 ganha leitura visual consolidada',
    category: 'Campanha',
    source: 'Boletim do portal',
    url: null,
    summary:
      'Resultados, empates, derrotas e proximos jogos aparecem em uma linha de campanha simples para leitura rapida.',
    impact: 'Facilita acompanhar a evolucao sem abrir a tabela oficial toda vez.',
  },
  {
    title: 'Atletas seguem com acompanhamento individual preparado',
    category: 'Atletas',
    source: 'Boletim do portal',
    url: null,
    summary:
      'A area individual permite registrar indicadores, observacoes tecnicas e futuramente cruzar videos cadastrados por jogador.',
    impact: 'Valoriza desenvolvimento, disciplina e confianca alem dos gols.',
  },
  {
    title: 'Radar semanal separa fonte externa de analise propria',
    category: 'Noticias',
    source: 'Boletim do portal',
    url: null,
    summary:
      'Quando a noticia vem de site externo, o portal mostra a fonte; quando e leitura interna, o item aparece como boletim.',
    impact: 'Da mais transparencia sobre o que e cobertura jornalistica e o que e analise do projeto.',
  },
];

const parser = new XMLParser({
  ignoreAttributes: false,
  removeNSPrefix: true,
});

function stripHtml(value = '') {
  return repairEncoding(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function repairEncoding(value = '') {
  if (!/[ÃÂ]/.test(value)) return value;

  return Buffer.from(value, 'latin1').toString('utf8');
}

function normalizeItem(item, category) {
  const source = typeof item.source === 'object' ? item.source['#text'] : item.source;
  const published = item.pubDate ? new Date(item.pubDate) : new Date();
  const title = stripHtml(item.title);
  const summary = stripHtml(item.description).slice(0, 230);

  return {
    title,
    category,
    date: Number.isNaN(published.getTime()) ? todayKey() : published.toISOString().slice(0, 10),
    source: source || 'Google News',
    url: item.link || null,
    summary: summary || `Noticia relacionada a ${title}.`,
    impact: impactFor(category),
  };
}

function isFreshEnough(item) {
  const published = new Date(`${item.date}T12:00:00-03:00`);
  if (Number.isNaN(published.getTime())) return false;

  const today = new Date();
  const ageDays = (today.getTime() - published.getTime()) / 86_400_000;
  return ageDays <= 270;
}

function impactFor(category) {
  const impacts = {
    'AD Suzano': 'Pode influenciar a narrativa da semana e o acompanhamento da base.',
    Campeonato: 'Ajuda a entender o contexto competitivo do Paulista A2.',
    FPFS: 'Fonte util para conferencia de rodada, regulamento e calendario.',
    Suzano: 'Reforca o contexto regional em torno do clube e da cidade.',
  };

  return impacts[category] ?? 'Item monitorado para compor o radar semanal.';
}

function todayKey() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function weekMondayKey() {
  const now = new Date();
  const saoPauloDate = new Date(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now),
  );
  const day = saoPauloDate.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  saoPauloDate.setDate(saoPauloDate.getDate() + diff);
  return saoPauloDate.toISOString().slice(0, 10);
}

async function fetchFeed(feed) {
  const response = await fetch(feed.url, {
    headers: {
      'User-Agent': 'AD-Suzano-News-Bot/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`Falha ao buscar ${feed.category}: ${response.status}`);
  }

  const xml = await response.text();
  const parsed = parser.parse(xml);
  const items = parsed?.rss?.channel?.item ?? [];
  return (Array.isArray(items) ? items : [items]).map((item) => normalizeItem(item, feed.category));
}

const fetchedByFeed = (
  await Promise.allSettled(feeds.map((feed) => fetchFeed(feed)))
).flatMap((result) => {
  if (result.status !== 'fulfilled') return [];
  return result.value
    .filter(isFreshEnough)
    .slice(0, 3);
});

const seen = new Set();
const news = [...fetchedByFeed, ...evergreen.map((item) => ({ ...item, date: todayKey() }))]
  .filter((item) => {
    const key = `${item.title}-${item.url ?? ''}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  })
  .slice(0, 10)
  .map((item, index) => ({
    id: `auto-${todayKey()}-${index + 1}`,
    ...item,
  }));

const content = `export const newsWeek = '${weekMondayKey()}';

export const newsItems = ${JSON.stringify(news, null, 2)};
`;

await writeFile(new URL('../src/data/news.js', import.meta.url), content);
console.log(`Atualizadas ${news.length} noticias para ${weekMondayKey()}.`);
