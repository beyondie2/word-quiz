import pool from '../config/database.js';

async function migrate() {
  try {
    console.log('Creating grammar_progress table...');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS grammar_progress (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        grammar_id INTEGER NOT NULL REFERENCES grammar(id) ON DELETE CASCADE,
        category1 VARCHAR(200),
        category2 VARCHAR(200),
        level VARCHAR(100),
        instruction TEXT,
        question TEXT,
        correct_answer TEXT,
        wrong_answer TEXT,
        round INTEGER DEFAULT 1,
        is_correct BOOLEAN NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log('Creating indexes...');
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_grammar_progress_user_id ON grammar_progress(user_id)
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_grammar_progress_grammar_id ON grammar_progress(grammar_id)
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_grammar_progress_created_at ON grammar_progress(created_at)
    `);
    
    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
