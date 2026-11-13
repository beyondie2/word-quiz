import pool from '../config/database.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadRows() {
  const raw = readFileSync(join(__dirname, 'data', 'textbooks.tsv'), 'utf8');
  const rows = [];
  const seen = new Set();

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('제목\t')) continue;

    const parts = trimmed.split('\t');
    if (parts.length !== 2) {
      throw new Error(`열 개수가 2가 아닙니다: ${trimmed}`);
    }

    const title = parts[0].trim();
    const unit = parts[1].trim();
    if (!title || !unit) {
      throw new Error(`빈 값이 있습니다: ${trimmed}`);
    }
    if (unit.length > 100) {
      throw new Error(`단원이 100자를 넘습니다: ${unit}`);
    }

    const key = `${title}\t${unit}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push([title, unit]);
  }

  return rows;
}

async function migrate() {
  const client = await pool.connect();
  try {
    const rows = loadRows();
    console.log(`교과서 ${rows.length}건 입력 중...`);

    await client.query('ALTER TABLE textbooks DROP CONSTRAINT IF EXISTS textbooks_title_key');
    await client.query(`
      ALTER TABLE textbooks
      ALTER COLUMN unit SET NOT NULL
    `);
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'textbooks_title_unit_key'
        ) THEN
          ALTER TABLE textbooks
          ADD CONSTRAINT textbooks_title_unit_key UNIQUE (title, unit);
        END IF;
      END $$
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_textbooks_title ON textbooks(title)
    `);

    await client.query('BEGIN');

    const batchSize = 100;
    let inserted = 0;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const values = [];
      const placeholders = batch.map((row, idx) => {
        const base = idx * 2;
        values.push(row[0], row[1]);
        return `($${base + 1}, $${base + 2})`;
      });

      const result = await client.query(
        `INSERT INTO textbooks (title, unit)
         VALUES ${placeholders.join(', ')}
         ON CONFLICT (title, unit) DO NOTHING`,
        values
      );
      inserted += result.rowCount;
    }

    await client.query('COMMIT');

    const count = await client.query('SELECT COUNT(*)::int AS count FROM textbooks');
    const titles = await client.query('SELECT COUNT(DISTINCT title)::int AS count FROM textbooks');
    console.log(`새로 추가 ${inserted}건, 행 ${count.rows[0].count}건, 제목 ${titles.rows[0].count}종`);
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // 트랜잭션 시작 전 오류는 롤백하지 않는다
    }
    console.error('Migration failed:', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
