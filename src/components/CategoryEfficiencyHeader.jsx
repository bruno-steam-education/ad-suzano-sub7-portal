import React from 'react';
import { BookOpen, ExternalLink, Info, ShieldCheck, Trophy } from 'lucide-react';
import { fpfsCategories } from '../data/fpfsCategories';

const RGC_2026_URL = 'https://www.federacaopaulistadefutsal.com.br/novo/wp-content/uploads/2026/02/001_2026-RGC-REGULAMENTO-GERAL-DE-COMPETICOES-2026-2.pdf';
const INITIATION = ['Sub-7', 'Sub-8', 'Sub-9', 'Sub-10'];
const BASE = ['Sub-12', 'Sub-14', 'Sub-16', 'Sub-18'];

function isSuzano(team = '') {
  return String(team).toUpperCase().includes('SUZANO');
}

function formatCheckedAt(value) {
  if (!value) return 'sem horário registrado';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(value));
}

export function CategoryEfficiencyHeader({ category }) {
  const fpfsData = fpfsCategories.find((item) => item.category === category.label);
  const standing = fpfsData?.standings?.find((item) => isSuzano(item.team));
  const groupCategories = INITIATION.includes(category.label) ? INITIATION : BASE;
  const groupLabel = INITIATION.includes(category.label) ? 'Iniciação A2' : 'Base Masculina A2';

  return (
    <section className="panel efficiency-header-card verified-regulation-card" aria-label="Situação regulamentar FPFS">
      <div className="efficiency-top-banner">
        <div className="efficiency-badge-group">
          <span className="efficiency-league-badge">
            <BookOpen size={15} /> RGC FPFS 2026
          </span>
          <span className="efficiency-rule-chip">Arts. 34, 35 e 135</span>
        </div>
        <div className="efficiency-club-rank">
          <span>Última consulta automática à FPFS</span>
          <strong>{formatCheckedAt(fpfsData?.checkedAt)}</strong>
          <small>Atualização programada a cada 3 horas</small>
        </div>
      </div>

      <div className="verified-regulation-heading">
        <div>
          <span>Leitura sem estimativas</span>
          <h2>Situação regulamentar verificada</h2>
        </div>
        <ShieldCheck size={26} />
      </div>

      <div className="verified-regulation-grid">
        <article>
          <span>Categoria selecionada</span>
          <strong>{category.label}</strong>
          <p>{standing ? `${standing.positionLabel ?? `${standing.position}º`} lugar, ${standing.points} pontos em ${standing.played} jogos.` : 'Posição ainda não localizada na tabela oficial.'}</p>
        </article>
        <article>
          <span>Grupo regulamentar</span>
          <strong>{groupLabel}</strong>
          <p>{groupCategories.join(', ')}. O clube participa com o grupo de categorias, conforme os Arts. 34 e 35.</p>
        </article>
        <article>
          <span>Regra de acesso</span>
          <strong>2 vagas da A2 para a A1</strong>
          <p>O Art. 135 determina acesso pelo Ranking de Eficiência Anual do clube, não pela posição isolada de um Sub.</p>
        </article>
      </div>

      <div className="verified-regulation-warning">
        <Info size={20} />
        <div>
          <strong>Percentual de acesso e risco: não calculável com segurança</strong>
          <p>
            A tabela desta categoria não equivale ao Ranking de Eficiência Anual. Enquanto a classificação anual
            oficial e sua memória completa não estiverem disponíveis na fonte consultada, o portal não publicará
            “chance de acesso”, “risco de queda” nem cotas próprias inventadas.
          </p>
        </div>
      </div>

      <div className="verified-source-links">
        <a href={RGC_2026_URL} target="_blank" rel="noreferrer">
          <BookOpen size={16} /> Regulamento Geral FPFS 2026 <ExternalLink size={14} />
        </a>
        {fpfsData?.url ? (
          <a href={fpfsData.url} target="_blank" rel="noreferrer">
            <Trophy size={16} /> Classificação oficial {category.label} <ExternalLink size={14} />
          </a>
        ) : null}
      </div>
    </section>
  );
}
