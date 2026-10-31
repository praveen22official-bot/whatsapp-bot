require('dotenv').config({ path: require('path').join(__dirname, '..', 'bot', '.env') });

const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { DB_TYPE } = require('./env');

let db;
if (DB_TYPE === 'pg' && process.env.DATABASE_URL) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : false });
  db = {
    type: 'pg',
    query: (text, params) => pool.query(text, params),
    pool
  };
} else {
  const dbPath = process.env.SQLITE_PATH || path.join(__dirname, '..', 'data.sqlite');
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const sqlite = new sqlite3.Database(dbPath);
  db = {
    type: 'sqlite',
    all: (sql, params=[]) => new Promise((res, rej) => sqlite.all(sql, params, (e, rows) => e ? rej(e) : res(rows))),
    get: (sql, params=[]) => new Promise((res, rej) => sqlite.get(sql, params, (e, row) => e ? rej(e) : res(row))),
    run: (sql, params=[]) => new Promise((res, rej) => sqlite.run(sql, params, function(e) { e ? rej(e) : res({ lastID: this.lastID, changes: this.changes }); })),
    exec: (sql) => new Promise((res, rej) => sqlite.exec(sql, (e) => e ? rej(e) : res())),
    db: sqlite
  };
}

module.exports = db;
