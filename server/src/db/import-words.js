import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import pool from '../config/database.js';

// CSV 파일 경로 (이 스크립트와 같은 폴더에 words.csv를 넣으세요)
const CSV_FILE = process.argv[2] || path.join(process.cwd(), 'words.csv');

async function importWords() {
  const words = [];
  
  // 파일 존재 확인
  if (!fs.existsSync(CSV_FILE)) {
    console.error(`❌ 파일을 찾을 수 없습니다: ${CSV_FILE}`);
    console.log('\n사용법: node src/db/import-words.js [CSV파일경로]');
    console.log('예시: node src/db/import-words.js C:\\Users\\user\\Desktop\\words.csv');
    process.exit(1);
  }

  console.log(`📂 파일 읽는 중: ${CSV_FILE}`);

  // CSV 파일 읽기
  await new Promise((resolve, reject) => {
    fs.createReadStream(CSV_FILE, { encoding: 'utf-8' })
      .pipe(csv({
        // BOM 제거 및 컬럼명 정리
        mapHeaders: ({ header }) => header.trim().replace(/^\uFEFF/, '')
      }))
      .on('data', (row) => {
        // 필수 필드 확인
        if (row.book_name && row.unit && row.english && row.korean) {
          words.push({
            book_name: row.book_name.trim(),
            unit: row.unit.trim(),
            english: row.english.trim(),
            korean: row.korean.trim(),
            example: row.example ? row.example.trim() : null
          });
        }
      })
      .on('end', resolve)
      .on('error', reject);
  });

  console.log(`📊 총 ${words.length}개의 단어를 읽었습니다.`);

  if (words.length === 0) {
    console.error('❌ 가져올 단어가 없습니다. CSV 파일 형식을 확인해주세요.');
    console.log('\n필수 컬럼: book_name, unit, english, korean');
    console.log('선택 컬럼: example');
    process.exit(1);
  }

  // 미리보기 (처음 5개)
  console.log('\n📝 미리보기 (처음 5개):');
  console.table(words.slice(0, 5));

  // 확인 메시지
  console.log(`\n🔄 ${words.length}개의 단어를 데이터베이스에 저장합니다...`);

  // 배치로 삽입 (100개씩)
  const BATCH_SIZE = 100;
  let inserted = 0;
  let skipped = 0;

  try {
    for (let i = 0; i < words.length; i += BATCH_SIZE) {
      const batch = words.slice(i, i + BATCH_SIZE);
      
      // 배치 삽입 쿼리 생성
      const values = [];
      const placeholders = batch.map((word, idx) => {
        const offset = idx * 5;
        values.push(word.book_name, word.unit, word.english, word.korean, word.example);
        return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5})`;
      }).join(', ');

      const query = `
        INSERT INTO books (book_name, unit, english, korean, example)
        VALUES ${placeholders}
        ON CONFLICT DO NOTHING
      `;

      const result = await pool.query(query, values);
      inserted += result.rowCount;
      skipped += batch.length - result.rowCount;

      // 진행 상황 표시
      const progress = Math.min(100, Math.round((i + batch.length) / words.length * 100));
      process.stdout.write(`\r⏳ 진행률: ${progress}% (${i + batch.length}/${words.length})`);
    }

    console.log('\n');
    console.log('✅ 가져오기 완료!');
    console.log(`   - 새로 추가: ${inserted}개`);
    console.log(`   - 건너뜀 (중복): ${skipped}개`);

  } catch (error) {
    console.error('\n❌ 데이터베이스 오류:', error.message);
    process.exit(1);
  }

  process.exit(0);
}

importWords();
