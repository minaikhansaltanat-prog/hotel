const { pool } = require("../lib/db");

async function main() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS content_strings (
      key TEXT PRIMARY KEY,
      ru TEXT NOT NULL DEFAULT '',
      kz TEXT NOT NULL DEFAULT '',
      en TEXT NOT NULL DEFAULT '',
      zh TEXT NOT NULL DEFAULT '',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS media_slots (
      slot_key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS gallery_items (
      id SERIAL PRIMARY KEY,
      url TEXT NOT NULL,
      caption TEXT NOT NULL DEFAULT '',
      sort_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS video_reviews (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL DEFAULT 'Гость отеля',
      thumb_url TEXT NOT NULL,
      video_url TEXT,
      sort_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS admin_sessions (
      sid VARCHAR NOT NULL COLLATE "default" PRIMARY KEY,
      sess JSON NOT NULL,
      expire TIMESTAMP(6) NOT NULL
    );
    CREATE INDEX IF NOT EXISTS IDX_admin_sessions_expire ON admin_sessions (expire);
  `);
  console.log("Migration complete.");
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
