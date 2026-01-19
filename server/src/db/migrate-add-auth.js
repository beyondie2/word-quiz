// 인증 관련 컬럼 추가 마이그레이션
import pool from '../config/database.js';

async function migrateAddAuth() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting auth migration...');
    
    await client.query('BEGIN');
    
    // email 컬럼 추가
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE
    `);
    console.log('✅ Added email column');
    
    // password_hash 컬럼 추가
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)
    `);
    console.log('✅ Added password_hash column');
    
    // refresh_token 컬럼 추가 (토큰 갱신용)
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS refresh_token TEXT
    `);
    console.log('✅ Added refresh_token column');
    
    // updated_at 컬럼 추가
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()
    `);
    console.log('✅ Added updated_at column');
    
    await client.query('COMMIT');
    
    console.log('🎉 Auth migration completed successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrateAddAuth();
