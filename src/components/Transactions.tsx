import React, { useState } from 'react';
import { Plus, Trash2, ArrowUpCircle, ArrowDownCircle, Calendar, CreditCard, Tag, FileText, Edit2, Check, MoreVertical, AlertCircle, ChevronRight } from 'lucide-react';
import { Transaction, Category, TransactionType } from '../types';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, eachMonthOfInterval, subMonths, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface TransactionsProps {
  type: TransactionType;
  transactions: Transaction[];
  categories: Category[];
  onAdd: (tx: Partial<Transaction>) => void;
  onDelete: (id: number) => void;
  onDeleteMultiple: (ids: number[]) => void;
  onEdit: (tx: Transaction) => void;
}

export default function Transactions({ type, transactions, categories, onAdd, onDelete, onDeleteMultiple, onEdit, theme }: TransactionsProps & { theme: 'light' | 'dark' }) {
  const [showForm, setShowForm] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<'single' | 'multiple' | 'all' | null>(null);
  const [targetId, setTargetId] = useState<number | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [isMonthSelectorOpen, setIsMonthSelectorOpen] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    category_id: '',
    description: '',
    payment_method: 'Pix',
    source: '',
  });

  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);

  const filteredTransactions = transactions
    .filter(t => t.type === type)
    .filter(t => isWithinInterval(parseISO(t.date), { start: monthStart, end: monthEnd }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filteredCategories = categories.filter(c => c.type === type);

  const monthsList = eachMonthOfInterval({
    start: subMonths(new Date(), 11),
    end: new Date()
  }).reverse();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.category_id) return;

    // Handle decimal comma (common in Brazil)
    const normalizedAmount = formData.amount.replace(',', '.');
    const amountNum = parseFloat(normalizedAmount);
    
    if (isNaN(amountNum)) return;

    onAdd({
      ...formData,
      amount: amountNum,
      description: formData.description || (type === 'income' ? 'Receita' : 'Despesa'),
      type,
    });

    setFormData({
      amount: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      category_id: '',
      description: '',
      payment_method: 'Pix',
      source: '',
    });
    setShowForm(false);
  };

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const toggleSelection = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = () => {
    onDeleteMultiple(selectedIds);
    setSelectedIds([]);
    setShowDeleteConfirm(null);
    setSelectionMode(false);
  };

  const handleDeleteAll = () => {
    const allIds = filteredTransactions.map(t => t.id);
    onDeleteMultiple(allIds);
    setShowDeleteConfirm(null);
    setShowMenu(false);
  };

  const handleDeleteSingle = () => {
    if (targetId) {
      onDelete(targetId);
      setTargetId(null);
      setShowDeleteConfirm(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className={cn(
            "text-2xl font-bold tracking-tight",
            theme === 'light' ? "text-[#0a192f]" : "text-white"
          )}>
            {type === 'income' ? 'Minhas Receitas' : 'Meus Gastos'}
          </h2>
          
          <div className="relative">
            <button 
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
            >
              <MoreVertical className="h-5 w-5 text-slate-400" />
            </button>

            <AnimatePresence>
              {showMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowMenu(false)} 
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="absolute left-0 mt-2 w-48 rounded-2xl bg-white dark:bg-slate-900 shadow-xl border border-slate-100 dark:border-slate-800 z-20 overflow-hidden"
                  >
                    <button
                      onClick={() => {
                        setSelectionMode(!selectionMode);
                        setShowMenu(false);
                        if (selectionMode) setSelectedIds([]);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Check className="h-4 w-4" />
                      {selectionMode ? 'Cancelar Seleção' : 'Selecionar para Apagar'}
                    </button>
                    <button
                      onClick={() => {
                        setShowDeleteConfirm('all');
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                      Apagar Tudo
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <button 
              onClick={() => setIsMonthSelectorOpen(!isMonthSelectorOpen)}
              className="flex items-center justify-center h-10 w-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-500 hover:text-emerald-600 transition-all"
              title={format(selectedMonth, 'MMMM yyyy', { locale: ptBR })}
            >
              <Calendar className="h-5 w-5" />
            </button>

            <AnimatePresence>
              {isMonthSelectorOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsMonthSelectorOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-40 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden"
                  >
                    <div className="p-1 max-h-[200px] overflow-y-auto scrollbar-hide">
                      {monthsList.map((month) => {
                        const isSelected = isSameMonth(month, selectedMonth);
                        return (
                          <button
                            key={month.toISOString()}
                            onClick={() => {
                              setSelectedMonth(month);
                              setIsMonthSelectorOpen(false);
                            }}
                            className={cn(
                              "w-full flex items-center justify-between px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all",
                              isSelected 
                                ? "bg-emerald-600 text-white" 
                                : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400"
                            )}
                          >
                            {format(month, 'MMM yy', { locale: ptBR })}
                            {isSelected && <Check className="h-3 w-3" />}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {selectedIds.length > 0 && (
            <button 
              onClick={() => setShowDeleteConfirm('multiple')}
              className="flex items-center justify-center h-10 w-10 rounded-xl bg-rose-600 text-white animate-in zoom-in shadow-lg shadow-rose-200 dark:shadow-none relative"
              title={`Excluir ${selectedIds.length} itens`}
            >
              <Trash2 className="h-5 w-5" />
              <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold border-2 border-white dark:border-slate-900">
                {selectedIds.length}
              </span>
            </button>
          )}
          <button 
            onClick={() => setShowForm(!showForm)}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full text-white shadow-lg transition-transform",
              type === 'income' ? "bg-emerald-600 shadow-emerald-200 dark:shadow-emerald-900/20" : "bg-rose-600 shadow-rose-200 dark:shadow-rose-900/20",
              showForm ? "rotate-45" : "rotate-0"
            )}
          >
            <Plus className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteConfirm(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm rounded-[32px] bg-white dark:bg-slate-900 p-8 shadow-2xl border border-slate-100 dark:border-slate-800 text-center"
            >
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 dark:bg-rose-900/30 text-rose-600">
                <AlertCircle className="h-8 w-8" />
              </div>
              <h3 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">Você tem certeza?</h3>
              <p className="mb-8 text-sm font-medium text-slate-500 dark:text-slate-400">
                {showDeleteConfirm === 'all' 
                  ? 'Esta ação irá apagar TODAS as transações desta lista. Esta ação não pode ser desfeita.'
                  : showDeleteConfirm === 'multiple'
                  ? `Você está prestes a apagar ${selectedIds.length} transações selecionadas.`
                  : 'Esta transação será removida permanentemente.'}
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    if (showDeleteConfirm === 'all') handleDeleteAll();
                    else if (showDeleteConfirm === 'multiple') handleBulkDelete();
                    else handleDeleteSingle();
                  }}
                  className="w-full rounded-2xl bg-rose-600 py-4 text-sm font-bold uppercase tracking-widest text-white shadow-lg shadow-rose-200 dark:shadow-none hover:bg-rose-500 transition-colors"
                >
                  Continuar e Apagar
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="w-full rounded-2xl bg-slate-100 dark:bg-slate-800 py-4 text-sm font-bold uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {showForm && (
        <div className="rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-sm border border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-top-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Valor</label>
              <div className="relative mt-1">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">R$</span>
                <input 
                  type="number" 
                  step="0.01"
                  value={formData.amount}
                  onChange={e => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full rounded-2xl bg-slate-50 dark:bg-slate-800 py-3 pl-12 pr-4 font-bold outline-none ring-emerald-500 focus:ring-2 text-slate-900 dark:text-slate-100"
                  placeholder="0,00"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Data</label>
                <div className="relative mt-1">
                  <Calendar className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="date" 
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    className="w-full rounded-2xl bg-slate-50 dark:bg-slate-800 py-3 pl-10 pr-4 text-sm outline-none ring-emerald-500 focus:ring-2 text-slate-900 dark:text-slate-100"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Categoria</label>
                <div className="relative mt-1">
                  <Tag className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <select 
                    value={formData.category_id}
                    onChange={e => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full rounded-2xl bg-slate-50 dark:bg-slate-800 py-3 pl-10 pr-4 text-sm outline-none ring-emerald-500 focus:ring-2 text-slate-900 dark:text-slate-100 appearance-none"
                    required
                  >
                    <option value="">Selecionar</option>
                    {filteredCategories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Descrição (Opcional)</label>
              <div className="relative mt-1">
                <FileText className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-2xl bg-slate-50 dark:bg-slate-800 py-3 pl-10 pr-4 text-sm outline-none ring-emerald-500 focus:ring-2 text-slate-900 dark:text-slate-100"
                  placeholder="Ex: Almoço, Salário..."
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {type === 'income' ? 'Origem' : 'Método de Pagamento'}
              </label>
              <div className="relative mt-1">
                <CreditCard className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select 
                  value={type === 'income' ? formData.source : formData.payment_method}
                  onChange={e => setFormData({ 
                    ...formData, 
                    [type === 'income' ? 'source' : 'payment_method']: e.target.value 
                  })}
                  className="w-full rounded-2xl bg-slate-50 dark:bg-slate-800 py-3 pl-10 pr-4 text-sm outline-none ring-emerald-500 focus:ring-2 text-slate-900 dark:text-slate-100 appearance-none"
                  required
                >
                  <option value="Pix">Pix</option>
                  <option value="Cartão de Crédito">Cartão de Crédito</option>
                  <option value="Dinheiro">Dinheiro</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>
            </div>

            <button 
              type="submit"
              className={cn(
                "w-full rounded-2xl py-4 font-bold text-white shadow-lg transition-all active:scale-95",
                type === 'income' ? "bg-emerald-600 shadow-emerald-200" : "bg-rose-600 shadow-rose-200"
              )}
            >
              Salvar {type === 'income' ? 'Receita' : 'Despesa'}
            </button>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {filteredTransactions.map((tx) => (
          <div 
            key={tx.id} 
            onClick={() => selectionMode ? toggleSelection(tx.id) : null}
            className={cn(
              "group relative flex items-center justify-between rounded-2xl p-4 shadow-sm border transition-all",
              selectionMode ? "cursor-pointer" : "cursor-default",
              selectedIds.includes(tx.id) 
                ? "bg-emerald-100 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800" 
                : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800"
            )}
          >
            <div className="flex items-center gap-3">
              {selectionMode && (
                <div className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-md border transition-all",
                  selectedIds.includes(tx.id)
                    ? "bg-emerald-500 border-emerald-500 text-white"
                    : "border-slate-200 dark:border-slate-700"
                )}>
                  {selectedIds.includes(tx.id) && <Check className="h-3 w-3" />}
                </div>
              )}
              <div 
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${tx.category_color}20`, color: tx.category_color }}
              >
                {type === 'income' ? <ArrowUpCircle className="h-5 w-5" /> : <ArrowDownCircle className="h-5 w-5" />}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{tx.description || (tx.type === 'income' ? 'Receita' : 'Despesa')}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-medium">
                  {tx.category_name} • {format(parseISO(tx.date), 'dd MMM', { locale: ptBR })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <p className={cn(
                "font-bold",
                type === 'income' ? "text-emerald-600" : "text-slate-900 dark:text-slate-100"
              )}>
                {type === 'income' ? '+' : '-'} {formatCurrency(tx.amount)}
              </p>
              {!selectionMode && (
                <div className="flex items-center" onClick={e => e.stopPropagation()}>
                  <button 
                    onClick={() => onEdit(tx)}
                    className="p-2 text-slate-400 hover:text-emerald-500 transition-colors"
                    title="Editar transação"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => {
                      setTargetId(tx.id);
                      setShowDeleteConfirm('single');
                    }}
                    className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                    title="Remover transação"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {filteredTransactions.length === 0 && (
          <div className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-900 text-slate-300">
              {type === 'income' ? <ArrowUpCircle className="h-8 w-8" /> : <ArrowDownCircle className="h-8 w-8" />}
            </div>
            <p className="text-slate-400">Nenhuma {type === 'income' ? 'receita' : 'despesa'} registrada</p>
          </div>
        )}
      </div>
    </div>
  );
}


