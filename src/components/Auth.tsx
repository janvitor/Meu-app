import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Mail, Phone, Lock, ArrowRight, Loader2, LogIn, UserPlus, ShieldCheck, KeyRound, Timer } from 'lucide-react';
import { cn } from '../lib/utils';

interface AuthProps {
  onLogin: (token: string, user: any) => void;
}

export default function Auth({ onLogin }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [forgotPasswordStep, setForgotPasswordStep] = useState<'none' | 'request' | 'verify' | 'reset'>('none');
  const [timer, setTimer] = useState(0);
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    login: '' // for email or phone
  });

  useEffect(() => {
    let interval: any;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleForgotPasswordRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: formData.login })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      
      setForgotPasswordStep('verify');
      setTimer(120); // 2 minutes
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          login: formData.login, 
          code: resetCode, 
          newPassword: newPassword 
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      
      setForgotPasswordStep('none');
      setError('Senha alterada com sucesso! Faça login agora.');
      setIsLogin(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const body = isLogin 
        ? { login: formData.login, password: formData.password }
        : { name: formData.name, email: formData.email, phone: formData.phone, password: formData.password };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao processar solicitação');
      }

      onLogin(data.token, data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Image with Low Opacity */}
      <div 
        className="absolute inset-0 z-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?q=80&w=2071&auto=format&fit=crop")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-8 relative z-10"
      >
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-xl shadow-emerald-500/20">
                <span className="text-white font-bold text-3xl">M</span>
              </div>
              <span className="text-3xl font-bold tracking-tighter text-[#0a192f] dark:text-white">
                Meu<span className="text-emerald-600">Financeiro</span>
              </span>
            </div>
          </div>
          <h1 className="text-2xl font-bold uppercase tracking-tight text-slate-900 dark:text-white">
            {forgotPasswordStep !== 'none' 
              ? 'Recuperar Senha' 
              : isLogin ? 'Bem-vindo de volta' : 'Criar sua conta'}
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            {forgotPasswordStep !== 'none'
              ? 'Siga os passos para redefinir sua senha'
              : isLogin ? 'Entre para gerenciar suas finanças' : 'Comece sua jornada para a liberdade financeira'}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800">
          <AnimatePresence mode="wait">
            {forgotPasswordStep === 'none' ? (
              <motion.form 
                key="auth-form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleSubmit} 
                className="space-y-4"
              >
                <AnimatePresence mode="wait">
                  {!isLogin && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-4"
                    >
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Nome completo"
                          required={!isLogin}
                          value={formData.name}
                          onChange={e => setFormData({...formData, name: e.target.value})}
                          className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none outline-none focus:ring-2 ring-emerald-500/20 text-sm font-medium text-slate-900 dark:text-white dark:placeholder:text-slate-400 transition-all"
                        />
                      </div>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input
                          type="email"
                          placeholder="Email"
                          value={formData.email}
                          onChange={e => setFormData({...formData, email: e.target.value})}
                          className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none outline-none focus:ring-2 ring-emerald-500/20 text-sm font-medium text-slate-900 dark:text-white dark:placeholder:text-slate-400 transition-all"
                        />
                      </div>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input
                          type="tel"
                          placeholder="Celular"
                          value={formData.phone}
                          onChange={e => setFormData({...formData, phone: e.target.value})}
                          className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none outline-none focus:ring-2 ring-emerald-500/20 text-sm font-medium text-slate-900 dark:text-white dark:placeholder:text-slate-400 transition-all"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {isLogin && (
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Email ou Celular"
                      required={isLogin}
                      value={formData.login}
                      onChange={e => setFormData({...formData, login: e.target.value})}
                      className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none outline-none focus:ring-2 ring-emerald-500/20 text-sm font-medium text-slate-900 dark:text-white dark:placeholder:text-slate-400 transition-all"
                    />
                  </div>
                )}

                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    type="password"
                    placeholder="Senha (mín. 6 caracteres)"
                    required
                    minLength={6}
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none outline-none focus:ring-2 ring-emerald-500/20 text-sm font-medium text-slate-900 dark:text-white dark:placeholder:text-slate-400 transition-all"
                  />
                </div>

                {error && (
                  <p className={cn(
                    "text-xs font-bold text-center",
                    error.includes('sucesso') ? "text-emerald-500" : "text-rose-500"
                  )}>{error}</p>
                )}

                {isLogin && (
                  <div className="text-right">
                    <button 
                      type="button" 
                      onClick={() => setForgotPasswordStep('request')}
                      className="text-xs font-bold text-emerald-600 hover:text-emerald-500"
                    >
                      Não lembro minha senha
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 rounded-2xl bg-emerald-600 text-white font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      {isLogin ? 'Entrar' : 'Criar Conta'}
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-100 dark:border-slate-800"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white dark:bg-slate-900 px-2 text-slate-400 font-bold tracking-widest">Ou continue com</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => alert('Integração com Google em breve!')}
                  className="w-full py-4 rounded-2xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs flex items-center justify-center gap-3 border border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-[0.98]"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.07-3.71 1.07-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.11c-.22-.67-.35-1.39-.35-2.11s.13-1.44.35-2.11V7.05H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.95l3.66-2.84z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Google
                </button>
              </motion.form>
            ) : forgotPasswordStep === 'request' ? (
              <motion.form
                key="forgot-request"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleForgotPasswordRequest}
                className="space-y-6"
              >
                <div className="text-center space-y-2">
                  <div className="mx-auto h-12 w-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
                    <Mail className="h-6 w-6" />
                  </div>
                  <p className="text-xs text-slate-500 font-medium">Informe seu email ou celular cadastrado para receber o código.</p>
                </div>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Email ou Celular"
                    required
                    value={formData.login}
                    onChange={e => setFormData({...formData, login: e.target.value})}
                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none outline-none focus:ring-2 ring-emerald-500/20 text-sm font-medium transition-all"
                  />
                </div>
                {error && <p className="text-xs text-rose-500 font-bold text-center">{error}</p>}
                <div className="flex flex-col gap-3">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-4 rounded-2xl bg-emerald-600 text-white font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                  >
                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Enviar Código'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setForgotPasswordStep('none')}
                    className="text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  >
                    Voltar ao Login
                  </button>
                </div>
              </motion.form>
            ) : (
              <motion.form
                key="forgot-verify"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleResetPassword}
                className="space-y-6"
              >
                <div className="text-center space-y-2">
                  <div className="mx-auto h-12 w-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <p className="text-xs text-slate-500 font-medium">Insira o código enviado e sua nova senha.</p>
                  <div className="flex items-center justify-center gap-2 text-emerald-600 font-bold text-sm">
                    <Timer className="h-4 w-4" />
                    <span>Expira em: {formatTimer(timer)}</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="relative">
                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Código de 6 dígitos"
                      required
                      maxLength={6}
                      value={resetCode}
                      onChange={e => setResetCode(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none outline-none focus:ring-2 ring-emerald-500/20 text-sm font-medium tracking-[0.5em] text-center transition-all"
                    />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                      type="password"
                      placeholder="Nova Senha"
                      required
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none outline-none focus:ring-2 ring-emerald-500/20 text-sm font-medium transition-all"
                    />
                  </div>
                </div>
                {error && <p className="text-xs text-rose-500 font-bold text-center">{error}</p>}
                <div className="flex flex-col gap-3">
                  <button
                    type="submit"
                    disabled={isLoading || timer === 0}
                    className="w-full py-4 rounded-2xl bg-emerald-600 text-white font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                  >
                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Redefinir Senha'}
                  </button>
                  {timer === 0 && (
                    <button
                      type="button"
                      onClick={handleForgotPasswordRequest}
                      className="text-xs font-bold text-emerald-600 hover:text-emerald-500"
                    >
                      Solicitar novo código
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setForgotPasswordStep('none')}
                    className="text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  >
                    Cancelar
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {forgotPasswordStep === 'none' && (
            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
              <button 
                onClick={() => setIsLogin(!isLogin)}
                className="text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center justify-center gap-2 mx-auto"
              >
                {isLogin ? (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Não tem uma conta? Cadastre-se
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    Já tem uma conta? Entre agora
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
