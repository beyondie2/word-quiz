// JWT 인증 미들웨어
import jwt from 'jsonwebtoken';
import pool from '../config/database.js';

// 환경변수에서 JWT 시크릿 가져오기 (없으면 기본값)
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

// Access Token 생성
export const generateAccessToken = (user) => {
  return jwt.sign(
    { 
      userId: user.id, 
      username: user.username,
      email: user.email,
      isAdmin: user.is_admin 
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

// Refresh Token 생성
export const generateRefreshToken = (user) => {
  return jwt.sign(
    { userId: user.id },
    JWT_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES_IN }
  );
};

// 토큰 검증
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// 인증 미들웨어 (필수)
export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: '인증 토큰이 필요합니다' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(403).json({ error: '유효하지 않거나 만료된 토큰입니다' });
  }

  try {
    // 사용자가 여전히 존재하는지 확인
    const result = await pool.query(
      'SELECT id, username, email, is_admin FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ error: '사용자를 찾을 수 없습니다' });
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: '인증 처리 중 오류가 발생했습니다' });
  }
};

// 인증 미들웨어 (선택적 - 토큰이 있으면 검증, 없어도 통과)
export const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    req.user = null;
    return next();
  }

  try {
    const result = await pool.query(
      'SELECT id, username, email, is_admin FROM users WHERE id = $1',
      [decoded.userId]
    );

    req.user = result.rows.length > 0 ? result.rows[0] : null;
    next();
  } catch (error) {
    req.user = null;
    next();
  }
};

// 관리자 권한 확인 미들웨어
export const requireAdmin = (req, res, next) => {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ error: '관리자 권한이 필요합니다' });
  }
  next();
};

export { JWT_SECRET };
