const EVENT_URLS = [896, 897, 898, 899, 900, 901, 902, 903].map((id) => `https://eventos.admfutsal.com.br/evento/${id}`);

function clean(value = '') { return value.replace(/\s+/g, ' ').trim(); }
function normalize(value = '') { return clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }

async function readEvent(url) {
  const response = await fetch(url, { headers: { 'user-agent': 'AD-Suzano-Team-Logo-Robot/1.0' } });
  if (!response.ok) throw new Error(`Fonte retornou ${response.status}`);
  const html = await response.text();
  const matches = [...html.matchAll(/<img[^>]+src=["']([^"']*escudo[^"']+)["'][^>]+alt=["']([^"']+)["']/gi)];
  return matches.map((match) => ({ name: clean(match[2]), key: normalize(match[2]), image: match[1] }));
}

export default async function handler(_request, response) {
  const lists = await Promise.all(EVENT_URLS.map((url) => readEvent(url).catch(() => [])));
  const logos = new Map();
  lists.flat().forEach((item) => { if (!logos.has(item.key)) logos.set(item.key, item); });
  response.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
  response.status(200).json({ updatedAt: new Date().toISOString(), logos: [...logos.values()] });
}
