import React from 'react';
import { Lock, ShieldAlert, KeyRound } from 'lucide-react';

export function ProtectedSection({
  isAuthenticated,
  onOpenModal,
  title = 'Análise Tática Restrita',
  description = 'Esta seção contém projeções matemáticas, estatísticas pesadas do robô de inteligência e dados de eficiência reservados à Comissão Técnica da AD Suzano.',
  children,
}) {
  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <section className="panel protected-lock-card">
      <div className="protected-lock-content">
        <div className="protected-lock-badge">
          <Lock size={22} />
          <span>Área Protegida • Comissão Técnica</span>
        </div>

        <h3>{title}</h3>
        <p>{description}</p>

        <div className="protected-lock-features">
          <div>
            <ShieldAlert size={16} />
            <span>Probabilidades de Vitória & Robô IA</span>
          </div>
          <div>
            <ShieldAlert size={16} />
            <span>Projeções Agregadas de Título e Acesso</span>
          </div>
          <div>
            <ShieldAlert size={16} />
            <span>Metas da Cota Art. 135 RGC</span>
          </div>
        </div>

        <button className="protected-unlock-btn" type="button" onClick={onOpenModal}>
          <KeyRound size={18} />
          <span>Digitar Senha de Acesso</span>
        </button>
      </div>
    </section>
  );
}
