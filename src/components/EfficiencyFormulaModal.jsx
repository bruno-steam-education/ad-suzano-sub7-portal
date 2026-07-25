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

  <h2>1. Situação Real na Tabela</h2>
  <table>
    ${rows([
      ['Posição no grupo', `${data.categoryPosition}º de ${data.categoryTotalTeams} equipes`],
      ['Pontos', `${data.categoryPoints} pts em ${data.categoryPlayed} jogos`],
      ['Saldo de gols', `${data.categoryGoalDiff >= 0 ? '+' : ''}${data.categoryGoalDiff}`],
      ['Jogos restantes', `${data.categoryRemainingGames} jogos (${data.categoryRemainingPoints} pts em disputa)`],
      ['Líder do grupo', `${data.leaderTeam ?? '—'} com ${data.leaderPoints} pts`],
    ])}
  </table>

  <h2>2. Chance de Título do Grupo</h2>
  <div class="formula-box">gapRatio = pontos_atrás_do_líder / pontos_ainda_em_disputa
           = ${data.pointsBehindLeader} / ${data.categoryRemainingPoints}
           = ${data.categoryRemainingPoints > 0 ? (data.pointsBehindLeader / data.categoryRemainingPoints).toFixed(3) : '—'}

chance = (1 − gapRatio) × 55%, limitada entre 1% e 55%
        (55% quando já é líder, 0% quando é matematicamente impossível)

chance de título do ${data.categoryLabel} = ${data.chanceDeCampeao}%</div>
  <p class="note">A chance é 0% quando o total de pontos possíveis do time (pontos atuais + pontos em disputa) fica abaixo dos pontos do líder — ou seja, mesmo vencendo tudo, não alcança.</p>

  <h2>3. Metas de Pontos (Mínimo / Ideal / Perfeito)</h2>
  <table>
    ${rows([
      ['Linha de segurança do grupo', `${data.safetyTeamName ?? '—'} com ${data.safetyLinePoints ?? '—'} pts (equipe logo acima da zona de risco)`],
      ['Mínimo (própria tabela)', `+${data.ownGroupPointsNeededMinimo ?? 0} pts para igualar a linha de segurança`],
      ['Cota coletiva (Art. 135º)', `+${data.categoryCollectiveMinimo ?? 0} pts (ver seção 4)`],
      ['MÍNIMO FINAL', `+${data.pointsNeededMinimo} pts = MAIOR valor entre os dois acima`],
      ['Meio de tabela', `${data.midTeamName ?? '—'} com ${data.midTablePoints ?? '—'} pts`],
      ['Ideal', `+${data.pointsNeededIdeal ?? 0} pts para alcançar o meio de tabela`],
      ['Perfeito', `+${data.pointsNeededPerfeito ?? 0} pts para alcançar o líder e brigar pelo título`],
    ])}
  </table>

  <h2>4. Risco de Queda e Cota Coletiva (Art. 135º)</h2>
  <p class="note">O Art. 135º do RGC define que o acesso/descenso é do <strong>clube</strong> (soma de todas as 8 categorias de Iniciação/Base), não de uma categoria isolada — "se uma categoria cair, caem todas". Por isso, mesmo categorias bem posicionadas na própria tabela têm uma cota mínima real para ajudar o clube.</p>
  <div class="formula-box">Referencial de segurança do clube =
  soma das linhas de segurança REAIS das 8 categorias
  = ${data.clubSafetyBenchmarkPoints} pts

Quanto falta no clube = max(0, ${data.clubSafetyBenchmarkPoints} − ${data.clubPoints}) = ${data.clubShortfallToSafety} pts

Cota do ${data.categoryLabel} = quanto_falta_no_clube × (jogos_restantes_categoria / jogos_restantes_clube)
                  = ${data.clubShortfallToSafety} × (${data.categoryRemainingGames} / ${data.clubRemainingGames})
                  = ${data.categoryCollectiveMinimo} pts

(quando o clube já bate o referencial agregado, a cota vira "manter o próprio ritmo atual"
nos jogos restantes, para não puxar o índice do clube para baixo)</div>
  <table>
    ${rows([
      ['Risco de queda calculado', `${data.chanceDeQueda ?? '—'}% (0% se já muito seguro, 100% se matematicamente impossível escapar)`],
    ])}
  </table>

  <h2>5. Índice de Eficiência do Clube (8 categorias)</h2>
  <div class="formula-box">índice = pontos_do_clube / (jogos_disputados_do_clube × 3) × 100
        = ${data.clubPoints} / (${data.clubPlayed} × 3) × 100
        = ${data.clubEfficiencyPercent}%</div>
  <table>
    ${rows([
      ['Pontos do clube', `${data.clubPoints} pts`],
      ['Jogos disputados', `${data.clubPlayed} jogos`],
      ['Jogos restantes', `${data.clubRemainingGames} jogos (${data.clubRemainingPoints} pts em disputa)`],
      ['Contribuição desta categoria', `${data.categoryShareOfClubPoints}% dos pontos do clube`],
    ])}
  </table>

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
          <section>
            <h4>1. Chance de Título do Grupo</h4>
            <pre className="formula-code">{`gapRatio = pts_atrás_do_líder / pts_em_disputa
         = ${data.pointsBehindLeader} / ${data.categoryRemainingPoints}
         = ${data.categoryRemainingPoints > 0 ? (data.pointsBehindLeader / data.categoryRemainingPoints).toFixed(3) : '—'}

chance = (1 − gapRatio) × 55%  →  ${data.chanceDeCampeao}%`}</pre>
          </section>

          <section>
            <h4>2. Mínimo / Ideal / Perfeito</h4>
            <pre className="formula-code">{`Linha de segurança do grupo: ${data.safetyTeamName ?? '—'} (${data.safetyLinePoints ?? '—'} pts)
Mínimo na própria tabela:    +${data.ownGroupPointsNeededMinimo ?? 0} pts
Cota coletiva (Art. 135º):   +${data.categoryCollectiveMinimo ?? 0} pts
MÍNIMO FINAL = maior dos dois = +${data.pointsNeededMinimo} pts

Meio de tabela: ${data.midTeamName ?? '—'} (${data.midTablePoints ?? '—'} pts) → Ideal +${data.pointsNeededIdeal ?? 0} pts
Líder: ${data.leaderTeam ?? '—'} (${data.leaderPoints ?? '—'} pts) → Perfeito +${data.pointsNeededPerfeito ?? 0} pts`}</pre>
          </section>

          <section>
            <h4>3. Cota Coletiva do Clube (Art. 135º)</h4>
            <pre className="formula-code">{`Referencial de segurança do clube = soma das linhas de segurança das 8 categorias
  = ${data.clubSafetyBenchmarkPoints} pts
Falta no clube = max(0, ${data.clubSafetyBenchmarkPoints} − ${data.clubPoints}) = ${data.clubShortfallToSafety} pts

Cota do ${data.categoryLabel} = ${data.clubShortfallToSafety} × (${data.categoryRemainingGames} / ${data.clubRemainingGames})
                = ${data.categoryCollectiveMinimo} pts`}</pre>
            <p className="formula-note">
              Art. 135º: o acesso/descenso é do clube inteiro (soma das 8 categorias de Iniciação/Base),
              não de uma categoria isolada — por isso toda categoria tem uma cota real de ajuda, mesmo
              as que já estão bem posicionadas na própria tabela.
            </p>
          </section>

          <section>
            <h4>4. Índice do Clube</h4>
            <pre className="formula-code">{`índice = pontos_clube / (jogos_disputados × 3) × 100
       = ${data.clubPoints} / (${data.clubPlayed} × 3) × 100
       = ${data.clubEfficiencyPercent}%`}</pre>
          </section>
        </div>

        <div className="formula-modal-footer">
          <button type="button" className="formula-download-btn" onClick={() => downloadFormulaPdf(data)}>
            <Download size={16} /> Baixar PDF
          </button>
        </div>
      </div>
    </div>
  );
}
