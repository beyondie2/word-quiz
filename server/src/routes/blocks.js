import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// GET /api/blocks - 블럭영작 문제 전체 목록 조회
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, book, lesson, sentence_number, english, korean_blocks, korean_full, created_at
      FROM blocks 
      ORDER BY book, lesson, sentence_number, id
    `);
    res.json({ blocks: result.rows });
  } catch (error) {
    console.error('Error fetching blocks:', error);
    res.status(500).json({ error: '블럭영작 목록 조회에 실패했습니다' });
  }
});

// POST /api/blocks/upload - 엑셀 파일로 블럭영작 문제 업로드
router.post('/upload', async (req, res) => {
  const { data } = req.body;

  if (!data || !Array.isArray(data) || data.length === 0) {
    return res.status(400).json({ error: '업로드할 데이터가 없습니다' });
  }

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    let insertedCount = 0;
    let skippedCount = 0;

    for (const row of data) {
      const { book, lesson, sentence_number, english, korean_blocks, korean_full } = row;
      
      // 필수 필드 확인
      if (!english || !korean_blocks || !korean_full) {
        skippedCount++;
        continue;
      }

      await client.query(`
        INSERT INTO blocks (book, lesson, sentence_number, english, korean_blocks, korean_full)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [book || null, lesson || null, sentence_number || null, english, korean_blocks, korean_full]);
      
      insertedCount++;
    }

    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: `${insertedCount}개의 블럭영작 문제가 추가되었습니다.${skippedCount > 0 ? ` (${skippedCount}개 건너뜀)` : ''}`,
      insertedCount,
      skippedCount
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error uploading blocks:', error);
    res.status(500).json({ error: '블럭영작 문제 업로드에 실패했습니다' });
  } finally {
    client.release();
  }
});

// DELETE /api/blocks/:id - 블럭영작 문제 삭제
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM blocks WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '문제를 찾을 수 없습니다' });
    }

    res.json({ success: true, message: '블럭영작 문제가 삭제되었습니다' });
  } catch (error) {
    console.error('Error deleting block:', error);
    res.status(500).json({ error: '블럭영작 문제 삭제에 실패했습니다' });
  }
});

// DELETE /api/blocks - 블럭영작 문제 전체 삭제
router.delete('/', async (req, res) => {
  try {
    await pool.query('DELETE FROM blocks');
    res.json({ success: true, message: '모든 블럭영작 문제가 삭제되었습니다' });
  } catch (error) {
    console.error('Error deleting all blocks:', error);
    res.status(500).json({ error: '블럭영작 문제 전체 삭제에 실패했습니다' });
  }
});

export default router;
