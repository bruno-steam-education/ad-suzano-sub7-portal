import { readdir, readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const distDir = fileURLToPath(new URL('../dist/', import.meta.url));
const forbiddenClaims = [
  'Chance de ser campeão',
  'Chance de subir para a A1',
  'Chance AD Suzano',
  '4 acessos da A2',
  'Base inicial montada com a tabela pública',
  'Probabilidade de vitória',
];

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectFiles(path);
    return ['.html', '.js', '.css'].includes(extname(entry.name)) ? [path] : [];
  }));
  return files.flat();
}

const files = await collectFiles(distDir);
const violations = [];

for (const file of files) {
  const content = await readFile(file, 'utf8');
  for (const claim of forbiddenClaims) {
    if (content.toLocaleLowerCase('pt-BR').includes(claim.toLocaleLowerCase('pt-BR'))) {
      violations.push(`${claim} em ${file}`);
    }
  }
}

if (violations.length) {
  console.error('Auditoria editorial reprovada:');
  violations.forEach((violation) => console.error(`- ${violation}`));
  process.exit(1);
}

console.log(`Auditoria editorial aprovada em ${files.length} arquivos publicados.`);
