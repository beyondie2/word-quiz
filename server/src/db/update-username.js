// 사용자 이름 변경
import pool from '../config/database.js';

async function updateUsername(oldName, newName) {
  try {
    console.log(`🔄 Changing username "${oldName}" to "${newName}"...`);
    
    const result = await pool.query(
      `UPDATE users SET username = $1, updated_at = NOW() 
       WHERE username = $2 
       RETURNING id, username, email, is_admin`,
      [newName, oldName]
    );
    
    if (result.rows.length === 0) {
      console.log(`❌ User "${oldName}" not found`);
    } else {
      console.log(`✅ Username changed successfully!`);
      console.log('User:', result.rows[0]);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

updateUsername('유희웅', 'meaningblocks');
