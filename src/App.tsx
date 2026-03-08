import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Transactions from './components/Transactions';
import ImportStatement from './components/ImportStatement';
import AIChat from './components/AIChat';
import Auth from './components/Auth';
import { AllTransactionsModal, TipsModal, EditTransactionModal, UpdateModal } from './components/Modals';
import { Transaction, Category, FixedExpense, User, BankConnection } from './types';
import { cn } from './lib/utils';
import { format } from 'date-fns';
import BankConnectionModal from './components/BankConnectionModal';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
  const [bankConnections, setBankConnections] = useState<BankConnection[]>([]);
  const [smartCaptureEnabled, setSmartCaptureEnabled] = useState(() => {
    const saved = localStorage.getItem('smart_capture_enabled');
    return saved === null ? true : saved === 'true';
  });
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    return (saved as 'light' | 'dark') || 'dark';
  });

  // Modal states
  const [showTips, setShowTips] = useState(false);
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const toggleSmartCapture = () => {
    setSmartCaptureEnabled(prev => {
      const newValue = !prev;
      localStorage.setItem('smart_capture_enabled', String(newValue));
      return newValue;
    });
  };

  const handleLogin = (newToken: string, newUser: User) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setTransactions([]);
    setFixedExpenses([]);
  };

  const fetchData = async () => {
    if (!token) return;
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const [txRes, catRes, fixedRes, meRes, bankRes] = await Promise.all([
        fetch('/api/transactions', { headers }),
        fetch('/api/categories'),
        fetch('/api/fixed-expenses', { headers }),
        fetch('/api/auth/me', { headers }),
        fetch('/api/bank-connections', { headers })
      ]);
      
      if (txRes.status === 401) {
        handleLogout();
        return;
      }

      const txData = await txRes.json();
      const catData = await catRes.json();
      const fixedData = await fixedRes.json();
      const meData = await meRes.json();
      const bankData = await bankRes.json();
      
      setTransactions(txData);
      setCategories(catData);
      setFixedExpenses(fixedData);
      setUser(meData);
      setBankConnections(bankData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [token]);

  const handleAddTransaction = async (tx: Partial<Transaction>) => {
    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(tx),
      });
      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error adding transaction:', error);
    }
  };

  const handleDeleteTransaction = async (id: number) => {
    try {
      const response = await fetch(`/api/transactions/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error deleting transaction:', error);
    }
  };

  const handleDeleteMultipleTransactions = async (ids: number[]) => {
    try {
      await Promise.all(ids.map(id => fetch(`/api/transactions/${id}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })));
      fetchData();
    } catch (error) {
      console.error('Error deleting multiple transactions:', error);
    }
  };

  const handleUpdateTransaction = async (id: number, tx: Partial<Transaction>) => {
    try {
      const response = await fetch(`/api/transactions/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(tx),
      });
      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error updating transaction:', error);
    }
  };

  const handleAddFixedExpense = async (expense: Partial<FixedExpense>) => {
    try {
      const response = await fetch('/api/fixed-expenses', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(expense),
      });
      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error adding fixed expense:', error);
    }
  };

  const handleToggleFixedExpense = async (id: number, is_paid: boolean) => {
    try {
      const response = await fetch(`/api/fixed-expenses/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ is_paid }),
      });
      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error toggling fixed expense:', error);
    }
  };

  const handleUpdateFixedExpense = async (id: number, expense: Partial<FixedExpense>) => {
    try {
      const response = await fetch(`/api/fixed-expenses/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(expense),
      });
      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error updating fixed expense:', error);
    }
  };

  const handleDeleteFixedExpense = async (id: number) => {
    try {
      const response = await fetch(`/api/fixed-expenses/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error deleting fixed expense:', error);
    }
  };

  const handleUpdateProfile = async (name: string, photo_url: string) => {
    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, photo_url }),
      });
      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const handleConnectBank = async (bankName: string) => {
    try {
      const response = await fetch('/api/bank-connections', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ bank_name: bankName }),
      });
      if (response.ok) {
        // Simulate importing some transactions
        const mockTransactions = [
          { amount: 1500, date: format(new Date(), 'yyyy-MM-dd'), category_id: 7, description: `Saldo Inicial ${bankName}`, type: 'income' },
          { amount: 45.90, date: format(new Date(), 'yyyy-MM-dd'), category_id: 1, description: 'Uber *Bank Sync', type: 'expense' },
          { amount: 120.00, date: format(new Date(), 'yyyy-MM-dd'), category_id: 1, description: 'Restaurante *Bank Sync', type: 'expense' },
        ];
        
        await fetch('/api/transactions/bulk', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(mockTransactions),
        });

        fetchData();
        setShowBankModal(false);
      }
    } catch (error) {
      console.error('Error connecting bank:', error);
    }
  };

  const handleDisconnectBank = async (id: number) => {
    try {
      const response = await fetch(`/api/bank-connections/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error disconnecting bank:', error);
    }
  };

  const totalBalance = transactions.reduce((acc, t) => 
    t.type === 'income' ? acc + t.amount : acc - t.amount, 0
  );

  if (loading) {
    return (
      <div className={`flex min-h-screen items-center justify-center transition-colors duration-300 ${
        theme === 'dark' ? "bg-slate-950" : "bg-slate-50"
      }`}>
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent"></div>
          <p className="font-medium text-slate-500">Carregando suas finanças...</p>
        </div>
      </div>
    );
  }

  if (!token) {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <Layout 
      activeTab={activeTab} 
      setActiveTab={setActiveTab} 
      theme={theme} 
      toggleTheme={toggleTheme}
      onOpenTips={() => setShowTips(true)}
      onCheckUpdate={() => setShowUpdateModal(true)}
      user={user}
      onLogout={handleLogout}
    >
      {activeTab === 'dashboard' && (
        <Dashboard 
          user={user}
          onUpdateProfile={handleUpdateProfile}
          transactions={transactions} 
          categories={categories} 
          fixedExpenses={fixedExpenses}
          bankConnections={bankConnections}
          onConnectBank={() => setShowBankModal(true)}
          onDisconnectBank={handleDisconnectBank}
          smartCaptureEnabled={smartCaptureEnabled}
          onToggleSmartCapture={toggleSmartCapture}
          onDelete={handleDeleteTransaction} 
          onEdit={(tx) => setEditingTransaction(tx)}
          onViewAll={() => setShowAllTransactions(true)}
          onAddFixedExpense={handleAddFixedExpense}
          onUpdateFixedExpense={handleUpdateFixedExpense}
          onToggleFixedExpense={handleToggleFixedExpense}
          onDeleteFixedExpense={handleDeleteFixedExpense}
        />
      )}
      {activeTab === 'income' && (
        <Transactions 
          type="income" 
          transactions={transactions} 
          categories={categories} 
          onAdd={handleAddTransaction}
          onDelete={handleDeleteTransaction}
          onDeleteMultiple={handleDeleteMultipleTransactions}
          onEdit={(tx) => setEditingTransaction(tx)}
          theme={theme}
        />
      )}
      {activeTab === 'expenses' && (
        <Transactions 
          type="expense" 
          transactions={transactions} 
          categories={categories} 
          onAdd={handleAddTransaction}
          onDelete={handleDeleteTransaction}
          onDeleteMultiple={handleDeleteMultipleTransactions}
          onEdit={(tx) => setEditingTransaction(tx)}
          theme={theme}
        />
      )}
      {activeTab === 'import' && (
        <ImportStatement onImportSuccess={fetchData} theme={theme} categories={categories} token={token || ''} />
      )}

      {/* Modals */}
      <TipsModal 
        isOpen={showTips} 
        onClose={() => setShowTips(false)} 
        balance={totalBalance} 
        theme={theme} 
      />
      <AllTransactionsModal 
        isOpen={showAllTransactions} 
        onClose={() => setShowAllTransactions(false)} 
        transactions={transactions} 
        categories={categories} 
        onDelete={handleDeleteTransaction} 
        onEdit={(tx) => setEditingTransaction(tx)} 
        theme={theme} 
      />
      <EditTransactionModal 
        isOpen={!!editingTransaction} 
        onClose={() => setEditingTransaction(null)} 
        transaction={editingTransaction} 
        categories={categories} 
        onSave={handleUpdateTransaction} 
        theme={theme} 
      />
      <UpdateModal 
        isOpen={showUpdateModal} 
        onClose={() => setShowUpdateModal(false)} 
        onUpdate={() => {
          alert("Iniciando download da atualização...");
          setShowUpdateModal(false);
        }}
        theme={theme} 
      />

      <BankConnectionModal
        isOpen={showBankModal}
        onClose={() => setShowBankModal(false)}
        onConnect={handleConnectBank}
        onDisconnect={handleDisconnectBank}
        bankConnections={bankConnections}
        theme={theme}
      />
      
      <AIChat 
        categories={categories} 
        transactions={transactions}
        fixedExpenses={fixedExpenses}
        onAddTransaction={handleAddTransaction} 
        theme={theme} 
        user={user}
        bankConnected={bankConnections.length > 0}
        smartCaptureEnabled={smartCaptureEnabled}
      />
    </Layout>
  );
}


