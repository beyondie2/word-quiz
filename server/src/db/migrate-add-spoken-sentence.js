import pool from '../config/database.js';

async function migrate() {
  try {
    console.log('Creating spoken_sentence table...');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS spoken_sentence (
        id SERIAL PRIMARY KEY,
        book VARCHAR(200),
        section VARCHAR(100),
        unit VARCHAR(100),
        kor_sen TEXT,
        eng_sen TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('Creating indexes...');

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_spoken_sentence_book ON spoken_sentence(book)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_spoken_sentence_book_section_unit ON spoken_sentence(book, section, unit)
    `);

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
