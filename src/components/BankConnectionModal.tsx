import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Landmark, Shield, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { BankConnection } from '../types';

interface BankConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (bankName: string) => void;
  onDisconnect: (id: number) => void;
  bankConnections: BankConnection[];
  theme: 'light' | 'dark';
}

const BANKS = [
  { id: 'nubank', name: 'Nubank', color: 'bg-purple-600' },
  { id: 'inter', name: 'Banco Inter', color: 'bg-orange-500' },
  { id: 'itau', name: 'Itaú', color: 'bg-blue-600' },
  { id: 'bradesco', name: 'Bradesco', color: 'bg-red-600' },
  { id: 'santander', name: 'Santander', color: 'bg-red-700' },
  { id: 'bb', name: 'Banco do Brasil', color: 'bg-yellow-400' },
];

export default function BankConnectionModal({ isOpen, onClose, onConnect, onDisconnect, bankConnections, theme }: BankConnectionModalProps) {
  const [step, setStep] = React.useState<'select' | 'authorize' | 'connecting' | 'manage' | 'confirm_disconnect'>('select');
  const [selectedBank, setSelectedBank] = React.useState<typeof BANKS[0] | null>(null);
  const [bankToDisconnect, setBankToDisconnect] = React.useState<BankConnection | null>(null);

  const handleSelectBank = (bank: typeof BANKS[0]) => {
    setSelectedBank(bank);
    setStep('authorize');
  };

  const handleAuthorize = () => {
    setStep('connecting');
    setTimeout(() => {
      if (selectedBank) {
        onConnect(selectedBank.name);
      }
    }, 2000);
  };

  const openConfirmDisconnect = (bank: BankConnection) => {
    setBankToDisconnect(bank);
    setStep('confirm_disconnect');
  };

  const handleConfirmDisconnect = () => {
    if (bankToDisconnect) {
      onDisconnect(bankToDisconnect.id);
      setBankToDisconnect(null);
      if (bankConnections.length > 1) {
        setStep('manage');
      } else {
        onClose();
      }
    }
  };

  React.useEffect(() => {
    if (isOpen) {
      if (bankConnections.length > 0) {
        setStep('manage');
      } else {
        setStep('select');
      }
    } else {
      setStep('select');
      setSelectedBank(null);
      setBankToDisconnect(null);
    }
  }, [isOpen, bankConnections.length]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={cn(
              "relative w-full max-w-md rounded-[32px] p-8 shadow-2xl border",
              theme === 'dark' ? "bg-slate-950 border-slate-800" : "bg-white border-slate-100"
            )}
          >
            <button 
              onClick={onClose}
              className="absolute right-6 top-6 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
            >
              <X className="h-5 w-5 text-slate-400" />
            </button>

            <div className="text-center mb-8">
              <div className="mx-auto h-16 w-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 mb-4">
                <Landmark className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Conectar meu Banco</h2>
              <p className="text-sm text-slate-500 mt-2">Sincronize suas transações automaticamente com segurança.</p>
            </div>

            <div className="space-y-6">
              {step === 'manage' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    {bankConnections.map((conn) => {
                      const bankInfo = BANKS.find(b => b.name === conn.bank_name);
                      return (
                        <div 
                          key={conn.id}
                          className={cn(
                            "flex items-center justify-between p-4 rounded-2xl border",
                            theme === 'dark' ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-100"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold text-lg", bankInfo?.color || 'bg-slate-500')}>
                              {conn.bank_name[0]}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white">{conn.bank_name}</h4>
                                <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                              </div>
                              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Conectado</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => openConfirmDisconnect(conn)}
                            className="p-2 hover:bg-rose-500/10 rounded-xl text-rose-500 transition-all active:scale-90"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setStep('select')}
                    className="w-full py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
                  >
                    <Landmark className="h-4 w-4" />
                    Conectar outro banco
                  </button>
                </div>
              )}

              {step === 'confirm_disconnect' && bankToDisconnect && (
                <div className="text-center space-y-6 py-4">
                  <div className="mx-auto h-16 w-16 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center text-rose-600">
                    <X className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Desconectar Banco?</h3>
                    <p className="text-sm text-slate-500 mt-2">
                      Deseja realmente desconectar o <strong>{bankToDisconnect.bank_name}</strong>? 
                      As transações automáticas serão interrompidas.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleConfirmDisconnect}
                      className="flex-1 py-4 rounded-2xl bg-rose-600 text-white font-bold uppercase tracking-widest text-xs hover:bg-rose-500 transition-all"
                    >
                      Desconectar
                    </button>
                    <button
                      onClick={() => setStep('manage')}
                      className="flex-1 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-widest text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {step === 'select' && (
                <div className="grid grid-cols-2 gap-3">
                  {BANKS.map((bank) => (
                    <button
                      key={bank.id}
                      onClick={() => handleSelectBank(bank)}
                      className={cn(
                        "flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all hover:scale-[1.02] active:scale-95",
                        theme === 'dark' ? "bg-slate-900 border-slate-800 hover:border-emerald-500/50" : "bg-slate-50 border-slate-100 hover:border-emerald-500/50"
                      )}
                    >
                      <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold text-lg", bank.color)}>
                        {bank.name[0]}
                      </div>
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{bank.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {step === 'authorize' && selectedBank && (
                <div className="space-y-6">
                  <div className={cn(
                    "p-6 rounded-2xl border text-center",
                    theme === 'dark' ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-100"
                  )}>
                    <div className={cn("mx-auto h-12 w-12 rounded-xl flex items-center justify-center text-white font-bold text-xl mb-3", selectedBank.color)}>
                      {selectedBank.name[0]}
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white">{selectedBank.name}</h3>
                    <p className="text-xs text-slate-500 mt-1">Autorize o acesso aos seus dados bancários.</p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-slate-600 dark:text-slate-400">Importação automática de extrato e saldo.</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-slate-600 dark:text-slate-400">Sincronização de PIX recebidos e enviados.</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Shield className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-slate-600 dark:text-slate-400">Conexão segura. Não armazenamos sua senha.</p>
                    </div>
                  </div>

                  <button
                    onClick={handleAuthorize}
                    className="w-full py-4 rounded-2xl bg-emerald-600 text-white font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-600/20"
                  >
                    Autorizar Acesso
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              )}

              {step === 'connecting' && (
                <div className="py-12 text-center space-y-4">
                  <Loader2 className="h-12 w-12 text-emerald-600 animate-spin mx-auto" />
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">Conectando ao {selectedBank?.name}...</h3>
                    <p className="text-xs text-slate-500 mt-1">Isso pode levar alguns segundos.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                Segurança garantida por protocolos bancários
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
