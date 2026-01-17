import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: false
  }
});

async function initDatabase() {
  console.log('🔄 데이터베이스 연결 중...');
  console.log(`   Host: ${process.env.DB_HOST}`);
  console.log(`   Database: ${process.env.DB_NAME}`);
  
  try {
    // 연결 테스트
    const client = await pool.connect();
    console.log('✅ 데이터베이스 연결 성공!');

    // 스키마 파일 읽기
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const schemaPath = join(__dirname, 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');

    console.log('🔄 스키마 적용 중...');
    
    // 스키마 실행
    await client.query(schema);
    
    console.log('✅ 스키마 적용 완료!');

    // 테이블 확인
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log('\n📋 생성된 테이블:');
    tablesResult.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });

    // 샘플 데이터 확인
    const usersCount = await client.query('SELECT COUNT(*) FROM users');
    const booksCount = await client.query('SELECT COUNT(*) FROM books');
    
    console.log('\n📊 데이터 현황:');
    console.log(`   - users: ${usersCount.rows[0].count}개`);
    console.log(`   - books: ${booksCount.rows[0].count}개`);

    client.release();
    await pool.end();
    
    console.log('\n🎉 데이터베이스 초기화 완료!');
  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    process.exit(1);
  }
}

initDatabase();
