import express from 'express';
import multer from 'multer';
import XLSX from 'xlsx';
import pool from '../config/database.js';

// 파일 업로드 설정 (메모리 저장)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB 제한
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv' // .csv
    ];
    if (allowedTypes.includes(file.mimetype) || 
        file.originalname.match(/\.(xlsx|xls|csv)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('엑셀 파일(.xlsx, .xls) 또는 CSV 파일만 업로드 가능합니다'), false);
    }
  }
});

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

// POST /api/admin/books/upload - 엑셀 파일로 단어 일괄 추가
router.post('/books/upload', upload.single('file'), async (req, res) => {
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

    if (!req.file) {
      return res.status(400).json({ error: '파일이 업로드되지 않았습니다' });
    }

    // 엑셀 파일 파싱
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      return res.status(400).json({ error: '엑셀 파일에 데이터가 없습니다' });
    }

    // 필수 컬럼 확인 (book_name, unit, english, korean)
    const requiredColumns = ['book_name', 'unit', 'english', 'korean'];
    const firstRow = data[0];
    const missingColumns = requiredColumns.filter(col => !(col in firstRow));

    if (missingColumns.length > 0) {
      return res.status(400).json({ 
        error: `필수 컬럼이 누락되었습니다: ${missingColumns.join(', ')}`,
        hint: '엑셀 파일의 첫 번째 행에 book_name, unit, english, korean 컬럼이 있어야 합니다'
      });
    }

    // 데이터베이스에 삽입
    let insertedCount = 0;
    let skippedCount = 0;
    const errors = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2; // 엑셀 행 번호 (헤더 제외)

      // 필수 필드 검증
      if (!row.book_name || !row.unit || !row.english || !row.korean) {
        skippedCount++;
        errors.push(`행 ${rowNum}: 필수 필드가 비어있습니다`);
        continue;
      }

      try {
        await pool.query(
          `INSERT INTO books (book_name, unit, english, korean, example) 
           VALUES ($1, $2, $3, $4, $5)`,
          [
            String(row.book_name).trim(),
            String(row.unit).trim(),
            String(row.english).trim(),
            String(row.korean).trim(),
            row.example ? String(row.example).trim() : null
          ]
        );
        insertedCount++;
      } catch (dbError) {
        skippedCount++;
        errors.push(`행 ${rowNum}: ${dbError.message}`);
      }
    }

    res.json({
      success: true,
      message: `${insertedCount}개의 단어가 추가되었습니다`,
      insertedCount,
      skippedCount,
      totalRows: data.length,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined // 최대 10개 오류만 반환
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message || '파일 업로드에 실패했습니다' });
  }
});

// GET /api/admin/books - 단어장 목록 조회 (관리자용)
router.get('/books', async (req, res) => {
  const { adminId } = req.query;

  try {
    const adminCheck = await pool.query(
      'SELECT is_admin FROM users WHERE id = $1',
      [adminId]
    );

    if (adminCheck.rows.length === 0 || !adminCheck.rows[0].is_admin) {
      return res.status(403).json({ error: '관리자 권한이 필요합니다' });
    }

    // 단어장별 통계
    const result = await pool.query(`
      SELECT 
        book_name,
        COUNT(DISTINCT unit) as unit_count,
        COUNT(*) as word_count
      FROM books 
      GROUP BY book_name 
      ORDER BY book_name
    `);

    res.json({ books: result.rows });
  } catch (error) {
    console.error('Error fetching books:', error);
    res.status(500).json({ error: '단어장 목록 조회에 실패했습니다' });
  }
});

// DELETE /api/admin/books/:bookName - 단어장 삭제
router.delete('/books/:bookName', async (req, res) => {
  const { bookName } = req.params;
  const { adminId } = req.body;

  try {
    const adminCheck = await pool.query(
      'SELECT is_admin FROM users WHERE id = $1',
      [adminId]
    );

    if (adminCheck.rows.length === 0 || !adminCheck.rows[0].is_admin) {
      return res.status(403).json({ error: '관리자 권한이 필요합니다' });
    }

    const result = await pool.query(
      'DELETE FROM books WHERE book_name = $1',
      [bookName]
    );

    res.json({ 
      success: true, 
      deletedCount: result.rowCount 
    });
  } catch (error) {
    console.error('Error deleting book:', error);
    res.status(500).json({ error: '단어장 삭제에 실패했습니다' });
  }
});

// ==================== 문법 관리 API ====================

// POST /api/admin/grammar/upload - 엑셀 파일로 문법 문제 일괄 추가
router.post('/grammar/upload', upload.single('file'), async (req, res) => {
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

    if (!req.file) {
      return res.status(400).json({ error: '파일이 업로드되지 않았습니다' });
    }

    // 엑셀 파일 파싱
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      return res.status(400).json({ error: '엑셀 파일에 데이터가 없습니다' });
    }

    // 데이터베이스에 삽입
    let insertedCount = 0;
    let skippedCount = 0;
    const errors = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2; // 엑셀 행 번호 (헤더 제외)

      try {
        await pool.query(
          `INSERT INTO grammar (category1, category2, level, image_file, instruction, question, answer, sentence1, sentence2, sentence3, translation1, translation2, translation3) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [
            row['분류1'] ? String(row['분류1']).trim() : null,
            row['분류2'] ? String(row['분류2']).trim() : null,
            row['수준'] ? String(row['수준']).trim() : null,
            row['이미지파일'] ? String(row['이미지파일']).trim() : null,
            row['분류 내 전체 문항 지시 사항'] ? String(row['분류 내 전체 문항 지시 사항']).trim() : null,
            row['단일 문항'] ? String(row['단일 문항']).trim() : null,
            row['정답'] ? String(row['정답']).trim() : null,
            row['문장1'] ? String(row['문장1']).trim() : null,
            row['문장2'] ? String(row['문장2']).trim() : null,
            row['문장3'] ? String(row['문장3']).trim() : null,
            row['해석1'] ? String(row['해석1']).trim() : null,
            row['해석2'] ? String(row['해석2']).trim() : null,
            row['해석3'] ? String(row['해석3']).trim() : null
          ]
        );
        insertedCount++;
      } catch (dbError) {
        skippedCount++;
        errors.push(`행 ${rowNum}: ${dbError.message}`);
      }
    }

    res.json({
      success: true,
      message: `${insertedCount}개의 문법 문제가 추가되었습니다`,
      insertedCount,
      skippedCount,
      totalRows: data.length,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined
    });

  } catch (error) {
    console.error('Grammar upload error:', error);
    res.status(500).json({ error: error.message || '파일 업로드에 실패했습니다' });
  }
});

// GET /api/admin/grammar - 문법 분류 목록 조회 (관리자용)
router.get('/grammar', async (req, res) => {
  const { adminId } = req.query;

  try {
    const adminCheck = await pool.query(
      'SELECT is_admin FROM users WHERE id = $1',
      [adminId]
    );

    if (adminCheck.rows.length === 0 || !adminCheck.rows[0].is_admin) {
      return res.status(403).json({ error: '관리자 권한이 필요합니다' });
    }

    // 분류1별 통계
    const result = await pool.query(`
      SELECT 
        category1,
        COUNT(DISTINCT category2) as category2_count,
        COUNT(*) as question_count
      FROM grammar 
      GROUP BY category1 
      ORDER BY category1
    `);

    res.json({ grammar: result.rows });
  } catch (error) {
    console.error('Error fetching grammar:', error);
    res.status(500).json({ error: '문법 목록 조회에 실패했습니다' });
  }
});

// DELETE /api/admin/grammar/:category1 - 문법 분류 삭제
router.delete('/grammar/:category1', async (req, res) => {
  const { category1 } = req.params;
  const { adminId } = req.body;

  try {
    const adminCheck = await pool.query(
      'SELECT is_admin FROM users WHERE id = $1',
      [adminId]
    );

    if (adminCheck.rows.length === 0 || !adminCheck.rows[0].is_admin) {
      return res.status(403).json({ error: '관리자 권한이 필요합니다' });
    }

    const result = await pool.query(
      'DELETE FROM grammar WHERE category1 = $1',
      [category1]
    );

    res.json({ 
      success: true, 
      deletedCount: result.rowCount 
    });
  } catch (error) {
    console.error('Error deleting grammar:', error);
    res.status(500).json({ error: '문법 삭제에 실패했습니다' });
  }
});

export default router;
