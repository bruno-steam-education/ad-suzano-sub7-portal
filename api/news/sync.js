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

const FALLBACKS = {
  'https://suzano.sp.gov.br/ginasio-municipal-de-esportes-professor-roberto-david-passa-por-revitalizacao/': {
    title: 'Ginásio Municipal de Esportes Professor Roberto David passa por revitalização',
    summary: 'Espaço localizado na região norte recebe melhorias na quadra, novas traves, redes, grades de proteção e pintura geral.',
    date: '2026-07-24',
    image: 'https://suzano.sp.gov.br/wp-content/uploads/2026/07/Quadra-do-Sesc-2-700x396.jpeg',
  },
  'https://suzano.sp.gov.br/prefeito-recebe-equipe-da-ad-suzano-bicampea-da-copa-condemat-de-futsal/': {
    title: 'Prefeito recebe equipe da AD Suzano bicampeã da Copa Condemat+ de Futsal',
    summary: 'Equipe sub-18 venceu a final em Arujá por 2 a 0 e levou mais uma taça para Suzano.',
    date: '2025-09-03',
    image: 'https://suzano.sp.gov.br/wp-content/uploads/2025/09/WhatsApp-Image-2025-09-03-at-17.45.04-700x396.jpeg',
  },
  'https://suzano.sp.gov.br/ginasio-do-sesc-recebe-jogos-de-torneio-de-futsal/': {
    title: 'Ginásio do Sesc recebe jogos de torneio de futsal',
    summary: 'O espaço sediou quatro partidas do Campeonato Metropolitano com participação das categorias de base da AD Suzano.',
    date: '2024-04-08',
    image: 'https://suzano.sp.gov.br/wp-content/uploads/2024/04/MS-4-scaled.jpg',
  },
};

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

function isBlockedTitle(title = '') {
  return /attention required|cloudflare|just a moment|access denied|captcha/i.test(title);
}

function imageProxyUrl(image) {
  return image ? `/api/news/sync?image=${encodeURIComponent(image)}` : '';
}

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
  if (isBlockedTitle(title) || !summary) throw new Error('Fonte protegida ou conteúdo incompleto');
  return { ...source, title, summary, image, imageProxy: imageProxyUrl(image), sourceImage: Boolean(image), date };
}

export default async function handler(request, response) {
  if (request.query?.image) {
    let imageUrl;
    try { imageUrl = new URL(request.query.image); } catch { return response.status(400).send('Imagem inválida'); }
    if (imageUrl.protocol !== 'https:' || imageUrl.hostname !== 'suzano.sp.gov.br' || !imageUrl.pathname.startsWith('/wp-content/uploads/')) {
      return response.status(403).send('Imagem não autorizada');
    }
    const imageResponse = await fetch(imageUrl, { headers: { 'user-agent': 'AD-Suzano-News-Radar/1.0' } });
    if (!imageResponse.ok) return response.status(imageResponse.status).send('Imagem indisponível');
    response.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800');
    response.setHeader('Content-Type', imageResponse.headers.get('content-type') || 'image/jpeg');
    return response.status(200).send(Buffer.from(await imageResponse.arrayBuffer()));
  }
  const results = await Promise.all(SOURCES.map(async (source) => {
    try { return await readSource(source); } catch (error) {
      const fallback = FALLBACKS[source.url];
      return fallback ? { ...source, ...fallback, imageProxy: imageProxyUrl(fallback.image), sourceImage: true, syncedFromFallback: true } : { ...source, error: error.message };
    }
  }));
  response.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');
  response.status(200).json({ updatedAt: new Date().toISOString(), items: results.filter((item) => item.title && !item.error) });
}
