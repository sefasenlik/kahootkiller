import initSqlJs from 'sql.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, 'quiz.db');

let db;

// Initialize database
const SQL = await initSqlJs();

// Load existing database or create new one
if (fs.existsSync(dbPath)) {
  const buffer = fs.readFileSync(dbPath);
  db = new SQL.Database(buffer);
} else {
  db = new SQL.Database();
}

// Initialize database tables
db.run(`
  CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT NOT NULL,
    correct_answer TEXT NOT NULL,
    enabled INTEGER DEFAULT 0,
    deadline DATETIME,
    character_limit INTEGER DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

db.run(`
  CREATE TABLE IF NOT EXISTS user_responses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    answer TEXT NOT NULL,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    score INTEGER DEFAULT NULL,
    ai_feedback TEXT DEFAULT NULL,
    FOREIGN KEY (question_id) REFERENCES questions(id)
  );
`);

db.run(`
  CREATE TABLE IF NOT EXISTS scoring_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id INTEGER NOT NULL,
    scored_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    total_responses INTEGER NOT NULL,
    ai_model TEXT,
    FOREIGN KEY (question_id) REFERENCES questions(id)
  );
`);

// Simple migration: ensure `character_limit` column exists on older DBs
try {
  const info = db.exec("PRAGMA table_info(questions);");
  const cols = (info && info[0] && info[0].values) ? info[0].values.map(r => r[1]) : [];
  if (!cols.includes('character_limit')) {
    db.run('ALTER TABLE questions ADD COLUMN character_limit INTEGER DEFAULT NULL;');
  }
} catch (e) {
  // Log and continue; missing column will cause runtime errors otherwise
  console.error('Database migration check failed:', e && e.message ? e.message : e);
}

// Migration: ensure `user_id` column exists in user_responses table
try {
  const info = db.exec("PRAGMA table_info(user_responses);");
  const cols = (info && info[0] && info[0].values) ? info[0].values.map(r => r[1]) : [];
  if (!cols.includes('user_id')) {
    db.run('ALTER TABLE user_responses ADD COLUMN user_id TEXT DEFAULT NULL;');
    // Update existing rows with a placeholder user_id based on username
    db.run("UPDATE user_responses SET user_id = 'legacy_' || substr(abs(random()), 1, 12) WHERE user_id IS NULL;");
  }
} catch (e) {
  console.error('User ID migration check failed:', e && e.message ? e.message : e);
}

// Helper function to save database to file
export function saveDatabase() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

// Save database periodically and on exit
setInterval(saveDatabase, 5000); // Save every 5 seconds
process.on('exit', saveDatabase);
process.on('SIGINT', () => {
  saveDatabase();
  process.exit();
});

export default db;
