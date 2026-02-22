/**
 * 객체 또는 객체 배열의 모든 문자열 필드에서 앞뒤 공백을 제거합니다.
 * @param {Object|Array} data - 처리할 데이터 (객체 또는 객체 배열)
 * @returns {Object|Array} - trim 처리된 데이터
 */
export function trimStringFields(data) {
  if (data === null || data === undefined) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => trimStringFields(item));
  }

  if (typeof data === 'object') {
    const trimmedObj = {};
    for (const key of Object.keys(data)) {
      const value = data[key];
      if (typeof value === 'string') {
        trimmedObj[key] = value.trim();
      } else {
        trimmedObj[key] = value;
      }
    }
    return trimmedObj;
  }

  return data;
}

/**
 * 데이터베이스 쿼리 결과의 rows를 trim 처리합니다.
 * @param {Object} result - pool.query() 결과
 * @returns {Array} - trim 처리된 rows 배열
 */
export function trimQueryResult(result) {
  return trimStringFields(result.rows);
}
