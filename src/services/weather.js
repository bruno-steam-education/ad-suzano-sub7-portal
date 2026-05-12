const SUZANO_WEATHER_URL =
  'https://api.open-meteo.com/v1/forecast?latitude=-23.5425&longitude=-46.3108&current=temperature_2m,apparent_temperature,weather_code&timezone=America%2FSao_Paulo';

const weatherLabels = {
  0: 'Ceu limpo',
  1: 'Predominio de sol',
  2: 'Parcialmente nublado',
  3: 'Nublado',
  45: 'Neblina',
  48: 'Neblina com geada',
  51: 'Garoa leve',
  53: 'Garoa moderada',
  55: 'Garoa forte',
  61: 'Chuva fraca',
  63: 'Chuva moderada',
  65: 'Chuva forte',
  80: 'Pancadas leves',
  81: 'Pancadas moderadas',
  82: 'Pancadas fortes',
  95: 'Trovoadas',
};

export async function fetchSuzanoWeather() {
  const response = await fetch(SUZANO_WEATHER_URL);
  if (!response.ok) {
    throw new Error('Clima indisponivel');
  }

  const data = await response.json();
  const current = data.current ?? {};

  return {
    temperature: Math.round(current.temperature_2m),
    apparent: Math.round(current.apparent_temperature),
    label: weatherLabels[current.weather_code] ?? 'Tempo atualizado',
    observedAt: current.time,
  };
}
