import sqlite3 from "sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "..", "data", "budget.db");

let db: sqlite3.Database | null = null;

export function initializeDB(): Promise<sqlite3.Database> {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        reject(err);
        return;
      }

      db!.run("PRAGMA journal_mode=WAL", (err) => {
        if (err) reject(err);

        // 2027 예산편성 테이블
        db!.run(`
          CREATE TABLE IF NOT EXISTS budget_2027 (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            policy TEXT,
            program TEXT,
            code TEXT,
            account TEXT,
            detail TEXT,
            amount INTEGER,
            city INTEGER,
            national INTEGER,
            province INTEGER,
            other INTEGER,
            previous INTEGER,
            status TEXT,
            note TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `, (err) => {
          if (err) reject(err);

          // 2026 예산집행 테이블
          db!.run(`
            CREATE TABLE IF NOT EXISTS budget_execution_2026 (
              id INTEGER PRIMARY KEY,
              department TEXT NOT NULL,
              policy_name TEXT,
              program_name TEXT,
              unit_name TEXT,
              statistics_code TEXT,
              original INTEGER,
              supplementary INTEGER,
              pre_establishment INTEGER,
              reserve INTEGER,
              carryover INTEGER,
              budget INTEGER,
              executed INTEGER,
              execution_rate REAL,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `, (err) => {
            if (err) reject(err);

            // 설명자료 데이터 테이블 (정책/단위/세부사업 계층별)
            db!.run(`
              CREATE TABLE IF NOT EXISTS budget_explainer_data (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                department TEXT NOT NULL,
                policy TEXT NOT NULL,
                unit TEXT NOT NULL,
                detail TEXT NOT NULL,
                detail_name TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
              )
            `, (err) => {
              if (err) reject(err);

              // 설명자료 텍스트 저장 테이블 (세부사업별 설명 자료)
              db!.run(`
                CREATE TABLE IF NOT EXISTS budget_explainer_materials (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  department TEXT NOT NULL,
                  policy TEXT NOT NULL,
                  unit TEXT NOT NULL,
                  detail TEXT NOT NULL,
                  level TEXT NOT NULL,
                  explanation_text TEXT,
                  file_name TEXT,
                  uploaded_at DATETIME,
                  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
              `, (err) => {
                if (err) reject(err);
                else resolve(db!);
              });
            });
          });
        });
      });
    });
  });
}

export function getDB(): sqlite3.Database {
  if (!db) {
    throw new Error("Database not initialized");
  }
  return db;
}

export function closeDB(): void {
  if (db) {
    db.close();
    db = null;
  }
}
