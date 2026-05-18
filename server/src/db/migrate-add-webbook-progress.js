import pool from '../config/database.js';

async function migrate() {
  try {
    console.log('Creating webbook_progress table...');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS webbook_progress (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        spoken_sentence_id INTEGER REFERENCES spoken_sentence(id) ON DELETE SET NULL,

        book VARCHAR(200) NOT NULL,
        section VARCHAR(100),
        unit VARCHAR(100) NOT NULL,

        kor_sen TEXT NOT NULL,
        eng_sen TEXT NOT NULL,
        correct_answer TEXT NOT NULL,
        user_answer TEXT,
        wrong_answer TEXT,
        wrong_attempts TEXT,

        is_correct BOOLEAN NOT NULL,
        sentence_index INTEGER,
        total_sentences INTEGER,
        attempt_number INTEGER DEFAULT 1,
        round INTEGER DEFAULT 1,
        elapsed_seconds INTEGER,

        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('Creating indexes...');

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_webbook_progress_user_id ON webbook_progress(user_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_webbook_progress_spoken_sentence_id ON webbook_progress(spoken_sentence_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_webbook_progress_book_section_unit ON webbook_progress(book, section, unit)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_webbook_progress_created_at ON webbook_progress(created_at)
    `);

    console.log('webbook_progress migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
