// 인증 관련 라우트
import express from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/database.js';
import { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyToken,
  authenticateToken 
} from '../middleware/auth.js';

const router = express.Router();

// 회원가입
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  // 유효성 검사
  if (!username || !email || !password) {
    return res.status(400).json({ error: '이름, 이메일, 비밀번호를 모두 입력해주세요' });
  }

  if (password.length < 4) {
    return res.status(400).json({ error: '비밀번호는 최소 4자 이상이어야 합니다' });
  }

  // 이메일 형식 검사
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: '올바른 이메일 형식을 입력해주세요' });
  }

  try {
    // 이메일 중복 확인
    const emailCheck = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    if (emailCheck.rows.length > 0) {
      return res.status(409).json({ error: '이미 사용 중인 이메일입니다' });
    }

    // 사용자명 중복 확인
    const usernameCheck = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );
    if (usernameCheck.rows.length > 0) {
      return res.status(409).json({ error: '이미 사용 중인 이름입니다' });
    }

    // 비밀번호 해시화
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 사용자 생성
    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, is_admin, created_at, updated_at) 
       VALUES ($1, $2, $3, FALSE, NOW(), NOW()) 
       RETURNING id, username, email, is_admin, created_at`,
      [username, email, passwordHash]
    );

    const user = result.rows[0];

    // 토큰 생성
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Refresh Token 저장
    await pool.query(
      'UPDATE users SET refresh_token = $1 WHERE id = $2',
      [refreshToken, user.id]
    );

    res.status(201).json({
      success: true,
      message: '회원가입이 완료되었습니다',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: user.is_admin
      },
      accessToken,
      refreshToken
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: '회원가입 처리 중 오류가 발생했습니다' });
  }
});

// 로그인
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: '이메일과 비밀번호를 입력해주세요' });
  }

  try {
    // 사용자 조회
    const result = await pool.query(
      'SELECT id, username, email, password_hash, is_admin FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다' });
    }

    const user = result.rows[0];

    // 비밀번호가 설정되지 않은 기존 사용자 처리
    if (!user.password_hash) {
      return res.status(401).json({ 
        error: '비밀번호가 설정되지 않은 계정입니다. 관리자에게 문의하세요.',
        needsPasswordSetup: true 
      });
    }

    // 비밀번호 검증
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다' });
    }

    // 토큰 생성
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Refresh Token 저장
    await pool.query(
      'UPDATE users SET refresh_token = $1, updated_at = NOW() WHERE id = $2',
      [refreshToken, user.id]
    );

    res.json({
      success: true,
      message: '로그인 성공',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: user.is_admin
      },
      accessToken,
      refreshToken
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: '로그인 처리 중 오류가 발생했습니다' });
  }
});

// 토큰 갱신
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh Token이 필요합니다' });
  }

  try {
    // 토큰 검증
    const decoded = verifyToken(refreshToken);
    if (!decoded) {
      return res.status(403).json({ error: '유효하지 않거나 만료된 토큰입니다' });
    }

    // DB에서 Refresh Token 확인
    const result = await pool.query(
      'SELECT id, username, email, is_admin, refresh_token FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ error: '사용자를 찾을 수 없습니다' });
    }

    const user = result.rows[0];

    // Refresh Token 일치 여부 확인
    if (user.refresh_token !== refreshToken) {
      return res.status(403).json({ error: '유효하지 않은 토큰입니다' });
    }

    // 새 토큰 생성
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    // 새 Refresh Token 저장
    await pool.query(
      'UPDATE users SET refresh_token = $1, updated_at = NOW() WHERE id = $2',
      [newRefreshToken, user.id]
    );

    res.json({
      success: true,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: '토큰 갱신 중 오류가 발생했습니다' });
  }
});

// 현재 사용자 정보 조회
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, email, is_admin, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다' });
    }

    const user = result.rows[0];
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: user.is_admin,
        createdAt: user.created_at
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: '사용자 정보 조회 중 오류가 발생했습니다' });
  }
});

// 로그아웃
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // Refresh Token 삭제
    await pool.query(
      'UPDATE users SET refresh_token = NULL, updated_at = NOW() WHERE id = $1',
      [req.user.id]
    );

    res.json({ success: true, message: '로그아웃되었습니다' });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: '로그아웃 처리 중 오류가 발생했습니다' });
  }
});

// 비밀번호 변경
router.put('/change-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: '현재 비밀번호와 새 비밀번호를 입력해주세요' });
  }

  if (newPassword.length < 4) {
    return res.status(400).json({ error: '새 비밀번호는 최소 4자 이상이어야 합니다' });
  }

  try {
    // 현재 비밀번호 조회
    const result = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user.id]
    );

    const user = result.rows[0];

    // 현재 비밀번호 검증
    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: '현재 비밀번호가 올바르지 않습니다' });
    }

    // 새 비밀번호 해시화 및 저장
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [newPasswordHash, req.user.id]
    );

    res.json({ success: true, message: '비밀번호가 변경되었습니다' });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: '비밀번호 변경 중 오류가 발생했습니다' });
  }
});

export default router;
