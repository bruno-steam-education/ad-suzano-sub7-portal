export async function loadYoutubeMetadata(url) {
  const endpoint = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`;
  const response = await fetch(endpoint);
  if (!response.ok) {
    throw new Error('Metadados do YouTube indisponiveis');
  }
  return response.json();
}
