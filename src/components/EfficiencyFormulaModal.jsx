import React from 'react';
import { Download, X } from 'lucide-react';

function buildPrintableHtml(data) {
  const rows = (pairs) => pairs.map(([label, value]) => `
    <tr><td>${label}</td><td><strong>${value}</strong></td></tr>
  `).join('');

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Memória de Cálculo — ${data.categoryLabel} — Ranking de Eficiência FPFS</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; padding: 32px; max-width: 780px; margin: 0 auto; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  h2 { font-size: 15px; margin-top: 28px; margin-bottom: 8px; border-bottom: 2px solid #09275c; padding-bottom: 4px; color: #09275c; }
  .subtitle { color: #64748b; font-size: 13px; margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
  td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-size: 13px; vertical-align: top; }
  td:first-child { color: #475569; width: 60%; }
  .formula-box { background: #f1f5f9; border-left: 4px solid #09275c; padding: 10px 12px; margin: 10px 0; font-size: 13px; font-family: "Courier New", monospace; white-space: pre-wrap; }
  .note { font-size: 12px; color: #64748b; line-height: 1.5; margin-top: 6px; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; }
  @media print { body { padding: 12px; } }
</style>
</head>
<body>
  <h1>Memória de Cálculo — Ranking de Eficiência Anual (Art. 135º FPFS)</h1>
  <div class="subtitle">${data.categoryTitle} · Gerado em ${new Date().toLocaleDateString('pt-BR')} a partir da tabela oficial FPFS (Súmula Online)</div>

  <p class="note"><strong>Importante:</strong> o Art. 135º define que o acesso/descenso é do CLUBE inteiro
  (soma das 8 categorias de Iniciação/Base), nunca de uma categoria isolada. Por isso a % de risco e de
  acesso abaixo é a mesma em qualquer categoria — o que muda por categoria é apenas a cota de pontos que
  ela precisa contribuir.</p>

  <h2>1. Situação Real do ${data.categoryLabel} na Tabela</h2>
  <table>
    ${rows([
      ['Posição no grupo', `${data.categoryPosition}º de ${data.categoryTotalTeams} equipes`],
      ['Pontos', `${data.categoryPoints} pts em ${data.categoryPlayed} jogos`],
      ['Saldo de gols', `${data.categoryGoalDiff >= 0 ? '+' : ''}${data.categoryGoalDiff}`],
      ['Jogos restantes', `${data.categoryRemainingGames} jogos (${data.categoryRemainingPoints} pts em disputa)`],
      ['Líder do grupo', `${data.leaderTeam ?? '—'} com ${data.leaderPoints} pts`],
      ['Linha de segurança do grupo', `${data.safetyTeamName ?? '—'} com ${data.safetyLinePoints ?? '—'} pts`],
    ])}
  </table>

  <h2>2. Situação Única do Clube (Art. 135º)</h2>
  <div class="formula-box">Referencial de segurança do clube = soma das linhas de segurança das 8 categorias
  = ${data.clubSafetyBenchmarkPoints} pts
Falta no clube = max(0, ${data.clubSafetyBenchmarkPoints} − ${data.clubPoints}) = ${data.clubShortfallToSafety} pts

Referencial de acesso do clube = soma dos pontos dos líderes das 8 categorias
  = ${data.clubTitleBenchmarkPoints} pts
Falta no clube = max(0, ${data.clubTitleBenchmarkPoints} − ${data.clubPoints}) = ${data.clubShortfallToTitle} pts

RISCO DE QUEDA DO CLUBE = ${data.chanceDeQueda}%
CHANCE DE ACESSO DO CLUBE = ${data.chanceDeCampeao}%</div>
  <table>
    ${rows([
      ['Pontos do clube', `${data.clubPoints} pts`],
      ['Jogos disputados (clube)', `${data.clubPlayed} jogos`],
      ['Jogos restantes (clube)', `${data.clubRemainingGames} jogos (${data.clubRemainingPoints} pts em disputa)`],
      ['Índice de aproveitamento', `${data.clubEfficiencyPercent}%`],
    ])}
  </table>

  <h2>3. Cota de Contribuição do ${data.categoryLabel}</h2>
  <div class="formula-box">Cota do ${data.categoryLabel} = MIN( pontos_possíveis_na_categoria , falta_no_clube × (jogos_restantes_categoria / jogos_restantes_clube) )
  pontos_possíveis_na_categoria = ${data.categoryRemainingGames} jogos × 3 = ${data.categoryRemainingPoints} pts (teto real — não dá pra passar disso)

Mínimo   = MIN(${data.categoryRemainingPoints}, ${data.clubShortfallToSafety} × ${data.categoryRemainingGames}/${data.clubRemainingGames}) = ${data.pointsNeededMinimo} pts
Ideal    = MIN(${data.categoryRemainingPoints}, ${data.clubShortfallToIdeal} × ${data.categoryRemainingGames}/${data.clubRemainingGames}) = ${data.pointsNeededIdeal} pts
Perfeito = MIN(${data.categoryRemainingPoints}, ${data.clubShortfallToTitle} × ${data.categoryRemainingGames}/${data.clubRemainingGames}) = ${data.pointsNeededPerfeito} pts</div>
  <p class="note">
    Quando o clube já bate o referencial agregado de segurança (falta = 0), a cota mínima passa a ser
    "sustentar o próprio ritmo atual (pts por jogo)" nos jogos restantes, para que a categoria não puxe o
    índice do clube para baixo. Nenhuma cota nunca passa do teto real (jogos restantes × 3 pts).
    ${data.isClubTitleMathLocked ? `<br/><strong>Acesso matematicamente fora de alcance:</strong> mesmo toda categoria fazendo o máximo possível, o clube não chega aos ${data.clubTitleBenchmarkPoints} pts necessários (máximo possível do clube: ${data.clubPoints + data.clubRemainingPoints} pts). O "Perfeito" aqui é só o teto real desta categoria, não uma meta alcançável para o título.` : ''}
  </p>

  <div class="footer">
    Fonte dos dados: FPFS Súmula Online (eventos.admfutsal.com.br), temporada 2026, Paulista A2.
    Cálculos são estimativas transparentes do site do AD Suzano, não probabilidades estatísticas oficiais da FPFS.
    A classificação combinada oficial entre clubes (que decide o Art. 135º) não é publicada publicamente pela FPFS.
  </div>
</body>
</html>`;
}

export function downloadFormulaPdf(data) {
  const printWindow = window.open('', '_blank', 'width=900,height=1000');
  if (!printWindow) return;
  printWindow.document.open();
  printWindow.document.write(buildPrintableHtml(data));
  printWindow.document.close();
  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };
}

export function EfficiencyFormulaModal({ data, onClose }) {
  return (
    <div className="formula-modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="formula-modal" onClick={(e) => e.stopPropagation()}>
        <div className="formula-modal-header">
          <strong>Memória de Cálculo — {data.categoryLabel}</strong>
          <button type="button" className="formula-modal-close" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        <div className="formula-modal-body">
          <p className="formula-note">
            O Art. 135º trata o clube como uma unidade só — por isso a % de risco/acesso abaixo é a
            mesma em qualquer categoria. O que muda por categoria é a cota de pontos a contribuir.
          </p>

          <section>
            <h4>1. Situação Única do Clube</h4>
            <pre className="formula-code">{`Referencial de segurança (soma das 8 categorias) = ${data.clubSafetyBenchmarkPoints} pts
Falta no clube = max(0, ${data.clubSafetyBenchmarkPoints} − ${data.clubPoints}) = ${data.clubShortfallToSafety} pts
RISCO DE QUEDA DO CLUBE = ${data.chanceDeQueda}%

Referencial de acesso (soma dos líderes) = ${data.clubTitleBenchmarkPoints} pts
Falta no clube = max(0, ${data.clubTitleBenchmarkPoints} − ${data.clubPoints}) = ${data.clubShortfallToTitle} pts
CHANCE DE ACESSO DO CLUBE = ${data.chanceDeCampeao}%`}</pre>
          </section>

          <section>
            <h4>2. Cota de Contribuição do {data.categoryLabel}</h4>
            <pre className="formula-code">{`Cota = MIN(teto_real, falta_no_clube × jogos_restantes_categoria / jogos_restantes_clube)
teto_real = ${data.categoryRemainingGames} jogos × 3 = ${data.categoryRemainingPoints} pts

Mínimo   = MIN(${data.categoryRemainingPoints}, ${data.clubShortfallToSafety} × ${data.categoryRemainingGames}/${data.clubRemainingGames}) = ${data.pointsNeededMinimo} pts
Ideal    = MIN(${data.categoryRemainingPoints}, ${data.clubShortfallToIdeal} × ${data.categoryRemainingGames}/${data.clubRemainingGames}) = ${data.pointsNeededIdeal} pts
Perfeito = MIN(${data.categoryRemainingPoints}, ${data.clubShortfallToTitle} × ${data.categoryRemainingGames}/${data.clubRemainingGames}) = ${data.pointsNeededPerfeito} pts`}</pre>
            {data.isClubTitleMathLocked && (
              <p className="formula-note">
                Acesso matematicamente fora de alcance para o clube: mesmo todas as categorias no
                máximo, o clube não chega aos {data.clubTitleBenchmarkPoints} pts necessários (máximo
                possível: {data.clubPoints + data.clubRemainingPoints} pts). "Perfeito" aqui é o teto
                real desta categoria, não uma meta alcançável de título.
              </p>
            )}
          </section>

          <section>
            <h4>3. Índice do Clube</h4>
            <pre className="formula-code">{`índice = pontos_clube / (jogos_disputados × 3) × 100
       = ${data.clubPoints} / (${data.clubPlayed} × 3) × 100
       = ${data.clubEfficiencyPercent}%`}</pre>
          </section>
        </div>

        <div className="formula-modal-footer">
          <button type="button" className="formula-download-btn" onClick={() => downloadFormulaPdf(data)}>
            <Download size={16} /> Imprimir / salvar em PDF
          </button>
        </div>
      </div>
    </div>
  );
}
