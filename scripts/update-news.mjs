import { XMLParser } from 'fast-xml-parser';
import { writeFile } from 'node:fs/promises';

const feeds = [
  {
    category: 'AD Suzano',
    url: 'https://news.google.com/rss/search?q=%22AD%20Suzano%22%20futsal&hl=pt-BR&gl=BR&ceid=BR:pt-419',
  },
  {
    category: 'AD Suzano',
    url: 'https://news.google.com/rss/search?q=%22A.D.%20Suzano%22%20futsal&hl=pt-BR&gl=BR&ceid=BR:pt-419',
  },
];

const evergreen = [
  {
    title: 'AD Suzano segue com foco no Paulista A2 Sub-7',
    category: 'Boletim',
    source: 'Boletim do portal',
    url: null,
    summary:
      'A rotina da semana combina leitura de tabela, desempenho recente e preparação para os próximos confrontos do Sub-7.',
    impact: 'Mantém a comissão com um resumo objetivo mesmo quando há pouca cobertura externa.',
  },
  {
    title: 'AD Suzano prepara semana com três treinos e jogo oficial',
    category: 'Agenda',
    source: 'Boletim do portal',
    url: null,
    summary:
      'A semana tem treino normal, trabalho específico para goleiros, acompanhamento psicológico e confronto contra o Ocian Praia Clube.',
    impact: 'Ajuda famílias e comissão a visualizarem a rotina completa do Sub-7.',
  },
  {
    title: 'Vitória sobre o Santo André fortalece a confiança do grupo',
    category: 'Campanha',
    source: 'Boletim do portal',
    url: null,
    summary:
      'O 7 x 3 fora de casa segue como referência positiva para a preparação da equipe antes da próxima rodada.',
    impact: 'Reforça a leitura de evolução ofensiva e confiança coletiva.',
  },
  {
    title: 'Confronto com o Ocian exige atenção à saída de bola',
    category: 'Pré-jogo',
    source: 'Tabela FPFS',
    url: 'https://eventos.admfutsal.com.br/evento/900/jogos',
    summary:
      'O próximo jogo oficial será no Ginásio do SESC - Suzano, contra o Ocian Praia Clube, no sábado, às 15h.',
    impact: 'O mando de quadra favorece rotina, apoio e organização pré-jogo.',
  },
  {
    title: 'AD Suzano mantém bom volume ofensivo no Sub-7',
    category: 'Análise',
    source: 'Boletim do portal',
    url: null,
    summary:
      'A equipe soma 31 gols nos jogos cadastrados, indicador importante para medir repertório e agressividade ofensiva.',
    impact: 'O ataque é um dos pilares da projeção semanal do portal.',
  },
  {
    title: 'Saldo positivo sustenta projeção competitiva do AD Suzano',
    category: 'Análise',
    source: 'Boletim do portal',
    url: null,
    summary:
      'O saldo de gols e a sequência recente ajudam a estimar a força do time dentro da campanha.',
    impact: 'A projeção de título será revisada conforme novos resultados entrarem.',
  },
  {
    title: 'Treino de goleiros ganha espaço próprio na agenda',
    category: 'Treino',
    source: 'Boletim do portal',
    url: null,
    summary:
      'A sexta-feira tem treino específico para goleiros antes do treino normal do grupo.',
    impact: 'A rotina destaca uma posição decisiva para controle emocional e início das jogadas.',
  },
  {
    title: 'Acompanhamento psicológico entra na rotina da semana',
    category: 'Formação',
    source: 'Boletim do portal',
    url: null,
    summary:
      'Na quarta-feira, após o treino, a equipe tem atividade com psicóloga no CIE.',
    impact: 'Mostra que a formação do Sub-7 vai além do desempenho técnico.',
  },
  {
    title: 'SESC Suzano volta a ser ponto central da rodada',
    category: 'Jogo',
    source: 'Boletim do portal',
    url: null,
    summary:
      'O jogo oficial do sábado será no Ginásio do SESC - Suzano, casa importante para a rotina competitiva do AD Suzano.',
    impact: 'A familiaridade com o ambiente pode ajudar concentração e preparação.',
  },
  {
    title: 'AD Suzano usa dados para transformar placares em leitura de jogo',
    category: 'Dados',
    source: 'Boletim do portal',
    url: null,
    summary:
      'O portal cruza resultados, próximos confrontos, mando de quadra e sequência recente para explicar probabilidades.',
    impact: 'A leitura semanal fica mais clara para comissão, famílias e atletas.',
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
  };

  return impacts[category] ?? 'Item monitorado para compor o radar semanal.';
}

function isAboutAdSuzano(item) {
  const haystack = `${item.title} ${item.summary} ${item.source}`.toLowerCase();
  return haystack.includes('ad suzano') || haystack.includes('a.d. suzano');
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
    .filter(isAboutAdSuzano)
    .filter(isFreshEnough)
    .slice(0, 5);
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
console.log(`Atualizadas ${news.length} notícias do AD Suzano para ${weekMondayKey()}.`);
