import fs from 'node:fs/promises';

const SHEET_CSV_URL = process.env.GOOGLE_SHEET_CSV_URL;
const OUTPUT = new URL('../src/data/athleteRoster.js', import.meta.url);
const ORDER = ['Sub-7', 'Sub-8', 'Sub-9', 'Sub-10', 'Sub-12', 'Sub-14', 'Sub-16', 'Sub-18'];

function normalize(value = '') {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && quoted && next === '"') { cell += '"'; index += 1; continue; }
    if (char === '"') { quoted = !quoted; continue; }
    if (char === ',' && !quoted) { row.push(cell.trim()); cell = ''; continue; }
    if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = []; cell = ''; continue;
    }
    cell += char;
  }
  if (cell || row.length) { row.push(cell.trim()); rows.push(row); }
  return rows;
}

const response = await fetch(SHEET_CSV_URL, { headers: { 'User-Agent': 'AD-Suzano-Roster-Bot/1.0' } });
if (!response.ok) throw new Error(`Planilha indisponível para o robô (${response.status}). Publique a aba como CSV ou configure GOOGLE_SHEET_CSV_URL.`);
const rows = parseCsv(await response.text());
const existingText = await fs.readFile(OUTPUT, 'utf8');
const existing = JSON.parse(existingText.split('export const athleteRoster = ', 2)[1].replace(/;\s*$/, ''));
const idsByName = new Map(existing.categories.flatMap((category) => category.players).map((player) => [normalize(player.name), player.url.split('/').pop()]));
const categories = new Map(ORDER.map((label) => [label, []]));
if (!SHEET_CSV_URL) throw new Error('Configure GOOGLE_SHEET_CSV_URL com uma aba pública sanitizada contendo somente nome, categoria e treinador.');
const header = rows[0].map((value) => normalize(value));
const nameColumn = header.findIndex((value) => value.includes('NOME COMPLETO DO ATLETA') || value === 'NOME');
const categoryColumn = header.findIndex((value) => value.includes('CATEGORIA') || value === 'CATEGORIA');
if (nameColumn < 0 || categoryColumn < 0) throw new Error('CSV da planilha precisa conter colunas Nome e Categoria.');
let active = true;
for (const row of rows.slice(1)) {
  const name = String(row[nameColumn] || '').trim();
  const rawCategory = String(row[categoryColumn] || '').trim();
  if (rawCategory.toUpperCase() === 'DESISTENTES') { active = false; continue; }
  if (!active || !name || !rawCategory) continue;
  const categoryMatch = rawCategory.match(/Sub\s*0?(\d+)/i);
  if (!categoryMatch) continue;
  const category = `Sub-${Number(categoryMatch[1])}`;
  if (!categories.has(category)) continue;
  const id = idsByName.get(normalize(name)) || `sheet-${normalize(name).toLowerCase().replace(/\s+/g, '-')}`;
  categories.get(category).push({
    name,
    url: `https://adsuzano.com.br/atletas/${id}`,
    detail: { name, url: `https://adsuzano.com.br/atletas/${id}`, image: '', age: '', season: '2026', stats: [] },
  });
}
const athleteRoster = {
  ...existing,
  syncedAt: new Date().toISOString(),
  categories: ORDER.map((label) => ({ label, players: categories.get(label) })),
};
await fs.writeFile(OUTPUT, `// Arquivo gerado a partir da planilha de cadastro online.\nexport const athleteRoster = ${JSON.stringify(athleteRoster, null, 2)};\n`, 'utf8');
console.log(`Elenco sincronizado: ${ORDER.reduce((total, label) => total + categories.get(label).length, 0)} atletas ativos.`);
