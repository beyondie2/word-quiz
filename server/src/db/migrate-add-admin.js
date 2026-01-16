import pool from '../config/database.js';

async function migrate() {
  try {
    // is_admin 컬럼 추가
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE
    `);
    console.log('✅ is_admin 컬럼 추가 완료');

    // 이영희를 관리자로 설정
    await pool.query(`
      UPDATE users SET is_admin = TRUE WHERE username = '이영희'
    `);
    console.log('✅ 이영희 관리자 설정 완료');

    console.log('🎉 마이그레이션 완료!');
    process.exit(0);
  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error.message);
    process.exit(1);
  }
}

migrate();
