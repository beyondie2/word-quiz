import pool from '../config/database.js';

async function migrate() {
  try {
    console.log('Adding new columns to blocks table...');
    
    // book 컬럼 추가
    await pool.query(`
      ALTER TABLE blocks ADD COLUMN IF NOT EXISTS book VARCHAR(200)
    `);
    console.log('Added book column');
    
    // lesson 컬럼 추가
    await pool.query(`
      ALTER TABLE blocks ADD COLUMN IF NOT EXISTS lesson VARCHAR(100)
    `);
    console.log('Added lesson column');
    
    // sentence_number 컬럼 추가
    await pool.query(`
      ALTER TABLE blocks ADD COLUMN IF NOT EXISTS sentence_number INTEGER
    `);
    console.log('Added sentence_number column');
    
    console.log('Creating indexes...');
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_blocks_book ON blocks(book)
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_blocks_lesson ON blocks(lesson)
    `);
    
    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
