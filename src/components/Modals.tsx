import React, { useState } from 'react';
import { X, Trash2, Edit2, TrendingUp, TrendingDown, Lightbulb, ShieldCheck, PiggyBank, AlertCircle, Settings, RefreshCw, Info, Wallet } from 'lucide-react';
import { Transaction, Category } from '../types';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'light' | 'dark';
  children: React.ReactNode;
  title: string;
}

const Modal = ({ isOpen, onClose, theme, children, title }: ModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center p-0 sm:p-4">
      <div 
        className={`w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 shadow-2xl animate-in slide-in-from-bottom-full duration-300 flex flex-col max-h-[90vh] ${
          theme === 'dark' ? 'bg-slate-950 text-slate-100 border-t border-slate-800 sm:border' : 'bg-white text-slate-900'
        }`}
      >
        <div className="mb-6 flex items-center justify-between flex-shrink-0">
          <h3 className="text-xl font-bold tracking-tight">{title}</h3>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="overflow-y-auto pr-1 scrollbar-hide flex-grow overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  );
};

interface AllTransactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  categories: Category[];
  onDelete: (id: number) => void;
  onEdit: (tx: Transaction) => void;
  theme: 'light' | 'dark';
}

export const AllTransactionsModal = ({ isOpen, onClose, transactions, categories, onDelete, onEdit, theme }: AllTransactionsModalProps) => {
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <Modal isOpen={isOpen} onClose={onClose} theme={theme} title="Todas as Transações">
      <div className="space-y-2 pb-4">
        {transactions.map((tx) => (
          <div key={tx.id} className="group relative flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800/50 last:border-0">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div 
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${tx.category_color}15`, color: tx.category_color }}
              >
                {tx.type === 'income' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold truncate leading-tight text-slate-800 dark:text-slate-200">{tx.description || 'Sem descrição'}</p>
                <p className="text-[9px] text-slate-500 dark:text-slate-400 uppercase font-bold mt-0.5">
                  {tx.category_name} • {format(parseISO(tx.date), 'dd/MM/yy')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 ml-3">
              <p className={`text-xs font-black whitespace-nowrap ${tx.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                {tx.type === 'income' ? '+' : '-'} {formatCurrency(tx.amount)}
              </p>
              <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => onEdit(tx)}
                  className="p-1 text-slate-400 hover:text-emerald-500 transition-all"
                >
                  <Edit2 className="h-3 w-3" />
                </button>
                <button 
                  onClick={() => {
                    if (window.confirm('Deseja realmente excluir esta transação?')) {
                      onDelete(tx.id);
                    }
                  }}
                  className="p-1 text-slate-400 hover:text-rose-500 transition-all"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {transactions.length === 0 && (
          <div className="py-20 text-center">
            <p className="text-slate-400 font-medium">Nenhuma transação registrada.</p>
          </div>
        )}
      </div>
    </Modal>
  );
};

interface TipsModalProps {
  isOpen: boolean;
  onClose: () => void;
  balance: number;
  theme: 'light' | 'dark';
}

export const TipsModal = ({ isOpen, onClose, balance, theme }: TipsModalProps) => {
  const isPositive = balance >= 0;

  const tips = isPositive ? [
    {
      title: "Reserva de Emergência",
      desc: "Garanta que sua reserva cubra 6 meses de gastos.",
      icon: ShieldCheck,
      color: "text-emerald-500"
    },
    {
      title: "Renda Fixa",
      desc: "CDBs ou Tesouro Selic para render acima da inflação.",
      icon: TrendingUp,
      color: "text-blue-500"
    },
    {
      title: "Diversificação",
      desc: "Estude FIIs ou ações para diversificar.",
      icon: Wallet,
      color: "text-purple-500"
    }
  ] : [
    {
      title: "Mapeie seus Gastos",
      desc: "Identifique para onde cada centavo está indo.",
      icon: AlertCircle,
      color: "text-rose-500"
    },
    {
      title: "Corte o Supérfluo",
      desc: "Reduza gastos com delivery e assinaturas.",
      icon: TrendingDown,
      color: "text-amber-500"
    },
    {
      title: "Negocie Dívidas",
      desc: "Tente trocar por uma dívida mais barata.",
      icon: Lightbulb,
      color: "text-orange-500"
    }
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} theme={theme} title={isPositive ? "Dicas" : "Dicas"}>
        <div className="space-y-6">
          {tips.map((tip, i) => (
            <div key={i} className="flex items-start gap-4">
              <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-900 ${tip.color}`}>
                <tip.icon className="h-5 w-5" />
              </div>
              <div className="pt-0.5">
                <h4 className="text-xs font-black uppercase tracking-wider">{tip.title}</h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{tip.desc}</p>
              </div>
            </div>
          ))}
        </div>
    </Modal>
  );
};

export const AlertIcon3D = ({ className }: { className?: string }) => (
  <div className={`relative ${className}`}>
    <div className="absolute inset-0 bg-amber-500 rounded-full blur-[8px] opacity-40 animate-pulse"></div>
    <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 via-amber-500 to-amber-700 shadow-[0_4px_10px_rgba(0,0,0,0.3),inset_0_2px_4px_rgba(255,255,255,0.4)]">
      <div className="absolute inset-[2px] rounded-full bg-gradient-to-tl from-transparent to-white/20"></div>
      <span className="text-xl font-black text-white drop-shadow-md">!</span>
    </div>
  </div>
);

export const WalletIcon3D = ({ className }: { className?: string }) => (
  <div className={`relative ${className}`}>
    <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 border border-white/20">
      <Wallet className="h-5 w-5 text-white" />
    </div>
  </div>
);

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  theme: 'light' | 'dark';
}

export const UpdateModal = ({ isOpen, onClose, onUpdate, theme }: UpdateModalProps) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} theme={theme} title="Nova Atualização">
      <div className="flex flex-col items-center text-center space-y-6 py-4">
        <div className="relative">
          <div className="absolute inset-0 bg-emerald-500 rounded-full blur-2xl opacity-20 animate-pulse"></div>
          <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-xl rotate-12">
            <RefreshCw className="h-10 w-10 text-white animate-[spin_3s_linear_infinite]" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h4 className="text-lg font-bold">Versão 2.1.0 Disponível</h4>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Uma nova versão do MeuFinanceiro está pronta! Incluímos melhorias na importação de extratos e correções visuais.
          </p>
        </div>

        <div className="flex flex-col w-full gap-3">
          <button 
            onClick={onUpdate}
            className="w-full rounded-2xl bg-emerald-600 py-4 font-bold text-white shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20 transition-all active:scale-95"
          >
            Baixar e Atualizar Agora
          </button>
          <button 
            onClick={onClose}
            className="w-full rounded-2xl bg-slate-100 dark:bg-slate-800 py-4 font-bold text-slate-500 dark:text-slate-400 transition-all active:scale-95"
          >
            Manter Versão Atual
          </button>
        </div>
      </div>
    </Modal>
  );
};
interface EditTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  categories: Category[];
  onSave: (id: number, tx: Partial<Transaction>) => void;
  theme: 'light' | 'dark';
}

export const EditTransactionModal = ({ isOpen, onClose, transaction, categories, onSave, theme }: EditTransactionModalProps) => {
  const [formData, setFormData] = useState<any>(null);

  React.useEffect(() => {
    if (transaction) {
      setFormData({
        amount: transaction.amount.toString(),
        date: transaction.date,
        category_id: transaction.category_id.toString(),
        description: transaction.description || '',
        type: transaction.type,
        payment_method: transaction.payment_method || '',
        source: transaction.source || '',
      });
    }
  }, [transaction]);

  if (!formData) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (transaction) {
      onSave(transaction.id, {
        ...formData,
        amount: parseFloat(formData.amount),
      });
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} theme={theme} title="Editar Transação">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Valor</label>
          <input 
            type="number" 
            step="0.01"
            value={formData.amount}
            onChange={e => setFormData({ ...formData, amount: e.target.value })}
            className="mt-1 w-full rounded-2xl bg-slate-50 dark:bg-slate-800 py-3 px-4 font-bold outline-none ring-emerald-500 focus:ring-2"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Data</label>
            <input 
              type="date" 
              value={formData.date}
              onChange={e => setFormData({ ...formData, date: e.target.value })}
              className="mt-1 w-full rounded-2xl bg-slate-50 dark:bg-slate-800 py-3 px-4 text-sm outline-none ring-emerald-500 focus:ring-2"
              required
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Categoria</label>
            <select 
              value={formData.category_id}
              onChange={e => setFormData({ ...formData, category_id: e.target.value })}
              className="mt-1 w-full rounded-2xl bg-slate-50 dark:bg-slate-800 py-3 px-4 text-sm outline-none ring-emerald-500 focus:ring-2 appearance-none"
              required
            >
              {categories.filter(c => c.type === formData.type).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {formData.type === 'income' ? 'Origem' : 'Método de Pagamento'}
          </label>
          <select 
            value={formData.type === 'income' ? formData.source : formData.payment_method}
            onChange={e => setFormData({ 
              ...formData, 
              [formData.type === 'income' ? 'source' : 'payment_method']: e.target.value 
            })}
            className="mt-1 w-full rounded-2xl bg-slate-50 dark:bg-slate-800 py-3 px-4 text-sm outline-none ring-emerald-500 focus:ring-2 appearance-none"
            required
          >
            <option value="Pix">Pix</option>
            <option value="Cartão de Crédito">Cartão de Crédito</option>
            <option value="Dinheiro">Dinheiro</option>
            <option value="Outro">Outro</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Descrição</label>
          <input 
            type="text" 
            value={formData.description}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
            className="mt-1 w-full rounded-2xl bg-slate-50 dark:bg-slate-800 py-3 px-4 text-sm outline-none ring-emerald-500 focus:ring-2"
          />
        </div>
        <button 
          type="submit"
          className="w-full rounded-2xl bg-emerald-600 py-4 font-bold text-white shadow-lg transition-all active:scale-95 mt-4"
        >
          Salvar Alterações
        </button>
      </form>
    </Modal>
  );
};
