import React, { useState } from 'react';
import { Lock, KeyRound, X, AlertCircle, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const DEFAULT_STAFF_PASSWORD = 'Ad001';

export function AccessModal({ isOpen, onClose, onSuccess }) {
  const [inputPassword, setInputPassword] = useState('');
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputPassword.trim() === DEFAULT_STAFF_PASSWORD) {
      setError(false);
      setInputPassword('');
      onSuccess();
    } else {
      setError(true);
    }
  };

  return (
    <AnimatePresence>
      <div className="access-modal-overlay" onClick={onClose}>
        <motion.div
          className="access-modal-card"
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.2 }}
        >
          <button className="access-modal-close" onClick={onClose} type="button" aria-label="Fechar modal">
            <X size={20} />
          </button>

          <div className="access-modal-header">
            <div className="access-modal-icon">
              <Lock size={28} />
            </div>
            <h3>Área da Comissão Técnica</h3>
            <p>Digite a senha de acesso para liberar a Inteligência de Jogo e Projeções Táticas da AD Suzano.</p>
          </div>

          <form onSubmit={handleSubmit} className="access-modal-form">
            <div className="access-input-wrapper">
              <KeyRound size={18} className="input-icon" />
              <input
                type="password"
                placeholder="Senha de acesso"
                value={inputPassword}
                onChange={(e) => {
                  setInputPassword(e.target.value);
                  if (error) setError(false);
                }}
                autoFocus
                className={error ? 'input-error' : ''}
              />
            </div>

            {error && (
              <motion.div
                className="access-error-badge"
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <AlertCircle size={14} />
                <span>Senha incorreta. Tente novamente.</span>
              </motion.div>
            )}

            <button type="submit" className="access-submit-btn">
              <ShieldCheck size={18} />
              <span>Desbloquear Painel Tático</span>
            </button>
          </form>

          <div className="access-modal-footer">
            <small>Uso exclusivo da Comissão Técnica e Análise da AD Suzano.</small>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
