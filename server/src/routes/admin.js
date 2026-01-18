import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// 관리자 권한 확인 미들웨어
const checkAdmin = async (req, res, next) => {
  const { adminId } = req.body;
  
  if (!adminId) {
    return res.status(401).json({ error: '인증이 필요합니다' });
  }

  try {
    const result = await pool.query(
      'SELECT is_admin FROM users WHERE id = $1',
      [adminId]
    );

    if (result.rows.length === 0 || !result.rows[0].is_admin) {
      return res.status(403).json({ error: '관리자 권한이 필요합니다' });
    }

    next();
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// GET /api/admin/users - 모든 사용자 목록 (관리자 정보 포함)
router.get('/users', async (req, res) => {
  const { adminId } = req.query;

  // 관리자 권한 확인
  try {
    const adminCheck = await pool.query(
      'SELECT is_admin FROM users WHERE id = $1',
      [adminId]
    );

    if (adminCheck.rows.length === 0 || !adminCheck.rows[0].is_admin) {
      return res.status(403).json({ error: '관리자 권한이 필요합니다' });
    }

    const result = await pool.query(
      'SELECT id, username, is_admin, created_at FROM users ORDER BY created_at DESC'
    );
    res.json({ users: result.rows });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST /api/admin/users - 새 사용자 추가
router.post('/users', checkAdmin, async (req, res) => {
  const { username, isAdmin } = req.body;

  if (!username || !username.trim()) {
    return res.status(400).json({ error: '사용자 이름을 입력해주세요' });
  }

  try {
    // 중복 확인
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      [username.trim()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: '이미 존재하는 사용자입니다' });
    }

    const result = await pool.query(
      'INSERT INTO users (username, is_admin) VALUES ($1, $2) RETURNING id, username, is_admin, created_at',
      [username.trim(), isAdmin || false]
    );

    res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: '사용자 추가에 실패했습니다' });
  }
});

// DELETE /api/admin/users/:userId - 사용자 삭제
router.delete('/users/:userId', async (req, res) => {
  const { userId } = req.params;
  const { adminId } = req.body;

  // 관리자 권한 확인
  try {
    const adminCheck = await pool.query(
      'SELECT is_admin FROM users WHERE id = $1',
      [adminId]
    );

    if (adminCheck.rows.length === 0 || !adminCheck.rows[0].is_admin) {
      return res.status(403).json({ error: '관리자 권한이 필요합니다' });
    }

    // 자기 자신은 삭제 불가
    if (parseInt(userId) === parseInt(adminId)) {
      return res.status(400).json({ error: '자기 자신은 삭제할 수 없습니다' });
    }

    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: '사용자 삭제에 실패했습니다' });
  }
});

// PATCH /api/admin/users/:userId/toggle-admin - 관리자 권한 토글
router.patch('/users/:userId/toggle-admin', async (req, res) => {
  const { userId } = req.params;
  const { adminId } = req.body;

  // 관리자 권한 확인
  try {
    const adminCheck = await pool.query(
      'SELECT is_admin FROM users WHERE id = $1',
      [adminId]
    );

    if (adminCheck.rows.length === 0 || !adminCheck.rows[0].is_admin) {
      return res.status(403).json({ error: '관리자 권한이 필요합니다' });
    }

    // 자기 자신의 권한은 변경 불가
    if (parseInt(userId) === parseInt(adminId)) {
      return res.status(400).json({ error: '자기 자신의 권한은 변경할 수 없습니다' });
    }

    const result = await pool.query(
      'UPDATE users SET is_admin = NOT is_admin WHERE id = $1 RETURNING id, username, is_admin',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다' });
    }

    res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    console.error('Error toggling admin:', error);
    res.status(500).json({ error: '권한 변경에 실패했습니다' });
  }
});

// GET /api/admin/stats - 전체 통계
router.get('/stats', async (req, res) => {
  const { adminId } = req.query;

  // 관리자 권한 확인
  try {
    const adminCheck = await pool.query(
      'SELECT is_admin FROM users WHERE id = $1',
      [adminId]
    );

    if (adminCheck.rows.length === 0 || !adminCheck.rows[0].is_admin) {
      return res.status(403).json({ error: '관리자 권한이 필요합니다' });
    }

    // 전체 사용자 수
    const userCount = await pool.query('SELECT COUNT(*) FROM users');

    // 전체 단어 수
    const wordCount = await pool.query('SELECT COUNT(*) FROM books');

    // 전체 학습 기록 수
    const progressCount = await pool.query('SELECT COUNT(*) FROM user_progress');

    // 오늘 학습 기록 수
    const todayProgress = await pool.query(
      "SELECT COUNT(*) FROM user_progress WHERE created_at >= CURRENT_DATE"
    );

    // 전체 정답률
    const accuracyResult = await pool.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) as correct
      FROM user_progress
    `);

    const total = parseInt(accuracyResult.rows[0].total) || 0;
    const correct = parseInt(accuracyResult.rows[0].correct) || 0;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

    // 최근 7일간 일별 학습량
    const weeklyStats = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count,
        SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) as correct
      FROM user_progress
      WHERE created_at >= CURRENT_DATE - INTERVAL '6 days'
      GROUP BY DATE(created_at)
      ORDER BY date
    `);

    // 사용자별 학습량 (상위 10명)
    const topUsers = await pool.query(`
      SELECT 
        u.username,
        COUNT(up.id) as total_attempts,
        SUM(CASE WHEN up.is_correct THEN 1 ELSE 0 END) as correct_count
      FROM users u
      LEFT JOIN user_progress up ON u.id = up.user_id
      GROUP BY u.id, u.username
      ORDER BY total_attempts DESC
      LIMIT 10
    `);

    res.json({
      userCount: parseInt(userCount.rows[0].count),
      wordCount: parseInt(wordCount.rows[0].count),
      totalProgress: parseInt(progressCount.rows[0].count),
      todayProgress: parseInt(todayProgress.rows[0].count),
      accuracy,
      weeklyStats: weeklyStats.rows,
      topUsers: topUsers.rows
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: '통계 조회에 실패했습니다' });
  }
});

export default router;
