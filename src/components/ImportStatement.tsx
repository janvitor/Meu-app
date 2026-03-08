import React, { useState, useRef } from 'react';
import { FileText, Sparkles, Loader2, CheckCircle2, AlertCircle, Upload, FileUp, Trash2, Check, X } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { Transaction, Category } from '../types';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../lib/utils';

interface ImportStatementProps {
  onImportSuccess: () => void;
  theme: 'light' | 'dark';
  categories: Category[];
  token: string;
}

export default function ImportStatement({ onImportSuccess, theme, categories, token }: ImportStatementProps) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'review' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [importCount, setImportCount] = useState(0);
  const [parsedTransactions, setParsedTransactions] = useState<Partial<Transaction>[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = async (importText?: string, imagePart?: { data: string, mimeType: string }) => {
    const textToProcess = importText || text;
    if (!textToProcess.trim() && !imagePart) return;

    setLoading(true);
    setStatus('idle');
    setErrorMessage('');
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const prompt = `
        Você é um sistema de análise financeira de alta precisão especializado em converter extratos bancários (texto, imagem ou PDF) em dados estruturados.
        Sua função é ler extratos de bancos brasileiros (Nubank, Itaú, Santander, Bradesco, etc.) e identificar transações reais.

        REGRAS DE IDENTIFICAÇÃO E CLASSIFICAÇÃO:
        1. IDENTIFICAÇÃO: Localize linhas com DATA + DESCRIÇÃO + VALOR.
        2. CLASSIFICAÇÃO DE TIPO (CRUCIAL):
           - ENTRADA ('income'): Se encontrar palavras como "Transferência recebida", "Pix recebido", "Depósito", "Crédito", "Resgate", "TED recebida", "DOC recebido", "Rendimento", "Salário". Ou se o valor NÃO tiver sinal de menos.
           - SAÍDA ('expense'): Se encontrar palavras como "Transferência enviada", "Pix enviado", "Compra no débito", "Pagamento", "Boleto pago", "Fatura", "Aplicação", "Débito automático". Ou se o valor tiver sinal de MENOS (-) na frente.
        3. VALORES: Converta para número decimal (ex: 1.300,00 -> 1300.00). Use sempre o valor absoluto no campo 'amount'.
        4. CATEGORIZAÇÃO: Tente identificar a categoria pelo contexto:
           - Supermercado, Padaria, Restaurante, iFood -> Alimentação (ID 4)
           - Uber, Posto, Combustível, Estacionamento -> Transporte (ID 5)
           - Aluguel, Condomínio, Luz, Água -> Moradia (ID 6)
           - Cinema, Netflix, Spotify, Jogos -> Lazer (ID 7)
           - Farmácia, Hospital, Dentista -> Saúde (ID 8)
           - Escola, Curso, Livros -> Educação (ID 9)
           - Pix pessoa física, Transferência -> Outros (ID 10)
        5. MÉTODO DE PAGAMENTO: Atribua obrigatoriamente um destes três: "Pix", "Cartão de Crédito" ou "Dinheiro".
        6. LIMPEZA: Ignore saldos iniciais/finais, mensagens do banco, rodapés e cabeçalhos.

        Categorias disponíveis (IDs e Nomes):
        ${JSON.stringify(categories.map(c => ({ id: c.id, name: c.name, type: c.type })))}

        ${imagePart ? 'Analise o arquivo do extrato fornecido (imagem ou PDF).' : `Extrato para análise: """ ${textToProcess} """`}

        Retorne um objeto JSON no formato:
        {
          "transactions": [
            { "amount": number, "date": "YYYY-MM-DD", "description": "string", "type": "income"|"expense", "category_id": number }
          ],
          "summary": {
            "total_income": number,
            "total_expense": number,
            "final_balance": number
          }
        }
      `;

      const contents = imagePart 
        ? { parts: [{ inlineData: imagePart }, { text: prompt }] }
        : prompt;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents,
        config: {
          responseMimeType: "application/json"
        }
      });

      const responseText = response.text || "{}";
      let data: any = {};
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        const match = responseText.match(/\{.*\}/s);
        if (match) {
          data = JSON.parse(match[0]);
        }
      }
      
      const transactions = data.transactions || [];
      if (!Array.isArray(transactions)) {
        throw new Error("A IA não retornou uma lista válida de transações.");
      }

      setParsedTransactions(transactions);
      setStatus('review');
    } catch (error: any) {
      console.error(error);
      setErrorMessage(error.message);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const confirmImport = async () => {
    setLoading(true);
    try {
      const saveResponse = await fetch('/api/transactions/bulk', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(parsedTransactions),
      });

      const data = await saveResponse.json();
      if (!saveResponse.ok) throw new Error(data.error || 'Falha ao salvar transações');

      setImportCount(data.count);
      setStatus('success');
      setText('');
      onImportSuccess();
    } catch (error: any) {
      setErrorMessage(error.message);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const removeParsedTransaction = (index: number) => {
    setParsedTransactions(prev => prev.filter((_, i) => i !== index));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('image/') || file.type === 'application/pdf') {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = (event.target?.result as string).split(',')[1];
        handleImport(undefined, { data: base64, mimeType: file.type });
      };
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        handleImport(content);
      };
      reader.readAsText(file);
    }
    
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Importar Extrato</h2>
          <p className="text-[10px] text-slate-500">IA de alta precisão para Nubank, Itaú e outros.</p>
        </div>
      </div>

      {status === 'idle' && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 p-4 shadow-sm border border-slate-100 dark:border-slate-800 animate-in fade-in duration-500">
          <div className="mb-3">
            <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Cole seu extrato abaixo</label>
            <textarea 
              value={text}
              onChange={e => setText(e.target.value)}
              className="mt-1.5 h-32 w-full resize-none rounded-xl bg-slate-50 dark:bg-slate-800 p-3 text-xs outline-none ring-emerald-500 focus:ring-2 text-slate-900 dark:text-slate-100"
              placeholder="Ex: 01 JAN 2026 Pix IDEAL SUPERMERCADO 14,18..."
            />
          </div>

          <div className="flex flex-col gap-3">
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".txt,.csv,.json,.pdf,image/*"
              className="hidden"
            />
            
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => handleImport()}
                disabled={loading || !text.trim()}
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 font-bold text-white shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span className="text-sm">Analisar Extrato</span>
                  </>
                )}
              </button>

              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="flex items-center justify-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 py-3.5 font-bold text-slate-700 dark:text-slate-200 shadow-sm transition-all active:scale-95 disabled:opacity-50"
              >
                <FileUp className="h-4 w-4" />
                <span className="text-sm">Upload Arquivo/Imagem/PDF</span>
              </button>
            </div>

            <div className="flex items-center justify-center gap-2 text-[8px] font-bold uppercase tracking-wider text-slate-400">
              <Upload className="h-2.5 w-2.5" />
              Suporta texto, CSV, PDF ou Imagem
            </div>
          </div>
        </div>
      )}

      {status === 'review' && (
        <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
          <div className="rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black tracking-tight">Revisar Transações</h3>
              <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/50 px-3 py-1 text-[10px] font-bold text-emerald-600 uppercase">
                {parsedTransactions.length} Detectadas
              </span>
            </div>

            <div className="max-h-[400px] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {parsedTransactions.map((tx, index) => (
                <div key={index} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 p-4 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0",
                      tx.type === 'income' ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                    )}>
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate">{tx.description}</p>
                      <p className="text-[10px] text-slate-500 font-medium uppercase">
                        {tx.date && format(parseISO(tx.date), 'dd MMM yyyy', { locale: ptBR })} • {categories.find(c => c.id === tx.category_id)?.name || 'Outros'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className={cn(
                      "text-sm font-black whitespace-nowrap",
                      tx.type === 'income' ? "text-emerald-600" : "text-rose-600"
                    )}>
                      {tx.type === 'income' ? '+' : '-'} R$ {tx.amount?.toFixed(2)}
                    </p>
                    <button 
                      onClick={() => removeParsedTransaction(index)}
                      className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex gap-3">
              <button 
                onClick={() => setStatus('idle')}
                className="flex-1 rounded-2xl bg-slate-100 dark:bg-slate-800 py-4 font-bold text-slate-600 dark:text-slate-300 transition-all active:scale-95"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmImport}
                disabled={loading || parsedTransactions.length === 0}
                className="flex-[2] flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-4 font-bold text-white shadow-xl shadow-emerald-200 dark:shadow-emerald-900/20 transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Check className="h-5 w-5" /> Confirmar e Salvar</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {status === 'success' && (
        <div className="flex flex-col items-center gap-4 rounded-3xl bg-emerald-50 dark:bg-emerald-950/20 p-8 text-center border border-emerald-100 dark:border-emerald-900/30 animate-in zoom-in duration-300">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <div className="space-y-1">
            <h4 className="text-xl font-black text-emerald-800 dark:text-emerald-200">Importação Concluída!</h4>
            <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
              Processamos seu extrato com sucesso.
            </p>
          </div>
          <div className="rounded-2xl bg-white dark:bg-slate-900 px-4 py-2 shadow-sm border border-emerald-100 dark:border-emerald-900/50">
            <span className="text-lg font-black text-emerald-600">{importCount}</span>
            <span className="ml-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Transações adicionadas</span>
          </div>
          <button 
            onClick={() => setStatus('idle')}
            className="mt-2 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
          >
            Importar outro extrato
          </button>
        </div>
      )}

      {status === 'error' && (
        <div className="flex items-center gap-3 rounded-2xl bg-rose-50 dark:bg-rose-950/30 p-4 text-rose-800 dark:text-rose-200 border border-rose-100 dark:border-rose-900/50 animate-in fade-in slide-in-from-bottom-4">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm font-medium">
            {errorMessage || "Ocorreu um erro ao processar o extrato. Tente novamente."}
          </p>
        </div>
      )}

      <div className="rounded-2xl bg-slate-100 dark:bg-slate-800 p-4">
        <h4 className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400">
          <FileText className="h-4 w-4" />
          Como funciona?
        </h4>
        <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
          Nossa inteligência artificial lê o texto do seu extrato, identifica datas, valores e descrições, e automaticamente categoriza cada gasto (ex: iFood como Alimentação, Uber como Transporte).
        </p>
      </div>
    </div>
  );
}
