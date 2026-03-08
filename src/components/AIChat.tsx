import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Check, Edit2, Loader2, Bot, Image as ImageIcon, Paperclip, Mic, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import { Transaction, Category, User, FixedExpense } from '../types';
import { cn } from '../lib/utils';
import { format, isSameDay } from 'date-fns';

interface AIChatProps {
  categories: Category[];
  transactions: Transaction[];
  fixedExpenses: FixedExpense[];
  onAddTransaction: (tx: Partial<Transaction>) => Promise<void>;
  theme: 'light' | 'dark';
  user?: User | null;
  bankConnected?: boolean;
  smartCaptureEnabled?: boolean;
}

const SUCCESS_MESSAGES = [
  "Transação registrada com sucesso! 📊 Seu controle financeiro está ficando cada vez melhor.",
  "Entrada registrada! 💰 Ótimo ver dinheiro entrando.",
  "Saída registrada! 📉 Tudo anotado, seu controle continua em dia.",
  "Perfeito! ✔️ Cada registro deixa seu planejamento mais claro.",
  "Feito! ✨ Manter as contas em dia é o segredo do sucesso.",
  "Registrado! 🚀 Você está no caminho certo para a liberdade financeira.",
  "Prontinho! ✅ Márcia anotou tudo aqui para você.",
  "Tudo certo! 🌟 Adorei a organização, continue assim!",
  "Anotado! 📝 Suas finanças agradecem esse cuidado."
];

const GREETINGS = (name?: string) => [
  `E aí${name ? ` ${name}` : ''}! Tudo bem? O que vamos registrar hoje? 😊`,
  `Olá${name ? ` ${name}` : ''}! Vamos organizar as finanças de hoje?`,
  `Pronta pra ajudar${name ? ` ${name}` : ''}! Teve algum gasto ou ganho hoje?`,
  `Oi${name ? ` ${name}` : ''}! Márcia na área. Vamos atualizar suas movimentações?`
];

export default function AIChat({ categories, transactions, fixedExpenses, onAddTransaction, theme, user, bankConnected, smartCaptureEnabled }: AIChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [parsedTx, setParsedTx] = useState<Partial<Transaction> | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant', content: string, image?: string }[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [pendingNotification, setPendingNotification] = useState<{ amount: number, description: string, type: 'income' | 'expense' } | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, isLoading]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        await handleAudioUpload(blob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Não foi possível acessar o microfone.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleAudioUpload = async (blob: Blob) => {
    setIsLoading(true);
    setChatHistory(prev => [...prev, { role: 'user', content: 'Enviou um áudio...' }]);
    
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(',')[1];
      await parseMessage('', undefined, base64);
    };
    reader.readAsDataURL(blob);
  };

  useEffect(() => {
    const lastGreetingDate = localStorage.getItem('last_greeting_date');
    const today = format(new Date(), 'yyyy-MM-dd');

    if (lastGreetingDate !== today) {
      const greetings = GREETINGS(user?.name);
      const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
      setChatHistory([{ role: 'assistant', content: randomGreeting }]);
      localStorage.setItem('last_greeting_date', today);
    }
  }, [user]);

  // Simulate notification detection
  useEffect(() => {
    if (bankConnected || !smartCaptureEnabled) return; // Don't use notifications if bank is connected or disabled

    const timer = setTimeout(() => {
      const shouldNotify = Math.random() > 0.7; // 30% chance to simulate a notification on load
      if (shouldNotify) {
        const amount = Math.floor(Math.random() * 200) + 50;
        const notification = {
          amount,
          description: 'PIX Recebido',
          type: 'income' as const
        };
        setPendingNotification(notification);
        setChatHistory(prev => [...prev, { 
          role: 'assistant', 
          content: `Detectei uma notificação: "PIX recebido de R$${amount}". Deseja registrar essa entrada no seu controle financeiro?` 
        }]);
        setIsOpen(true);
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [bankConnected]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      setChatHistory(prev => [...prev, { role: 'user', content: 'Enviou uma imagem para análise...', image: base64 }]);
      await parseMessage('', base64);
    };
    reader.readAsDataURL(file);
  };

  const parseMessage = async (text: string, base64Image?: string, base64Audio?: string) => {
    setIsLoading(true);
    if (text) {
      setChatHistory(prev => [...prev, { role: 'user', content: text }]);
      setMessage(''); // Clear input immediately
    }
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const model = "gemini-3-flash-preview";
      
      let contents: any[] = [];
      
      const systemPrompt = `Você é a Márcia, uma assistente financeira humana, simpática, encorajadora, organizada e positiva.
      
      CONTEXTO DO USUÁRIO:
      - Nome: ${user?.name || 'Usuário'}
      - Transações Atuais: ${JSON.stringify(transactions.slice(0, 50))} (mostrando as 50 mais recentes)
      - Despesas Fixas: ${JSON.stringify(fixedExpenses)}
      
      FUNÇÃO PRINCIPAL:
      1. Entender e registrar transações financeiras (texto, áudio ou imagem).
      2. Analisar as finanças do usuário e responder perguntas sobre gastos, economia e saúde financeira com total autonomia.
      3. Dar dicas personalizadas baseadas nos dados reais do usuário.
      
      IDENTIFICAÇÃO DE TRANSAÇÕES:
      Sempre identifique: Tipo (Entrada/Saída), Valor, Descrição curta, Categoria e Data.
      
      REGRA DA DESCRIÇÃO:
      A descrição deve ser CURTA e OBJETIVA. 
      Ex: "Venda de arte realizada para cliente" -> "Venda de arte"
      
      ANÁLISE FINANCEIRA:
      - Se o usuário perguntar "Quanto gastei com X?", procure nas transações.
      - Se perguntar "Posso comprar X?", analise o saldo atual e as despesas fixas pendentes.
      - Seja proativa em sugerir economias se notar gastos excessivos em categorias supérfluas.
      
      CONFIRMAÇÃO:
      Para registros de transação, você DEVE retornar um JSON para que o sistema mostre os dados para confirmação.
      
      RESPOSTAS SOBRE O APP:
      - Emblemas: Mostram progresso. Saldo positivo mensal = evolução.
      - Níveis: Bronze (0-1 mês), Prata (2-3), Ouro (4-5), Diamante (6-7), Premium (8+).
      
      PERSONALIDADE:
      - Seja humana, simpática e positiva. 
      - Use emojis.
      
      FORMATO DE RESPOSTA:
      - Para registros de transação, retorne o JSON:
      {
        "type": "income" | "expense",
        "amount": number,
        "description": string (curta),
        "category": string (uma de: ${categories.map(c => c.name).join(', ')}),
        "date": "YYYY-MM-DD" (hoje é ${format(new Date(), 'yyyy-MM-dd')})
      }
      - Para análises e conversas, responda em texto amigável e informativo.`;

      const parts: any[] = [{ text: systemPrompt }];
      
      if (base64Image) {
        parts.push({
          inlineData: {
            data: base64Image.split(',')[1],
            mimeType: "image/png",
          },
        });
      }
      
      if (base64Audio) {
        parts.push({
          inlineData: {
            data: base64Audio,
            mimeType: "audio/webm",
          },
        });
      }
      
      if (text) {
        parts.push({ text: `Mensagem do usuário: "${text}"` });
      } else if (base64Audio) {
        parts.push({ text: "O usuário enviou um áudio. Transcreva e identifique a transação." });
      } else if (base64Image) {
        parts.push({ text: "O usuário enviou uma imagem. Analise o comprovante e identifique a transação." });
      }

      contents = [{ parts }];

      const response = await ai.models.generateContent({
        model,
        contents,
      });

      const resultText = response.text || '';
      const jsonMatch = resultText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        const category = categories.find(c => c.name.toLowerCase() === data.category.toLowerCase()) || categories.find(c => c.name === 'Outro');
        
        setParsedTx({
          type: data.type,
          amount: data.amount,
          description: data.description,
          category_id: category?.id || 10,
          date: data.date,
          payment_method: 'Outro'
        });
      } else {
        // If no JSON, it's a normal chat response
        setChatHistory(prev => [...prev, { role: 'assistant', content: resultText }]);
      }
    } catch (error) {
      console.error('AI Error:', error);
      setChatHistory(prev => [...prev, { role: 'assistant', content: 'Desculpe, não consegui entender essa transação. Pode tentar de outra forma ou enviar um print mais nítido?' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (parsedTx) {
      await onAddTransaction(parsedTx);
      const messages = [
        "Prontinho! Já registrei isso pra você 💚",
        "Perfeito! Sua transação foi salva.",
        "Anotado! Organização financeira em dia.",
        "Boa! Cada registro ajuda no seu controle financeiro."
      ];
      const successMsg = messages[Math.floor(Math.random() * messages.length)];
      setChatHistory(prev => [...prev, { role: 'assistant', content: successMsg }]);
      setParsedTx(null);
      setIsEditing(false);
    }
  };

  const handleConfirmNotification = async () => {
    if (pendingNotification) {
      const category = categories.find(c => c.name === 'Outros' && c.type === pendingNotification.type) || categories[0];
      await onAddTransaction({
        amount: pendingNotification.amount,
        description: pendingNotification.description,
        type: pendingNotification.type,
        category_id: category.id,
        date: format(new Date(), 'yyyy-MM-dd'),
        payment_method: 'PIX'
      });
      setChatHistory(prev => [...prev, { role: 'assistant', content: 'Feito! Registrei o PIX no seu controle financeiro. ✅' }]);
      setPendingNotification(null);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-500 transition-all hover:scale-110 active:scale-95"
      >
        <MessageSquare className="h-6 w-6" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, y: 100, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.95 }}
              className="relative w-full max-w-md overflow-hidden rounded-[32px] bg-white dark:bg-slate-900 shadow-2xl border border-slate-100 dark:border-slate-800"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 p-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 border-2 border-emerald-200 dark:border-emerald-800 overflow-hidden">
                    <img 
                      src="https://picsum.photos/seed/woman/100/100" 
                      alt="Márcia" 
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-tight text-slate-900 dark:text-white">Márcia</h3>
                    <p className="text-[10px] text-emerald-600 font-bold">Online</p>
                  </div>
                </div>
                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Chat Area */}
              <div className="h-[400px] overflow-y-auto p-4 space-y-4 scrollbar-hide bg-white dark:bg-slate-900">
                {chatHistory.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center space-y-2 opacity-50">
                    <Bot className="h-12 w-12 text-emerald-600 mb-2" />
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Olá! Eu sou a Márcia. Como posso ajudar nas suas finanças hoje?</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Tente: "Gastei 50 reais no mercado agora há pouco"</p>
                  </div>
                )}
                
                {chatHistory.map((msg, i) => (
                  <div key={i} className={cn(
                    "flex w-full flex-col",
                    msg.role === 'user' ? "items-end" : "items-start"
                  )}>
                    {msg.image && (
                      <img 
                        src={msg.image} 
                        alt="Upload" 
                        className="max-w-[70%] rounded-2xl mb-2 border border-slate-200 dark:border-slate-700"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <div className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-2 text-xs font-medium shadow-sm",
                      msg.role === 'user' 
                        ? "bg-emerald-600 text-white rounded-tr-none" 
                        : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-none border border-slate-200 dark:border-slate-700"
                    )}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-tl-none px-4 py-2 border border-slate-200 dark:border-slate-700">
                      <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                    </div>
                  </div>
                )}

                {pendingNotification && (
                  <div className="flex flex-col gap-2 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50">
                    <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">Ação Necessária</p>
                    <div className="flex gap-2">
                      <button 
                        onClick={handleConfirmNotification}
                        className="flex-1 py-2 rounded-xl bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-500 transition-colors shadow-sm"
                      >
                        Sim, registrar
                      </button>
                      <button 
                        onClick={() => {
                          setPendingNotification(null);
                          setChatHistory(prev => [...prev, { role: 'assistant', content: 'Tudo bem, ignorei essa notificação. 👍' }]);
                        }}
                        className="flex-1 py-2 rounded-xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold uppercase tracking-widest border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        Ignorar
                      </button>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Confirmation Area */}
              <AnimatePresence>
                {parsedTx && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="absolute inset-x-0 bottom-[72px] p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 shadow-2xl z-10"
                  >
                    <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/50 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Confirmar Transação</h4>
                        <button onClick={() => setIsEditing(!isEditing)} className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors">
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {isEditing ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <select 
                              value={parsedTx.type}
                              onChange={e => setParsedTx({...parsedTx, type: e.target.value as 'income' | 'expense'})}
                              className="w-full rounded-xl bg-white dark:bg-slate-800 p-2 text-[10px] outline-none border border-slate-200 dark:border-slate-700"
                            >
                              <option value="income">Entrada</option>
                              <option value="expense">Saída</option>
                            </select>
                            <input 
                              type="number"
                              value={parsedTx.amount}
                              onChange={e => setParsedTx({...parsedTx, amount: parseFloat(e.target.value)})}
                              className="w-full rounded-xl bg-white dark:bg-slate-800 p-2 text-[10px] outline-none border border-slate-200 dark:border-slate-700"
                            />
                          </div>
                          <input 
                            type="text"
                            value={parsedTx.description}
                            onChange={e => setParsedTx({...parsedTx, description: e.target.value})}
                            className="w-full rounded-xl bg-white dark:bg-slate-800 p-2 text-[10px] outline-none border border-slate-200 dark:border-slate-700"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <select 
                              value={parsedTx.category_id}
                              onChange={e => setParsedTx({...parsedTx, category_id: parseInt(e.target.value)})}
                              className="w-full rounded-xl bg-white dark:bg-slate-800 p-2 text-[10px] outline-none border border-slate-200 dark:border-slate-700"
                            >
                              {categories.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                            </select>
                            <input 
                              type="date"
                              value={parsedTx.date}
                              onChange={e => setParsedTx({...parsedTx, date: e.target.value})}
                              className="w-full rounded-xl bg-white dark:bg-slate-800 p-2 text-[10px] outline-none border border-slate-200 dark:border-slate-700"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-y-2 text-[11px]">
                          <div>
                            <span className="text-slate-400 block uppercase text-[8px] font-bold">Tipo</span>
                            <span className={cn("font-bold", parsedTx.type === 'income' ? "text-emerald-600" : "text-rose-600")}>
                              {parsedTx.type === 'income' ? 'Entrada' : 'Saída'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block uppercase text-[8px] font-bold">Valor</span>
                            <span className="font-bold">R$ {parsedTx.amount?.toFixed(2)}</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-slate-400 block uppercase text-[8px] font-bold">Descrição</span>
                            <span className="font-bold">{parsedTx.description}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block uppercase text-[8px] font-bold">Categoria</span>
                            <span className="font-bold">{categories.find(c => c.id === parsedTx.category_id)?.name}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block uppercase text-[8px] font-bold">Data</span>
                            <span className="font-bold">{parsedTx.date}</span>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <button 
                          onClick={handleConfirm}
                          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-500 transition-colors"
                        >
                          <Check className="h-3 w-3" />
                          Confirmar
                        </button>
                        <button 
                          onClick={() => setParsedTx(null)}
                          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold uppercase tracking-widest hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                        >
                          <X className="h-3 w-3" />
                          Cancelar
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Input Area - WhatsApp Style */}
              <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (message.trim()) parseMessage(message);
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <div className="flex-1 flex items-center gap-2 bg-white dark:bg-slate-900 rounded-full px-4 py-2 shadow-sm border border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-slate-400 hover:text-emerald-600 transition-colors"
                    >
                      <Paperclip className="h-5 w-5" />
                    </button>
                    <input
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Mensagem"
                      className="flex-1 bg-transparent py-1 text-sm outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                    />
                    {message.trim() && (
                      <button
                        type="submit"
                        className="text-emerald-600 hover:text-emerald-500 transition-colors"
                      >
                        <Send className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                  
                  {message.trim() ? (
                    <button
                      type="submit"
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg hover:bg-emerald-500 transition-all active:scale-90"
                    >
                      <Send className="h-5 w-5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onMouseDown={startRecording}
                      onMouseUp={stopRecording}
                      onTouchStart={startRecording}
                      onTouchEnd={stopRecording}
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-full text-white shadow-lg transition-all active:scale-90",
                        isRecording ? "bg-rose-500 animate-pulse scale-110" : "bg-emerald-600 hover:bg-emerald-500"
                      )}
                    >
                      <Mic className="h-5 w-5" />
                    </button>
                  )}
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
