import pool from '../config/database.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('schools 테이블 생성 중...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS schools (
        id SERIAL PRIMARY KEY,
        sido VARCHAR(100) NOT NULL,
        sigungu VARCHAR(100) NOT NULL,
        school_name VARCHAR(200) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT schools_sido_sigungu_school_name_key UNIQUE (sido, sigungu, school_name)
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_schools_sido ON schools(sido)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_schools_school_name ON schools(school_name)
    `);

    const raw = readFileSync(join(__dirname, 'data', 'schools.tsv'), 'utf8');
    const rows = [];
    const seen = new Set();

    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('시도\t') || trimmed.startsWith('시도 ')) continue;

      const parts = trimmed.split('\t');
      if (parts.length !== 3) {
        throw new Error(`열 개수가 3이 아닙니다: ${trimmed}`);
      }

      const sido = parts[0].trim();
      const sigungu = parts[1].trim();
      const schoolName = parts[2].trim();
      if (!sido || !sigungu || !schoolName) {
        throw new Error(`빈 값이 있습니다: ${trimmed}`);
      }

      const key = `${sido}\t${sigungu}\t${schoolName}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push([sido, sigungu, schoolName]);
    }

    console.log(`학교 ${rows.length}건 입력 중...`);

    await client.query('BEGIN');

    const batchSize = 200;
    let inserted = 0;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const values = [];
      const placeholders = batch.map((row, idx) => {
        const base = idx * 3;
        values.push(row[0], row[1], row[2]);
        return `($${base + 1}, $${base + 2}, $${base + 3})`;
      });

      const result = await client.query(
        `INSERT INTO schools (sido, sigungu, school_name)
         VALUES ${placeholders.join(', ')}
         ON CONFLICT (sido, sigungu, school_name) DO NOTHING`,
        values
      );
      inserted += result.rowCount;
    }

    await client.query('COMMIT');

    const count = await client.query('SELECT COUNT(*)::int AS count FROM schools');
    const regions = await client.query('SELECT COUNT(DISTINCT sido)::int AS count FROM schools');
    console.log(`새로 추가 ${inserted}건, 테이블 합계 ${count.rows[0].count}건, 시도 ${regions.rows[0].count}개`);
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
