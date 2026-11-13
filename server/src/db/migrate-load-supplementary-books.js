import pool from '../config/database.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadRows() {
  const raw = readFileSync(join(__dirname, 'data', 'supplementary-books.tsv'), 'utf8');
  const rows = [];
  const seen = new Set();

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('책이름\t')) continue;

    const parts = trimmed.split('\t');
    if (parts.length !== 2) {
      throw new Error(`열 개수가 2가 아닙니다: ${trimmed}`);
    }

    const bookName = parts[0].trim();
    const subScope = parts[1].trim();
    if (!bookName || !subScope) {
      throw new Error(`빈 값이 있습니다: ${trimmed}`);
    }
    if (bookName.length > 200) {
      throw new Error(`책 이름이 200자를 넘습니다: ${bookName}`);
    }
    if (subScope.length > 100) {
      throw new Error(`하위범위가 100자를 넘습니다: ${subScope}`);
    }

    const key = `${bookName}\t${subScope}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push([bookName, subScope]);
  }

  return rows;
}

async function migrate() {
  const client = await pool.connect();
  try {
    const rows = loadRows();
    console.log(`부교재 ${rows.length}건 입력 중...`);

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
        `INSERT INTO supplementary_books (book_name, sub_scope)
         VALUES ${placeholders.join(', ')}
         ON CONFLICT (book_name, sub_scope) DO NOTHING`,
        values
      );
      inserted += result.rowCount;
    }

    await client.query('COMMIT');

    const count = await client.query('SELECT COUNT(*)::int AS count FROM supplementary_books');
    const books = await client.query(
      'SELECT COUNT(DISTINCT book_name)::int AS count FROM supplementary_books'
    );
    const first = await client.query(
      'SELECT book_name, sub_scope FROM supplementary_books ORDER BY id LIMIT 1'
    );
    const last = await client.query(
      'SELECT book_name, sub_scope FROM supplementary_books ORDER BY id DESC LIMIT 1'
    );
    console.log(`새로 추가 ${inserted}건, 행 ${count.rows[0].count}건, 책 ${books.rows[0].count}종`);
    console.log(`첫 행: ${first.rows[0].book_name} / ${first.rows[0].sub_scope}`);
    console.log(`마지막 행: ${last.rows[0].book_name} / ${last.rows[0].sub_scope}`);
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
