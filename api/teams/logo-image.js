export default async function handler(request, response) {
  const source = request.query?.url;
  if (!source || !/^https?:\/\/admfutsal\.com\.br\//i.test(source)) return response.status(400).send('Imagem não autorizada.');
  const image = await fetch(source);
  if (!image.ok) return response.status(image.status).send('Imagem indisponível.');
  response.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800');
  response.setHeader('Content-Type', image.headers.get('content-type') || 'image/png');
  response.status(200).send(Buffer.from(await image.arrayBuffer()));
}
