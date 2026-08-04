import React from 'react';
import { Lock, ShieldAlert, KeyRound } from 'lucide-react';

export function ProtectedSection({
  isAuthenticated,
  onOpenModal,
  title = 'Análise Tática Restrita',
  description = 'Esta seção contém análises verificadas e dados oficiais reservados à Comissão Técnica da AD Suzano.',
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
            <span>Agenda e Contexto Oficial Pré-Jogo</span>
          </div>
          <div>
            <ShieldAlert size={16} />
            <span>Situação Regulamentar Verificada</span>
          </div>
          <div>
            <ShieldAlert size={16} />
            <span>Auditoria de Dados e Art. 135 RGC</span>
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
