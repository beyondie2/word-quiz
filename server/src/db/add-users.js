import pool from '../config/database.js';

const usersToAdd = [
  { username: '이정민', is_admin: false },
  { username: '정시헌', is_admin: false },
  { username: '황다희', is_admin: false }
];

async function addUsers() {
  try {
    console.log('데이터베이스에 연결 중...');
    
    for (const user of usersToAdd) {
      try {
        const result = await pool.query(
          'INSERT INTO users (username, is_admin) VALUES ($1, $2) ON CONFLICT (username) DO NOTHING RETURNING id, username, is_admin',
          [user.username, user.is_admin]
        );
        
        if (result.rows.length > 0) {
          console.log(`✅ 사용자 추가됨: ${result.rows[0].username} (ID: ${result.rows[0].id})`);
        } else {
          console.log(`⚠️ 이미 존재하는 사용자: ${user.username}`);
        }
      } catch (err) {
        console.error(`❌ 사용자 추가 실패 (${user.username}):`, err.message);
      }
    }
    
    // 전체 사용자 목록 출력
    const allUsers = await pool.query('SELECT id, username, is_admin FROM users ORDER BY id');
    console.log('\n📋 전체 사용자 목록:');
    console.table(allUsers.rows);
    
  } catch (error) {
    console.error('데이터베이스 오류:', error.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

addUsers();
