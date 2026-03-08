import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { TrendingUp, TrendingDown, Wallet, PlusCircle, AlertCircle, Trash2, Calendar, ChevronLeft, ChevronRight, History, Check, Edit2, Award, Shield, Star, Crown, Medal, Plus, X, Info, Camera, Image as ImageIcon, User as UserIcon, Bell } from 'lucide-react';
import { AlertIcon3D, WalletIcon3D } from './Modals';
import { cn } from '../lib/utils';
import { Transaction, Category, FixedExpense, User, BankConnection } from '../types';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO, subMonths, eachMonthOfInterval, isSameMonth, isAfter, addMonths, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { Landmark, ShieldCheck, ArrowRight, CheckCircle2, RefreshCw, Smartphone, FileText } from 'lucide-react';

interface DashboardProps {
  user: User | null;
  onUpdateProfile: (name: string, photo_url: string) => void;
  transactions: Transaction[];
  categories: Category[];
  fixedExpenses: FixedExpense[];
  bankConnections: BankConnection[];
  onConnectBank: () => void;
  onDisconnectBank: (id: number) => void;
  smartCaptureEnabled: boolean;
  onToggleSmartCapture: () => void;
  onDelete: (id: number) => void;
  onEdit: (tx: Transaction) => void;
  onViewAll: () => void;
  onAddFixedExpense: (expense: Partial<FixedExpense>) => void;
  onUpdateFixedExpense: (id: number, expense: Partial<FixedExpense>) => void;
  onToggleFixedExpense: (id: number, is_paid: boolean) => void;
  onDeleteFixedExpense: (id: number) => void;
}

export default function Dashboard({ 
  user,
  onUpdateProfile,
  transactions, 
  categories, 
  fixedExpenses,
  bankConnections,
  onConnectBank,
  onDisconnectBank,
  smartCaptureEnabled,
  onToggleSmartCapture,
  onDelete, 
  onEdit, 
  onViewAll,
  onAddFixedExpense,
  onUpdateFixedExpense,
  onToggleFixedExpense,
  onDeleteFixedExpense
}: DashboardProps) {
  const [selectedDate, setSelectedDate] = React.useState(new Date());
  const [isMonthSelectorOpen, setIsMonthSelectorOpen] = React.useState(false);
  const [showFixedExpenseForm, setShowFixedExpenseForm] = React.useState(false);
  const [showBadgeInfo, setShowBadgeInfo] = React.useState(false);
  const [showProfileMenu, setShowProfileMenu] = React.useState(false);
  const [editingFixedExpense, setEditingFixedExpense] = React.useState<FixedExpense | null>(null);
  const [newFixedExpense, setNewFixedExpense] = React.useState({ description: '', amount: '', category_id: '', due_date: format(new Date(), 'yyyy-MM-dd') });

  const [isEditingName, setIsEditingName] = React.useState(false);
  const [editedName, setEditedName] = React.useState(user?.name || '');

  const handleUpdateName = (e: React.FormEvent) => {
    e.preventDefault();
    if (editedName.trim()) {
      onUpdateProfile(editedName, user?.photo_url || '');
      setIsEditingName(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdateProfile(user?.name || '', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
    setShowProfileMenu(false);
  };

  const removePhoto = () => {
    onUpdateProfile(user?.name || '', '');
    setShowProfileMenu(false);
  };

  const [lastProgress, setLastProgress] = React.useState(0);

  React.useEffect(() => {
    const paidCount = fixedExpenses.filter(e => e.is_paid).length;
    const totalCount = fixedExpenses.length;
    const progress = totalCount > 0 ? (paidCount / totalCount) * 100 : 0;

    if (progress === 100 && lastProgress < 100 && totalCount > 0) {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10b981', '#3b82f6', '#f59e0b']
      });
    }
    setLastProgress(progress);

    // Logic to reset fixed expenses after 15 days of payment
    const now = new Date();
    fixedExpenses.forEach(expense => {
      if (expense.is_paid && expense.due_date) {
        const dueDate = parseISO(expense.due_date);
        if (differenceInDays(now, dueDate) >= 15) {
          const nextMonthDate = addMonths(dueDate, 1);
          onUpdateFixedExpense(expense.id, {
            is_paid: 0 as any, // backend expects 0 or 1
            due_date: format(nextMonthDate, 'yyyy-MM-dd'),
            is_reset: true
          } as any);
        }
      }
    });
  }, [fixedExpenses]);

  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);

  const monthlyTransactions = transactions.filter(t => 
    isWithinInterval(parseISO(t.date), { start: monthStart, end: monthEnd })
  );

  const totalBalance = transactions.reduce((acc, t) => 
    t.type === 'income' ? acc + t.amount : acc - t.amount, 0
  );

  const monthlyIncome = monthlyTransactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);

  const monthlyExpenses = monthlyTransactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  // Category distribution for selected month
  const expenseByCategory = monthlyTransactions
    .filter(t => t.type === 'expense')
    .reduce((acc: Record<number, number>, t) => {
      acc[t.category_id] = (acc[t.category_id] || 0) + t.amount;
      return acc;
    }, {});

  const pieData = Object.entries(expenseByCategory).map(([catId, amount]) => {
    const category = categories.find(c => c.id === Number(catId));
    return {
      name: category?.name || 'Outros',
      value: amount,
      color: category?.color || '#64748b'
    };
  }).sort((a, b) => b.value - a.value);

  // Last 6 months bar chart data
  const last6Months = Array.from({ length: 6 }).map((_, i) => {
    const date = subMonths(new Date(), i);
    const start = startOfMonth(date);
    const end = endOfMonth(date);
    
    const monthTxs = transactions.filter(t => 
      isWithinInterval(parseISO(t.date), { start, end })
    );

    return {
      name: format(date, 'MMM', { locale: ptBR }),
      income: monthTxs.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0),
      expense: monthTxs.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0),
      isPositive: monthTxs.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0) >= monthTxs.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0)
    };
  }).reverse();

  // Badge calculation based on last 12 months - Updated to every 2 months
  const last12MonthsPositiveCount = Array.from({ length: 12 }).filter((_, i) => {
    const date = subMonths(new Date(), i);
    const start = startOfMonth(date);
    const end = endOfMonth(date);
    const monthTxs = transactions.filter(t => isWithinInterval(parseISO(t.date), { start, end }));
    const inc = monthTxs.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const exp = monthTxs.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    return inc > 0 && inc >= exp;
  }).length;

  const getBadge = (count: number) => {
    // Every 2 months level up
    if (count >= 8) return { name: 'Premium', color: 'text-purple-400', bg: 'bg-purple-500/20', icon: Crown };
    if (count >= 6) return { name: 'Diamante', color: 'text-blue-400', bg: 'bg-blue-500/20', icon: Star };
    if (count >= 4) return { name: 'Ouro', color: 'text-amber-400', bg: 'bg-amber-500/20', icon: Medal };
    if (count >= 2) return { name: 'Prata', color: 'text-slate-300', bg: 'bg-slate-500/20', icon: Shield };
    return { name: 'Bronze', color: 'text-orange-400', bg: 'bg-orange-500/20', icon: Award };
  };

  const badge = getBadge(last12MonthsPositiveCount);

  // Income by category for selected month
  const incomeByCategory = monthlyTransactions
    .filter(t => t.type === 'income')
    .reduce((acc: Record<number, number>, t) => {
      acc[t.category_id] = (acc[t.category_id] || 0) + t.amount;
      return acc;
    }, {});

  const incomePieData = Object.entries(incomeByCategory).map(([catId, amount]) => {
    const category = categories.find(c => c.id === Number(catId));
    return {
      name: category?.name || 'Outros',
      value: amount,
      color: category?.color || '#10b981'
    };
  }).sort((a, b) => b.value - a.value);

  // Generate last 12 months for selector
  const monthsList = eachMonthOfInterval({
    start: subMonths(new Date(), 11),
    end: new Date()
  }).reverse();

  const selectMonth = (date: Date) => {
    setSelectedDate(date);
    setIsMonthSelectorOpen(false);
  };

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <div className="space-y-6 pt-4">
      {/* User Profile Section */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="relative group">
            <button 
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="relative h-12 w-12 rounded-2xl overflow-hidden border-2 border-white dark:border-slate-800 shadow-sm bg-slate-200 dark:bg-slate-800 flex items-center justify-center transition-transform active:scale-95"
            >
              {user?.photo_url ? (
                <img src={user.photo_url} alt={user.name} className="h-full w-full object-cover" />
              ) : (
                <UserIcon className="h-6 w-6 text-slate-400" />
              )}
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="h-4 w-4 text-white" />
              </div>
            </button>

            <AnimatePresence>
              {showProfileMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="absolute left-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 z-50 p-1.5"
                  >
                    <button 
                      onClick={() => {
                        setIsEditingName(true);
                        setShowProfileMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 transition-colors"
                    >
                      <Edit2 className="h-4 w-4" />
                      Editar Nome
                    </button>
                    <label className="flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer transition-colors">
                      <ImageIcon className="h-4 w-4" />
                      Alterar Foto
                      <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                    </label>
                    {user?.photo_url && (
                      <button 
                        onClick={removePhoto}
                        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-900/20 text-xs font-bold text-rose-500 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remover Foto
                      </button>
                    )}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 leading-none mb-1">Bem-vindo de volta,</p>
            <h2 className="text-2xl font-bold tracking-tight text-emerald-400 leading-none uppercase">
              {user?.name ? user.name.split(' ').slice(0, 2).join(' ') : 'Usuário'}
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-400 hover:text-emerald-600 transition-all relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-rose-500 border-2 border-white dark:border-slate-900" />
          </button>
        </div>
      </div>

      {/* Name Edit Modal */}
      <AnimatePresence>
        {isEditingName && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditingName(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-[32px] p-6 shadow-2xl border border-slate-100 dark:border-slate-800"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900 dark:text-white">Editar Nome</h3>
                <button onClick={() => setIsEditingName(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateName} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Seu Nome</label>
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="w-full rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 p-4 text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    placeholder="Como quer ser chamado?"
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-4 rounded-2xl bg-emerald-600 text-white text-xs font-bold uppercase tracking-widest shadow-lg shadow-emerald-600/20 hover:bg-emerald-500 transition-all active:scale-95"
                >
                  Salvar Alterações
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Summary Card - Ultra Compact */}
      <div className={cn(
        "relative rounded-2xl p-4 text-white shadow-lg transition-all duration-500",
        totalBalance >= 0 
          ? "bg-emerald-600 shadow-emerald-200 dark:shadow-emerald-900/20" 
          : "bg-rose-600 shadow-rose-200 dark:shadow-rose-900/20"
      )}>
        {/* Badge - Ornate Style */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <button 
            onClick={() => setShowBadgeInfo(true)}
            className="p-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <Info className="h-3 w-3 text-white/70" />
          </button>
          <div className={cn(
            "flex items-center gap-1.5 px-3 py-1 rounded-xl border border-white/20 backdrop-blur-xl shadow-2xl relative overflow-hidden group",
            "bg-[#0a192f]/80" // Dark blue background
          )}>
            {/* Animated Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite] transition-transform" />
            
            <div className="relative">
              <div className={cn("absolute inset-0 blur-md opacity-50", badge.color.replace('text-', 'bg-'))}></div>
              <badge.icon className={cn("h-4 w-4 relative z-10 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]", badge.color)} />
            </div>
            <span className={cn("text-[10px] font-bold uppercase tracking-[0.2em] relative z-10 drop-shadow-sm", badge.color)}>{badge.name}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <WalletIcon3D className="flex-shrink-0" />
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">Saldo Total</span>
            <h2 className="text-2xl font-bold tracking-tighter leading-none mt-0.5">{formatCurrency(totalBalance)}</h2>
          </div>
        </div>
        
        <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
          <div className="flex gap-4">
            <div>
              <span className="block text-[8px] font-bold uppercase tracking-wider opacity-60 leading-none">Entradas</span>
              <p className="text-[12px] font-bold leading-none mt-1">{formatCurrency(monthlyIncome)}</p>
            </div>
            <div className="w-px h-6 bg-white/10 self-center" />
            <div>
              <span className="block text-[8px] font-bold uppercase tracking-wider opacity-60 leading-none">Saídas</span>
              <p className="text-[12px] font-bold text-rose-100 leading-none mt-1">{formatCurrency(monthlyExpenses)}</p>
            </div>
          </div>

          <div className="relative">
            <button 
              onClick={() => setIsMonthSelectorOpen(!isMonthSelectorOpen)}
              className="flex flex-col items-center px-3 py-1 bg-black/20 rounded-xl border border-white/5 hover:bg-white/10 transition-colors min-w-[70px]"
            >
              <span className="text-[7px] font-bold uppercase opacity-50 leading-none mb-0.5">Histórico</span>
              <div className="flex items-center gap-1">
                <span className="text-[9px] font-bold uppercase tracking-widest text-center">
                  {format(selectedDate, 'MMM yy', { locale: ptBR })}
                </span>
                <ChevronRight className={cn("h-2 w-2 transition-transform duration-300", isMonthSelectorOpen ? "rotate-90" : "rotate-0")} />
              </div>
            </button>

            <AnimatePresence>
              {isMonthSelectorOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsMonthSelectorOpen(false)} 
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 bottom-full mb-2 w-40 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
                  >
                    <div className="p-1 max-h-[120px] overflow-y-auto scrollbar-hide overscroll-contain">
                      <div className="flex flex-col gap-1">
                        {monthsList.map((month) => {
                          const isSelected = isSameMonth(month, selectedDate);
                          return (
                            <button
                              key={month.toISOString()}
                              onClick={() => selectMonth(month)}
                              className={cn(
                                "flex items-center justify-between px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all",
                                isSelected 
                                  ? "bg-emerald-600 text-white" 
                                  : "hover:bg-white/5 text-slate-400"
                              )}
                            >
                              {format(month, 'MMM yy', { locale: ptBR })}
                              {isSelected && <Check className="h-3 w-3" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Bank Connection Card */}
      <div className={cn(
        "rounded-3xl p-5 shadow-xl border transition-all relative overflow-hidden group",
        bankConnections.length > 0 
          ? "bg-white dark:bg-slate-900 border-emerald-500/10" 
          : "bg-[#0a192f] border-slate-800 text-white"
      )}>
        {bankConnections.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {bankConnections.map((conn, i) => (
                    <div 
                      key={conn.id} 
                      className={cn(
                        "h-10 w-10 rounded-xl border-2 border-white dark:border-slate-900 flex items-center justify-center text-white font-bold text-sm shadow-sm",
                        conn.bank_name.toLowerCase().includes('nubank') ? 'bg-purple-600' :
                        conn.bank_name.toLowerCase().includes('inter') ? 'bg-orange-500' :
                        conn.bank_name.toLowerCase().includes('itau') ? 'bg-blue-600' : 'bg-emerald-600'
                      )}
                      style={{ zIndex: bankConnections.length - i }}
                    >
                      {conn.bank_name[0]}
                    </div>
                  ))}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {bankConnections.length === 1 ? 'Banco Conectado' : `${bankConnections.length} Bancos Conectados`}
                  </h3>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                    {bankConnections.length === 1 ? bankConnections[0].bank_name : 'Sincronizados'} • Ativo
                  </p>
                </div>
              </div>
              <button 
                onClick={onConnectBank}
                className="p-2 hover:bg-rose-500/10 rounded-xl text-rose-500 transition-all active:scale-90"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/50">
                <span className="text-[8px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Status</span>
                <div className="flex items-center gap-1.5 text-emerald-500">
                  <RefreshCw className="h-3 w-3 animate-spin-slow" />
                  <span className="text-[10px] font-bold">Ativo</span>
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/50">
                <span className="text-[8px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Segurança</span>
                <div className="flex items-center gap-1.5 text-blue-500">
                  <ShieldCheck className="h-3 w-3" />
                  <span className="text-[10px] font-bold">Ok</span>
                </div>
              </div>
            </div>

            <button 
              onClick={onConnectBank}
              className="w-full py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
            >
              Gerenciar Conexão
            </button>
          </div>
        ) : (
          <div className="relative z-10 space-y-5">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                <Landmark className="h-7 w-7 text-emerald-400" />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-xl font-black tracking-tight text-white">Conecte seu banco</h3>
                <p className="text-[11px] text-slate-400 leading-tight">Sincronize suas contas para controle automático e inteligente.</p>
              </div>
            </div>

            <div className="flex justify-start gap-2">
              {[
                { label: 'Extrato', icon: FileText },
                { label: 'Saldo', icon: Wallet },
                { label: 'PIX', icon: Smartphone }
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                  <item.icon className="h-3 w-3 text-emerald-400" />
                  <span className="text-[9px] font-bold uppercase tracking-widest text-slate-300">{item.label}</span>
                </div>
              ))}
            </div>

            <button 
              onClick={onConnectBank}
              className="w-full py-4 rounded-2xl bg-emerald-500 text-white font-black uppercase tracking-[0.1em] text-[11px] flex items-center justify-center gap-2 hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.97]"
            >
              Conectar meu banco
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Alternative Notification Capture Card (Only if no bank connected) */}
      {bankConnections.length === 0 && (
        <div className="rounded-3xl bg-[#0a192f] p-4 shadow-xl border border-slate-800">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <Smartphone className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h4 className="text-xs font-bold text-white">Captura Inteligente</h4>
              <p className="text-[10px] text-slate-400 font-medium leading-tight">Márcia detecta notificações de PIX e pagamentos.</p>
            </div>
            <button 
              onClick={onToggleSmartCapture}
              className={cn(
                "relative flex h-6 w-10 items-center rounded-full transition-all duration-300 focus:outline-none",
                smartCaptureEnabled ? "bg-emerald-500" : "bg-slate-800"
              )}
            >
              <div className={cn(
                "h-4 w-4 rounded-full bg-white shadow-lg transition-all duration-300 transform",
                smartCaptureEnabled ? "translate-x-5" : "translate-x-1"
              )} />
            </button>
          </div>
        </div>
      )}

      {/* Health Indicator */}
      {monthlyExpenses > monthlyIncome && (
        <div className="flex items-center gap-4 rounded-3xl bg-slate-800 dark:bg-amber-950/40 p-5 text-white dark:text-amber-100 border border-slate-700 dark:border-amber-900/30 shadow-xl">
          <AlertIcon3D className="flex-shrink-0" />
          <p className="text-sm font-bold leading-tight">
            Atenção: Seus gastos este mês superaram suas receitas.
          </p>
        </div>
      )}

      {/* Fixed Expenses Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className={cn(
            "text-sm font-bold uppercase tracking-widest",
            "text-slate-400 dark:text-slate-500" // Keep secondary headers slightly muted but readable
          )}>Despesas Fixas</h3>
          <button 
            onClick={() => setShowFixedExpenseForm(!showFixedExpenseForm)}
            className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-emerald-600 hover:text-emerald-500 transition-colors"
          >
            <PlusCircle className="h-3 w-3" />
            Adicionar
          </button>
        </div>

        <AnimatePresence>
          {showFixedExpenseForm && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="rounded-2xl bg-[#0a192f] dark:bg-slate-900 p-4 border border-slate-100 dark:border-slate-800 space-y-3 mb-3">
                <div className="grid grid-cols-2 gap-3">
                  <input 
                    type="text" 
                    placeholder="Descrição"
                    value={newFixedExpense.description}
                    onChange={e => setNewFixedExpense({ ...newFixedExpense, description: e.target.value })}
                    className="rounded-xl bg-slate-800/50 p-2.5 text-xs outline-none focus:ring-1 ring-emerald-500 text-white placeholder:text-white/30"
                  />
                  <input 
                    type="number" 
                    placeholder="Valor"
                    value={newFixedExpense.amount}
                    onChange={e => setNewFixedExpense({ ...newFixedExpense, amount: e.target.value })}
                    className="rounded-xl bg-slate-800/50 p-2.5 text-xs outline-none focus:ring-1 ring-emerald-500 text-white placeholder:text-white/30"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <select 
                    value={newFixedExpense.category_id}
                    onChange={e => setNewFixedExpense({ ...newFixedExpense, category_id: e.target.value })}
                    className="rounded-xl bg-slate-800/50 p-2.5 text-xs outline-none focus:ring-1 ring-emerald-500 appearance-none text-white"
                  >
                    <option value="" className="bg-slate-900">Categoria</option>
                    {categories.filter(c => c.type === 'expense').map(c => (
                      <option key={c.id} value={c.id} className="bg-slate-900">{c.name}</option>
                    ))}
                  </select>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500 z-10" />
                    <input 
                      type="date" 
                      value={newFixedExpense.due_date}
                      onChange={e => setNewFixedExpense({ ...newFixedExpense, due_date: e.target.value })}
                      className="w-full rounded-xl bg-slate-800/50 p-2.5 pl-10 text-xs outline-none focus:ring-1 ring-emerald-500 relative text-white"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button 
                    onClick={() => {
                      if (newFixedExpense.description && newFixedExpense.amount) {
                        onAddFixedExpense({
                          description: newFixedExpense.description,
                          amount: parseFloat(newFixedExpense.amount),
                          category_id: parseInt(newFixedExpense.category_id) || 10,
                          due_date: newFixedExpense.due_date
                        });
                        setNewFixedExpense({ description: '', amount: '', category_id: '', due_date: format(new Date(), 'yyyy-MM-dd') });
                        setShowFixedExpenseForm(false);
                      }
                    }}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold w-full sm:w-auto"
                  >
                    Fixar
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="rounded-3xl bg-[#0a192f] dark:bg-slate-900 p-5 shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-col gap-1 flex-1 mr-4">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-white/50">
                <span>Progresso Mensal</span>
                <span>{Math.round((fixedExpenses.filter(e => e.is_paid).length / (fixedExpenses.length || 1)) * 100)}%</span>
              </div>
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${(fixedExpenses.filter(e => e.is_paid).length / (fixedExpenses.length || 1)) * 100}%` }}
                  className="h-full bg-emerald-500 transition-all duration-500"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {fixedExpenses.map((expense) => {
              const dueDate = expense.due_date ? parseISO(expense.due_date) : null;
              const today = new Date();
              const isOverdue = !expense.is_paid && dueDate && isAfter(today, dueDate);

              return (
                <div 
                  key={expense.id} 
                  className={cn(
                    "flex items-center justify-between group p-2 rounded-2xl transition-all",
                    isOverdue ? "bg-rose-500/20 border border-rose-500/50" : ""
                  )}
                >
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => onToggleFixedExpense(expense.id, !expense.is_paid)}
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-md border transition-all",
                        expense.is_paid 
                          ? "bg-emerald-500 border-emerald-500 text-white" 
                          : isOverdue 
                            ? "bg-rose-600 border-rose-400 text-transparent"
                            : "bg-slate-800 border-white/20 hover:border-white/40 text-transparent"
                      )}
                    >
                      {expense.is_paid && <Check className="h-3 w-3" />}
                    </button>
                    <div className={cn("transition-opacity flex-1", expense.is_paid ? "opacity-40" : "opacity-100")}>
                      <p className={cn("text-xs font-bold", isOverdue ? "text-rose-200" : "text-white")}>{expense.description}</p>
                      <div className="flex items-center gap-2">
                        <p className={cn("text-[9px] uppercase font-bold", isOverdue ? "text-rose-300" : "text-white/60")}>
                          {formatCurrency(expense.amount)}
                        </p>
                        {expense.due_date && (() => {
                          const diffTime = dueDate!.getTime() - today.getTime();
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                          
                          let dateColor = "text-white/60 bg-white/10";
                          if (!expense.is_paid) {
                            if (isOverdue) dateColor = "text-white bg-rose-600";
                            else if (diffDays <= 5) dateColor = "text-white bg-rose-500 animate-pulse";
                            else if (diffDays <= 10) dateColor = "text-white bg-orange-500";
                          }

                          return (
                            <span className={cn("text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-md transition-colors", dateColor)}>
                              {format(dueDate!, 'dd MMM', { locale: ptBR })}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => setEditingFixedExpense(expense)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-white/10 rounded-lg transition-all"
                    >
                      <Edit2 className="h-3 w-3 text-white/40" />
                    </button>
                    <button 
                      onClick={() => onDeleteFixedExpense(expense.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-rose-500/20 rounded-lg transition-all"
                    >
                      <X className="h-3 w-3 text-white/30 hover:text-rose-500" />
                    </button>
                  </div>
                </div>
              );
            })}
            {fixedExpenses.length === 0 && (
              <p className="text-[10px] text-white/40 italic text-center py-2">Nenhuma despesa fixa fixada.</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Transactions - REORDERED */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className={cn(
            "text-sm font-bold uppercase tracking-widest",
            "text-slate-400 dark:text-slate-500"
          )}>Recentes</h3>
          <button 
            onClick={onViewAll}
            className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-emerald-600 transition-colors"
          >
            Ver todas
          </button>
        </div>
        <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-hide pr-1">
          {[...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10).map((tx) => (
            <div key={tx.id} className="group relative flex items-center justify-between rounded-2xl bg-white dark:bg-slate-900 p-3 shadow-sm border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div 
                  className="flex h-8 w-8 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${tx.category_color}20`, color: tx.category_color }}
                >
                  <PlusCircle className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate max-w-[120px]">{tx.description || 'Sem descrição'}</p>
                  <p className="text-[9px] text-slate-500 dark:text-slate-400 uppercase font-medium">{tx.category_name} • {format(parseISO(tx.date), 'dd MMM', { locale: ptBR })}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <p className={cn(
                  "text-xs font-bold",
                  tx.type === 'income' ? "text-emerald-600" : "text-rose-600"
                )}>
                  {tx.type === 'income' ? '+' : '-'} {formatCurrency(tx.amount)}
                </p>
                <div className="flex items-center">
                  <button 
                    onClick={() => onEdit(tx)}
                    className="p-1.5 text-slate-300 hover:text-emerald-500 transition-colors"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button 
                    onClick={() => onDelete(tx.id)}
                    className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {transactions.length === 0 && (
            <div className="py-8 text-center text-slate-400">
              Nenhuma transação encontrada
            </div>
          )}
        </div>
      </div>

      {/* Monthly Comparison - REORDERED */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 p-5 shadow-sm border border-slate-100 dark:border-slate-800">
        <h3 className={cn(
          "text-[10px] font-bold uppercase tracking-widest mb-3",
          "text-slate-400 dark:text-slate-500"
        )}>Comparativo Mensal</h3>
        <div className="h-32 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={last6Months}>
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94a3b8' }} />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', backgroundColor: '#1e293b', color: '#f8fafc', fontSize: '10px' }}
              />
              <Bar dataKey="income" fill="#10b981" radius={[3, 3, 0, 0]} barSize={12} />
              <Bar dataKey="expense" fill="#ef4444" radius={[3, 3, 0, 0]} barSize={12} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Charts - REORDERED */}
      <div className="grid grid-cols-1 gap-4">
        {/* Expenses by Category */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 p-5 shadow-sm border border-slate-100 dark:border-slate-800">
          <h3 className={cn(
            "text-[10px] font-bold uppercase tracking-widest mb-3",
            "text-slate-400 dark:text-slate-500"
          )}>Gastos por Categoria</h3>
          <div className="flex items-center gap-4">
            <div className="h-32 w-32 flex-shrink-0 relative">
              {pieData.length > 0 ? (
                <div className="absolute inset-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={50}
                        paddingAngle={4}
                        dataKey="value"
                        animationDuration={1000}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-[10px] text-slate-400 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-full">
                  Sem dados
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 gap-1.5 flex-1">
              {pieData.length > 0 ? pieData.slice(0, 4).map((item, i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 truncate">{item.name}</span>
                  </div>
                  <span className="text-[10px] font-black text-slate-900 dark:text-slate-100">{formatCurrency(item.value)}</span>
                </div>
              )) : (
                <p className="text-[10px] text-slate-400 italic">Nenhum gasto registrado.</p>
              )}
            </div>
          </div>
        </div>

        {/* Gains by Category */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 p-5 shadow-sm border border-slate-100 dark:border-slate-800">
          <h3 className={cn(
            "text-[10px] font-bold uppercase tracking-widest mb-3",
            "text-slate-400 dark:text-slate-500"
          )}>Ganho por Categoria</h3>
          <div className="flex items-center gap-4">
            <div className="h-32 w-32 flex-shrink-0 relative">
              {incomePieData.length > 0 ? (
                <div className="absolute inset-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={incomePieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={50}
                        paddingAngle={4}
                        dataKey="value"
                        animationDuration={1000}
                      >
                        {incomePieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-[10px] text-slate-400 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-full">
                  Sem dados
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 gap-1.5 flex-1">
              {incomePieData.length > 0 ? incomePieData.slice(0, 4).map((item, i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 truncate">{item.name}</span>
                  </div>
                  <span className="text-[10px] font-black text-slate-900 dark:text-slate-100">{formatCurrency(item.value)}</span>
                </div>
              )) : (
                <p className="text-[10px] text-slate-400 italic">Nenhuma receita registrada.</p>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Badge Info Modal */}
      <AnimatePresence>
        {showBadgeInfo && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowBadgeInfo(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-[32px] p-6 shadow-2xl border border-slate-100 dark:border-slate-800"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold uppercase tracking-tighter">Sistema de Emblemas</h3>
                <button onClick={() => setShowBadgeInfo(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                {[
                  { name: 'Bronze', desc: 'Iniciante (0-1 mês positivo)', icon: Award, color: 'text-orange-400' },
                  { name: 'Prata', desc: 'Consistente (2-3 meses positivos)', icon: Shield, color: 'text-slate-300' },
                  { name: 'Ouro', desc: 'Disciplinado (4-5 meses positivos)', icon: Medal, color: 'text-amber-400' },
                  { name: 'Diamante', desc: 'Estrategista (6-7 meses positivos)', icon: Star, color: 'text-blue-400' },
                  { name: 'Premium', desc: 'Mestre Financeiro (8+ meses positivos)', icon: Crown, color: 'text-purple-400' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                    <div className={cn("p-2 rounded-xl bg-white dark:bg-slate-800 shadow-sm", item.color)}>
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider">{item.name}</p>
                      <p className="text-[10px] text-slate-500 font-medium">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
                <p className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 leading-relaxed">
                  💡 Dica: Mantenha seu saldo positivo (receitas maiores que despesas) por meses consecutivos para subir de nível e desbloquear novos emblemas!
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Edit Fixed Expense Modal */}
      <AnimatePresence>
        {editingFixedExpense && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingFixedExpense(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm overflow-hidden rounded-[32px] bg-white dark:bg-slate-900 p-6 shadow-2xl"
            >
              <h3 className="mb-4 text-sm font-black uppercase tracking-widest">Editar Despesa Fixa</h3>
              <div className="space-y-3">
                <input 
                  type="text" 
                  placeholder="Descrição"
                  value={editingFixedExpense.description}
                  onChange={e => setEditingFixedExpense({ ...editingFixedExpense, description: e.target.value })}
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 p-3 text-xs outline-none focus:ring-1 ring-emerald-500"
                />
                <input 
                  type="number" 
                  placeholder="Valor"
                  value={editingFixedExpense.amount}
                  onChange={e => setEditingFixedExpense({ ...editingFixedExpense, amount: parseFloat(e.target.value) })}
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 p-3 text-xs outline-none focus:ring-1 ring-emerald-500"
                />
                <select 
                  value={editingFixedExpense.category_id}
                  onChange={e => setEditingFixedExpense({ ...editingFixedExpense, category_id: parseInt(e.target.value) })}
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 p-3 text-xs outline-none focus:ring-1 ring-emerald-500"
                >
                  {categories.filter(c => c.type === 'expense').map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500 z-10" />
                  <input 
                    type="date" 
                    value={editingFixedExpense.due_date}
                    onChange={e => setEditingFixedExpense({ ...editingFixedExpense, due_date: e.target.value })}
                    className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 p-3 pl-10 text-xs outline-none focus:ring-1 ring-emerald-500"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button 
                    onClick={() => {
                      onUpdateFixedExpense(editingFixedExpense.id, editingFixedExpense);
                      setEditingFixedExpense(null);
                    }}
                    className="flex-1 rounded-xl bg-emerald-600 py-3 text-[10px] font-black uppercase tracking-widest text-white hover:bg-emerald-500"
                  >
                    Salvar Alterações
                  </button>
                  <button 
                    onClick={() => setEditingFixedExpense(null)}
                    className="flex-1 rounded-xl bg-slate-100 dark:bg-slate-800 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Edit Fixed Expense Modal */}
      <AnimatePresence>
        {editingFixedExpense && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingFixedExpense(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm overflow-hidden rounded-[32px] bg-white dark:bg-slate-900 p-6 shadow-2xl"
            >
              <h3 className="mb-4 text-sm font-black uppercase tracking-widest">Editar Despesa Fixa</h3>
              <div className="space-y-3">
                <input 
                  type="text" 
                  placeholder="Descrição"
                  value={editingFixedExpense.description}
                  onChange={e => setEditingFixedExpense({ ...editingFixedExpense, description: e.target.value })}
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 p-3 text-xs outline-none focus:ring-1 ring-emerald-500"
                />
                <input 
                  type="number" 
                  placeholder="Valor"
                  value={editingFixedExpense.amount}
                  onChange={e => setEditingFixedExpense({ ...editingFixedExpense, amount: parseFloat(e.target.value) })}
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 p-3 text-xs outline-none focus:ring-1 ring-emerald-500"
                />
                <select 
                  value={editingFixedExpense.category_id}
                  onChange={e => setEditingFixedExpense({ ...editingFixedExpense, category_id: parseInt(e.target.value) })}
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 p-3 text-xs outline-none focus:ring-1 ring-emerald-500"
                >
                  {categories.filter(c => c.type === 'expense').map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500 z-10" />
                  <input 
                    type="date" 
                    value={editingFixedExpense.due_date}
                    onChange={e => setEditingFixedExpense({ ...editingFixedExpense, due_date: e.target.value })}
                    className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 p-3 pl-10 text-xs outline-none focus:ring-1 ring-emerald-500"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button 
                    onClick={() => {
                      onUpdateFixedExpense(editingFixedExpense.id, editingFixedExpense);
                      setEditingFixedExpense(null);
                    }}
                    className="flex-1 rounded-xl bg-emerald-600 py-3 text-[10px] font-black uppercase tracking-widest text-white hover:bg-emerald-500"
                  >
                    Salvar Alterações
                  </button>
                  <button 
                    onClick={() => setEditingFixedExpense(null)}
                    className="flex-1 rounded-xl bg-slate-100 dark:bg-slate-800 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}


