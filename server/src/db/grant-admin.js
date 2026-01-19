// 특정 사용자에게 관리자 권한 부여
import pool from '../config/database.js';

async function grantAdmin(username) {
  try {
    console.log(`🔄 Granting admin privileges to "${username}"...`);
    
    const result = await pool.query(
      `UPDATE users SET is_admin = TRUE, updated_at = NOW() 
       WHERE username = $1 
       RETURNING id, username, email, is_admin`,
      [username]
    );
    
    if (result.rows.length === 0) {
      console.log(`❌ User "${username}" not found`);
    } else {
      console.log(`✅ Admin privileges granted successfully!`);
      console.log('User:', result.rows[0]);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

// "유희웅" 사용자에게 관리자 권한 부여
grantAdmin('유희웅');
