import pool from '../config/database.js';

/**
 * 수행 기록 조회 범위
 * - teacher: teacher_id가 본인 id인 학생만
 * - admin: 전체 또는 지정 사용자
 * - 그 외: 본인
 */
export async function resolveProgressScope(requesterId, targetUserId) {
  if (!requesterId) {
    return { type: 'none' };
  }

  const result = await pool.query(
    'SELECT id, is_admin, role FROM users WHERE id = $1',
    [requesterId]
  );

  if (result.rows.length === 0) {
    return { type: 'none' };
  }

  const requester = result.rows[0];
  const requestedId = targetUserId ? String(targetUserId) : '';

  if (requester.role === 'teacher') {
    if (requestedId) {
      return { type: 'student', userId: requestedId, teacherId: requester.id };
    }
    return { type: 'students', teacherId: requester.id };
  }

  if (requester.is_admin) {
    if (requestedId) {
      return { type: 'user', userId: requestedId };
    }
    return { type: 'all' };
  }

  return { type: 'self', userId: requester.id };
}

export function appendProgressUserFilter(scope, userIdColumn, startIndex) {
  if (scope.type === 'self' || scope.type === 'user') {
    return {
      sql: ` AND ${userIdColumn} = $${startIndex}`,
      params: [scope.userId],
      nextIndex: startIndex + 1
    };
  }

  if (scope.type === 'student') {
    return {
      sql: ` AND ${userIdColumn} = $${startIndex} AND u.teacher_id = $${startIndex + 1} AND u.role = 'student'`,
      params: [scope.userId, scope.teacherId],
      nextIndex: startIndex + 2
    };
  }

  if (scope.type === 'students') {
    return {
      sql: ` AND u.teacher_id = $${startIndex} AND u.role = 'student'`,
      params: [scope.teacherId],
      nextIndex: startIndex + 1
    };
  }

  if (scope.type === 'none') {
    return { sql: ' AND 1=0', params: [], nextIndex: startIndex };
  }

  return { sql: '', params: [], nextIndex: startIndex };
}
