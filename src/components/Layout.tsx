import React from 'react';
import { LayoutDashboard, ArrowUpCircle, ArrowDownCircle, FileText, Sun, Moon, Lightbulb, Menu, Settings, RefreshCw, ChevronRight, Bell, LogOut } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { User } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  onOpenTips: () => void;
  onCheckUpdate: () => void;
  user: User | null;
  onLogout: () => void;
}

export default function Layout({ children, activeTab, setActiveTab, theme, toggleTheme, onOpenTips, onCheckUpdate, user, onLogout }: LayoutProps) {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const tabs = [
    { id: 'dashboard', label: 'Início', icon: LayoutDashboard },
    { id: 'income', label: 'Entradas', icon: ArrowUpCircle },
    { id: 'expenses', label: 'Saída', icon: ArrowDownCircle },
    { id: 'import', label: 'Importar', icon: FileText },
  ];

  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [startX, setStartX] = React.useState(0);
  const [startY, setStartY] = React.useState(0);
  const [scrollLeft, setScrollLeft] = React.useState(0);
  const [scrollTop, setScrollTop] = React.useState(0);

  const onMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setStartY(e.pageY - scrollRef.current.offsetTop);
    setScrollLeft(scrollRef.current.scrollLeft);
    setScrollTop(scrollRef.current.scrollTop);
  };

  const onMouseLeave = () => {
    setIsDragging(false);
  };

  const onMouseUp = () => {
    setIsDragging(false);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const y = e.pageY - scrollRef.current.offsetTop;
    const walkX = (x - startX) * 2;
    const walkY = (y - startY) * 2;
    scrollRef.current.scrollLeft = scrollLeft - walkX;
    scrollRef.current.scrollTop = scrollTop - walkY;
  };

  return (
    <div 
      ref={scrollRef}
      onMouseDown={onMouseDown}
      onMouseLeave={onMouseLeave}
      onMouseUp={onMouseUp}
      onMouseMove={onMouseMove}
      className={cn(
        "h-screen overflow-y-auto scrollbar-hide font-sans transition-colors duration-300",
        isDragging ? "cursor-grabbing select-none" : "cursor-default",
        theme === 'dark' ? "bg-slate-950 text-slate-50" : "bg-slate-50 text-slate-900"
      )}
    >
      <div className="pb-24">
        <header className={cn(
          "sticky top-0 z-10 border-b px-6 py-4 backdrop-blur-md",
          theme === 'dark' ? "border-slate-800 bg-slate-950/80" : "border-slate-200 bg-white/80"
        )}>
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <span className="text-white font-black text-xl">M</span>
            </div>
            <span className={cn(
              "text-xl font-black tracking-tighter",
              theme === 'dark' ? "text-white" : "text-[#0a192f]"
            )}>
              Meu<span className="text-emerald-600">Financeiro</span>
            </span>
          </div>
          <div className="relative" ref={menuRef}>
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={cn(
                "rounded-2xl p-2.5 transition-all active:scale-90 shadow-sm border",
                theme === 'dark' ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-100 text-slate-900"
              )}
            >
              <Menu className="h-5 w-5" />
            </button>

            {isMenuOpen && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className={cn(
                  "absolute right-0 mt-3 w-52 rounded-[1.5rem] border p-1.5 shadow-2xl backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-200",
                  theme === 'dark' ? "bg-slate-950/95 border-slate-800" : "bg-slate-900/95 border-slate-800 text-white"
                )}
              >
                <div className="space-y-0.5">
                  <button 
                    onClick={() => { onOpenTips(); setIsMenuOpen(false); }}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-xl p-3 text-xs font-bold transition-all active:scale-95",
                      "hover:bg-emerald-500/10 text-emerald-400"
                    )}
                  >
                    <Lightbulb className="h-4 w-4" />
                    Dicas Financeiras
                  </button>

                  <button 
                    onClick={() => { toggleTheme(); setIsMenuOpen(false); }}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-xl p-3 text-xs font-bold transition-all active:scale-95",
                      "hover:bg-slate-500/10 text-slate-300"
                    )}
                  >
                    {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4 text-indigo-400" />}
                    Mudar Tema
                    <span className="ml-auto rounded-md bg-slate-800 px-1.5 py-0.5 text-[8px] uppercase tracking-widest opacity-60">
                      {theme === 'dark' ? 'Claro' : 'Escuro'}
                    </span>
                  </button>

                  <div className="my-1.5 h-px bg-slate-800/50 mx-3" />

                  <button 
                    onClick={() => { onCheckUpdate(); setIsMenuOpen(false); }}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-xl p-3 text-xs font-bold transition-all active:scale-95",
                      "hover:bg-blue-500/10 text-blue-400"
                    )}
                  >
                    <RefreshCw className="h-4 w-4" />
                    Atualizações
                    <div className="ml-auto flex h-1.5 w-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                  </button>

                  <button 
                    onClick={() => { onLogout(); setIsMenuOpen(false); }}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-xl p-3 text-xs font-bold transition-all active:scale-95",
                      "hover:bg-rose-500/10 text-rose-400"
                    )}
                  >
                    <LogOut className="h-4 w-4" />
                    Sair da Conta
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg p-6">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {children}
        </motion.div>
      </main>

      </div>
      <nav className={cn(
        "fixed bottom-0 left-0 right-0 z-20 border-t px-8 pb-10 pt-4 shadow-2xl transition-all",
        theme === 'dark' ? "border-slate-800 bg-slate-950/95 backdrop-blur-md" : "border-slate-100 bg-white/95 backdrop-blur-md"
      )}>
        <div className="mx-auto flex max-w-lg justify-between items-center">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "relative flex flex-col items-center gap-1.5 transition-all active:scale-90",
                  isActive ? "text-emerald-600" : "text-slate-400 hover:text-slate-600"
                )}
              >
                {isActive && (
                  <motion.div 
                    layoutId="activeTabIndicator"
                    className="absolute -top-4 h-1 w-8 rounded-full bg-emerald-600"
                  />
                )}
                <div className={cn(
                  "rounded-2xl p-2.5 transition-all",
                  isActive ? (theme === 'dark' ? "bg-emerald-500/10" : "bg-emerald-50") : "bg-transparent"
                )}>
                  <Icon className={cn("h-6 w-6", isActive ? "stroke-[2.5px]" : "stroke-[2px]")} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
