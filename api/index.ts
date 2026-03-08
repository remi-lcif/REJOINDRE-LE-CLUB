import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// In Vercel, we must use /tmp for the database if we want to write to it.
const dbPath = process.env.NODE_ENV === 'production' 
  ? path.join('/tmp', 'database.db')
  : path.join(__dirname, '..', 'database.db');

let db: any = null;
let dbError: string | null = null;

async function initDatabase() {
  try {
    const Database = (await import("better-sqlite3")).default;
    db = new Database(dbPath);
    console.log("Database connected at:", dbPath);
    
    // Initialize database
    db.exec(`
      CREATE TABLE IF NOT EXISTS links (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        url TEXT NOT NULL,
        image_url TEXT,
        order_index INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );

      -- Ensure settings exist if not already there
      INSERT OR IGNORE INTO settings (key, value) VALUES ('title', 'le club immobilier français');
      INSERT OR IGNORE INTO settings (key, value) VALUES ('bio', 'Découvrez le futur de l''immobilier.');
      INSERT OR IGNORE INTO settings (key, value) VALUES ('profile_image', 'https://res.cloudinary.com/dji8akleo/image/upload/v1772999427/3_quhn7t.png');
      INSERT OR IGNORE INTO settings (key, value) VALUES ('instagram_url', 'https://www.instagram.com/leclubimmobilierfrancais/');
      INSERT OR IGNORE INTO settings (key, value) VALUES ('linkedin_url', 'https://www.linkedin.com/company/leclubimmobilierfran%C3%A7ais');
    `);

    // Seed initial data if empty
    const linkCount = db.prepare("SELECT COUNT(*) as count FROM links").get() as { count: number };
    if (linkCount.count === 0) {
      const insertLink = db.prepare("INSERT INTO links (title, url, image_url, order_index) VALUES (?, ?, ?, ?)");
      insertLink.run("Lundi 9 mars 18h30", "https://events.teams.microsoft.com/event/b16b3ad0-6be4-4fab-98f2-d2fcf40fcd25@0f7a9099-2bcb-4ce0-b36f-a8b025d7c5f7", null, 0);
      insertLink.run("Mardi 10 Mars 13h", "https://events.teams.microsoft.com/event/52798295-e55b-47d5-8d1e-f8e1bae24130@0f7a9099-2bcb-4ce0-b36f-a8b025d7c5f7", null, 1);
      insertLink.run("Mercredi 11 Mars 17h30", "https://events.teams.microsoft.com/event/d65e6c33-9542-4b7b-b0c0-384bd1405496@0f7a9099-2bcb-4ce0-b36f-a8b025d7c5f7", null, 2);
      insertLink.run("Jeudi 12 Mars 19h", "https://events.teams.microsoft.com/event/dfe315b9-2b20-4fb1-89fa-c8b0e806d538@0f7a9099-2bcb-4ce0-b36f-a8b025d7c5f7", null, 3);
      insertLink.run("Réussir dans l'immobilier avec le club🏠", "https://youtube.com/shorts/-YCBifslVsA?feature=share", "https://res.cloudinary.com/dji8akleo/image/upload/v1773000626/14_by2bos.jpg", 4);
    }
  } catch (error: any) {
    console.error("Database initialization failed:", error);
    dbError = error.message;
  }
}

const app = express();
app.use(express.json());

// Initialize DB on first request or at startup
const dbPromise = initDatabase();

app.use(async (req, res, next) => {
  await dbPromise;
  next();
});

// Auth Route
app.post("/api/login", (req, res) => {
  try {
    const { username, password } = req.body;
    const adminUser = process.env.ADMIN_USER || "leclubimmo";
    const adminPass = process.env.ADMIN_PASS || "LCIF03";

    if (username?.trim() === adminUser && password?.trim() === adminPass) {
      res.json({ success: true, token: "admin-token" });
    } else {
      res.status(401).json({ success: false, message: "Identifiants incorrects" });
    }
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, message: "Erreur serveur lors de la connexion" });
  }
});

const authMiddleware = (req: any, res: any, next: any) => {
  const token = req.headers.authorization;
  if (token === "admin-token") {
    next();
  } else {
    res.status(401).json({ success: false, message: "Non autorisé" });
  }
};

app.get("/api/links", (req, res) => {
  if (!db) return res.status(500).json({ error: "Database not available", details: dbError });
  const links = db.prepare("SELECT * FROM links ORDER BY order_index ASC").all();
  res.json(links);
});

app.post("/api/links", authMiddleware, (req, res) => {
  if (!db) return res.status(500).json({ success: false, message: "Base de données non disponible" });
  const { title, url, image_url, order_index } = req.body;
  const info = db.prepare("INSERT INTO links (title, url, image_url, order_index) VALUES (?, ?, ?, ?)").run(title, url, image_url || null, order_index || 0);
  res.json({ id: info.lastInsertRowid, title, url, image_url, order_index });
});

app.put("/api/links/:id", authMiddleware, (req, res) => {
  if (!db) return res.status(500).json({ success: false, message: "Base de données non disponible" });
  const { id } = req.params;
  const { title, url, image_url, order_index } = req.body;
  db.prepare("UPDATE links SET title = ?, url = ?, image_url = ?, order_index = ? WHERE id = ?").run(title, url, image_url || null, order_index, id);
  res.json({ success: true });
});

app.delete("/api/links/:id", authMiddleware, (req, res) => {
  if (!db) return res.status(500).json({ success: false, message: "Base de données non disponible" });
  const { id } = req.params;
  db.prepare("DELETE FROM links WHERE id = ?").run(id);
  res.json({ success: true });
});

app.get("/api/settings", (req, res) => {
  if (!db) return res.status(500).json({ error: "Database not available", details: dbError });
  const settings = db.prepare("SELECT * FROM settings").all();
  const settingsObj = settings.reduce((acc: any, curr: any) => {
    acc[curr.key] = curr.value;
    return acc;
  }, {});
  res.json(settingsObj);
});

app.put("/api/settings", authMiddleware, (req, res) => {
  if (!db) return res.status(500).json({ success: false, message: "Base de données non disponible" });
  const { title, bio, profile_image, instagram_url } = req.body;
  const update = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
  if (title !== undefined) update.run("title", title);
  if (bio !== undefined) update.run("bio", bio);
  if (profile_image !== undefined) update.run("profile_image", profile_image);
  if (instagram_url !== undefined) update.run("instagram_url", instagram_url);
  res.json({ success: true });
});

// Vite middleware for development
if (process.env.NODE_ENV !== "production") {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
  
  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
