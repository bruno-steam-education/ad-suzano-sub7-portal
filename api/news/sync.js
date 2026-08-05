const SOURCES = [
  {
    tag: 'Estrutura',
    source: 'Prefeitura de Suzano',
    url: 'https://suzano.sp.gov.br/ginasio-municipal-de-esportes-professor-roberto-david-passa-por-revitalizacao/',
  },
  {
    tag: 'AD Suzano',
    source: 'Prefeitura de Suzano',
    url: 'https://suzano.sp.gov.br/prefeito-recebe-equipe-da-ad-suzano-bicampea-da-copa-condemat-de-futsal/',
  },
  {
    tag: 'Base',
    source: 'Prefeitura de Suzano',
    url: 'https://suzano.sp.gov.br/ginasio-do-sesc-recebe-jogos-de-torneio-de-futsal/',
  },
];

function meta(html, key) {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${key}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${key}["']`, 'i'),
    new RegExp(`<meta[^>]+name=["']${key}["'][^>]+content=["']([^"']+)["']`, 'i'),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return '';
}

function markdownField(markdown, pattern) {
  return markdown.match(pattern)?.[1]?.trim() || '';
}

function firstImage(html, baseUrl) {
  const candidate = meta(html, 'og:image') || meta(html, 'twitter:image') || html.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] || '';
  if (!candidate) return '';
  try { return new URL(candidate, baseUrl).href; } catch { return ''; }
}

function clean(value = '') { return value.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(); }

async function readSource(source) {
  const readerUrl = `https://r.jina.ai/http://${source.url.replace(/^https?:\/\//, '')}`;
  const response = await fetch(readerUrl, { headers: { 'user-agent': 'AD-Suzano-News-Radar/1.0' } });
  if (!response.ok) throw new Error(`Fonte retornou ${response.status}`);
  const markdown = await response.text();
  const title = clean(markdownField(markdown, /^Title:\s*(.+)$/m));
  const summary = clean(markdownField(markdown, /^_(.+)_$/m));
  const image = markdownField(markdown, /!\[[^\]]*\]\((https?:\/\/[^)]+)\)/);
  const dateParts = markdown.match(/^(\d{2}\/\d{2}\/\d{4})$/m)?.[1]?.split('/');
  const date = dateParts ? `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}` : new Date().toISOString().slice(0, 10);
  return { ...source, title, summary, image, sourceImage: Boolean(image), date };
}

export default async function handler(request, response) {
  const results = await Promise.all(SOURCES.map(async (source) => {
    try { return await readSource(source); } catch (error) { return { ...source, error: error.message }; }
  }));
  response.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');
  response.status(200).json({ updatedAt: new Date().toISOString(), items: results.filter((item) => item.title && !item.error) });
}
