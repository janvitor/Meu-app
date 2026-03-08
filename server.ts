import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { format } from "date-fns";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "meu-financeiro-secret-key-123";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("finance.db");
db.pragma('journal_mode = WAL');

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT UNIQUE,
    password_hash TEXT NOT NULL,
    photo_url TEXT,
    level INTEGER DEFAULT 1,
    badges TEXT DEFAULT '[]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT CHECK(type IN ('income', 'expense')) NOT NULL,
    icon TEXT,
    color TEXT
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    amount REAL NOT NULL CHECK(amount > 0),
    date TEXT NOT NULL,
    category_id INTEGER,
    description TEXT,
    type TEXT CHECK(type IN ('income', 'expense')) NOT NULL,
    payment_method TEXT,
    source TEXT,
    fixed_expense_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories (id)
  );

  CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date);
  CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);

  CREATE TABLE IF NOT EXISTS fixed_expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    description TEXT NOT NULL,
    amount REAL NOT NULL CHECK(amount > 0),
    category_id INTEGER,
    is_paid INTEGER DEFAULT 0,
    due_date TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories (id)
  );

  CREATE INDEX IF NOT EXISTS idx_fixed_expenses_user ON fixed_expenses(user_id);

  CREATE TABLE IF NOT EXISTS bank_connections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    bank_name TEXT NOT NULL,
    status TEXT DEFAULT 'connected',
    last_sync DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS reset_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    login TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at INTEGER NOT NULL
  );
`);

// Seed Categories
const categoriesCount = db.prepare("SELECT COUNT(*) as count FROM categories").get() as any;
if (categoriesCount.count === 0) {
  const seedCategories = [
    { name: 'Alimentação', type: 'expense', icon: 'Utensils', color: '#f59e0b' },
    { name: 'Transporte', type: 'expense', icon: 'Car', color: '#3b82f6' },
    { name: 'Moradia', type: 'expense', icon: 'Home', color: '#ef4444' },
    { name: 'Saúde', type: 'expense', icon: 'Heart', color: '#10b981' },
    { name: 'Educação', type: 'expense', icon: 'Book', color: '#8b5cf6' },
    { name: 'Lazer', type: 'expense', icon: 'Smile', color: '#ec4899' },
    { name: 'Salário', type: 'income', icon: 'DollarSign', color: '#10b981' },
    { name: 'Investimentos', type: 'income', icon: 'TrendingUp', color: '#3b82f6' },
    { name: 'Outros', type: 'income', icon: 'Plus', color: '#64748b' },
    { name: 'Outros', type: 'expense', icon: 'Minus', color: '#64748b' },
  ];

  const insertCategory = db.prepare("INSERT INTO categories (name, type, icon, color) VALUES (?, ?, ?, ?)");
  seedCategories.forEach(cat => insertCategory.run(cat.name, cat.type, cat.icon, cat.color));
}

// Migrations
const migrations = [
  { name: 'add_user_id_to_transactions', sql: "ALTER TABLE transactions ADD COLUMN user_id INTEGER REFERENCES users(id)" },
  { name: 'add_user_id_to_fixed_expenses', sql: "ALTER TABLE fixed_expenses ADD COLUMN user_id INTEGER REFERENCES users(id)" },
  { name: 'add_phone_to_users', sql: "ALTER TABLE users ADD COLUMN phone TEXT UNIQUE" },
  { name: 'add_photo_url_to_users', sql: "ALTER TABLE users ADD COLUMN photo_url TEXT" },
  { name: 'add_level_to_users', sql: "ALTER TABLE users ADD COLUMN level INTEGER DEFAULT 1" },
  { name: 'add_badges_to_users', sql: "ALTER TABLE users ADD COLUMN badges TEXT DEFAULT '[]'" },
  { name: 'add_created_at_to_users', sql: "ALTER TABLE users ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP" },
  { name: 'add_created_at_to_transactions', sql: "ALTER TABLE transactions ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP" },
  { name: 'add_created_at_to_fixed_expenses', sql: "ALTER TABLE fixed_expenses ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP" },
  { name: 'add_index_transactions_user_date', sql: "CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date)" },
  { name: 'add_index_fixed_expenses_user', sql: "CREATE INDEX IF NOT EXISTS idx_fixed_expenses_user ON fixed_expenses(user_id)" }
];

migrations.forEach(m => {
  try {
    db.prepare(m.sql).run();
    console.log(`Migration successful: ${m.name}`);
  } catch (e) {
    // Ignore errors if column already exists
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // Auth Middleware
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      req.userId = decoded.userId;
      next();
    } catch (e) {
      res.status(401).json({ error: "Invalid token" });
    }
  };

  // Auth Routes
  app.post("/api/auth/register", async (req, res) => {
    const { name, email, phone, password } = req.body;
    if (!name || (!email && !phone) || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    try {
      const hash = await bcrypt.hash(password, 10);
      const result = db.prepare(`
        INSERT INTO users (name, email, phone, password_hash)
        VALUES (?, ?, ?, ?)
      `).run(name, email || null, phone || null, hash);
      
      const token = jwt.sign({ userId: result.lastInsertRowid }, JWT_SECRET);
      res.json({ token, user: { id: result.lastInsertRowid, name, email, phone } });
    } catch (e: any) {
      if (e.message.includes("UNIQUE")) {
        return res.status(400).json({ error: "Email or phone already registered" });
      }
      res.status(500).json({ error: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { login, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE email = ? OR phone = ?").get(login, login) as any;
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign({ userId: user.id }, JWT_SECRET);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, phone: user.phone, photo_url: user.photo_url } });
  });

  app.get("/api/auth/me", authenticate, (req: any, res) => {
    const user = db.prepare("SELECT id, name, email, phone, photo_url, level, badges FROM users WHERE id = ?").get(req.userId) as any;
    res.json(user);
  });

  app.post("/api/auth/forgot-password", (req, res) => {
    const { login } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE email = ? OR phone = ?").get(login, login) as any;
    
    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 2 * 60 * 1000; // 2 minutes

    db.prepare("DELETE FROM reset_codes WHERE login = ?").run(login);
    db.prepare("INSERT INTO reset_codes (login, code, expires_at) VALUES (?, ?, ?)").run(login, code, expiresAt);

    console.log(`[AUTH] Código de recuperação para ${login}: ${code}`);
    res.json({ success: true, message: "Código enviado com sucesso (verifique o console)" });
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    const { login, code, newPassword } = req.body;
    const resetEntry = db.prepare("SELECT * FROM reset_codes WHERE login = ? AND code = ?").get(login, code) as any;

    if (!resetEntry) {
      return res.status(400).json({ error: "Código inválido" });
    }

    if (Date.now() > resetEntry.expires_at) {
      db.prepare("DELETE FROM reset_codes WHERE id = ?").run(resetEntry.id);
      return res.status(400).json({ error: "Código expirado" });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    db.prepare("UPDATE users SET password_hash = ? WHERE email = ? OR phone = ?").run(hash, login, login);
    db.prepare("DELETE FROM reset_codes WHERE login = ?").run(login);

    res.json({ success: true, message: "Senha alterada com sucesso" });
  });

  app.put("/api/auth/profile", authenticate, (req: any, res) => {
    const { name, photo_url } = req.body;
    db.prepare("UPDATE users SET name = ?, photo_url = ? WHERE id = ?").run(name, photo_url, req.userId);
    res.json({ success: true });
  });

  // API Routes
  app.get("/api/transactions", authenticate, (req: any, res) => {
    const transactions = db.prepare(`
      SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ?
      ORDER BY t.date DESC
    `).all(req.userId);
    res.json(transactions);
  });

  app.post("/api/transactions", authenticate, (req: any, res) => {
    const { amount, date, category_id, description, type, payment_method, source, fixed_expense_id } = req.body;
    const result = db.prepare(`
      INSERT INTO transactions (amount, date, category_id, description, type, payment_method, source, fixed_expense_id, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(amount, date, category_id, description, type, payment_method, source, fixed_expense_id, req.userId);
    res.json({ id: result.lastInsertRowid });
  });

  app.delete("/api/transactions/:id", authenticate, (req: any, res) => {
    db.prepare("DELETE FROM transactions WHERE id = ? AND user_id = ?").run(req.params.id, req.userId);
    res.json({ success: true });
  });

  app.put("/api/transactions/:id", authenticate, (req: any, res) => {
    const { amount, date, category_id, description, type, payment_method, source, fixed_expense_id } = req.body;
    db.prepare(`
      UPDATE transactions 
      SET amount = ?, date = ?, category_id = ?, description = ?, type = ?, payment_method = ?, source = ?, fixed_expense_id = ?
      WHERE id = ? AND user_id = ?
    `).run(amount, date, category_id, description, type, payment_method, source, fixed_expense_id, req.params.id, req.userId);
    res.json({ success: true });
  });

  app.get("/api/categories", (req, res) => {
    const categories = db.prepare("SELECT * FROM categories").all();
    res.json(categories);
  });

  // Fixed Expenses Routes
  app.get("/api/fixed-expenses", authenticate, (req: any, res) => {
    const expenses = db.prepare(`
      SELECT f.*, c.name as category_name, c.color as category_color
      FROM fixed_expenses f
      LEFT JOIN categories c ON f.category_id = c.id
      WHERE f.user_id = ?
    `).all(req.userId);
    res.json(expenses);
  });

  app.post("/api/fixed-expenses", authenticate, (req: any, res) => {
    const { description, amount, category_id, due_date } = req.body;
    const result = db.prepare(`
      INSERT INTO fixed_expenses (description, amount, category_id, due_date, user_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(description, amount, category_id, due_date, req.userId);
    res.json({ id: result.lastInsertRowid });
  });

  app.put("/api/fixed-expenses/:id", authenticate, (req: any, res) => {
    const { description, amount, category_id, due_date, is_paid, is_reset } = req.body;
    const id = req.params.id;

    db.transaction(() => {
      if (description !== undefined || amount !== undefined || category_id !== undefined || due_date !== undefined) {
        const current = db.prepare("SELECT * FROM fixed_expenses WHERE id = ? AND user_id = ?").get(id, req.userId) as any;
        db.prepare(`
          UPDATE fixed_expenses 
          SET description = ?, amount = ?, category_id = ?, due_date = ?
          WHERE id = ? AND user_id = ?
        `).run(
          description ?? current.description, 
          amount ?? current.amount, 
          category_id ?? current.category_id, 
          due_date ?? current.due_date, 
          id, 
          req.userId
        );
      }

      if (is_paid !== undefined) {
        db.prepare("UPDATE fixed_expenses SET is_paid = ? WHERE id = ? AND user_id = ?").run(is_paid ? 1 : 0, id, req.userId);
        
        if (is_paid) {
          const expense = db.prepare("SELECT * FROM fixed_expenses WHERE id = ? AND user_id = ?").get(id, req.userId) as any;
          db.prepare(`
            INSERT INTO transactions (amount, date, category_id, description, type, payment_method, source, fixed_expense_id, user_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(expense.amount, format(new Date(), 'yyyy-MM-dd'), expense.category_id, `Pagamento: ${expense.description}`, 'expense', 'Outro', 'Despesa Fixa', id, req.userId);
        } else if (!is_reset) {
          // Only delete transaction if it's NOT an automatic reset
          db.prepare("DELETE FROM transactions WHERE fixed_expense_id = ? AND user_id = ?").run(id, req.userId);
        }
      }
    })();
    res.json({ success: true });
  });

  app.delete("/api/fixed-expenses/:id", authenticate, (req: any, res) => {
    db.prepare("DELETE FROM fixed_expenses WHERE id = ? AND user_id = ?").run(req.params.id, req.userId);
    res.json({ success: true });
  });

  // Bank Connection Routes
  app.get("/api/bank-connections", authenticate, (req: any, res) => {
    const connections = db.prepare("SELECT * FROM bank_connections WHERE user_id = ?").all(req.userId);
    res.json(connections);
  });

  app.post("/api/bank-connections", authenticate, (req: any, res) => {
    const { bank_name } = req.body;
    const result = db.prepare("INSERT INTO bank_connections (user_id, bank_name) VALUES (?, ?)").run(req.userId, bank_name);
    res.json({ id: result.lastInsertRowid });
  });

  app.delete("/api/bank-connections/:id", authenticate, (req: any, res) => {
    db.prepare("DELETE FROM bank_connections WHERE id = ? AND user_id = ?").run(req.params.id, req.userId);
    res.json({ success: true });
  });

  app.post("/api/transactions/bulk", authenticate, (req: any, res) => {
    const transactions = req.body;
    if (!Array.isArray(transactions)) {
      return res.status(400).json({ error: "Invalid payload, expected array" });
    }

    try {
      const insert = db.prepare(`
        INSERT INTO transactions (amount, date, category_id, description, type, user_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      const transactionBatch = db.transaction((txs) => {
        for (const t of txs) {
          if (t.amount && t.date && t.description && t.type) {
            insert.run(
              t.amount,
              t.date,
              t.category_id || 10,
              t.description,
              t.type,
              req.userId
            );
          }
        }
      });

      transactionBatch(transactions);
      res.json({ success: true, count: transactions.length });
    } catch (error) {
      console.error("Bulk Insert Error:", error);
      res.status(500).json({ error: "Failed to save transactions" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
