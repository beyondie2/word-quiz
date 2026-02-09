import pool from '../config/database.js';

async function migrate() {
  try {
    console.log('Creating blocks_progress table...');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS blocks_progress (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        blocks_id INTEGER REFERENCES blocks(id) ON DELETE SET NULL,
        book VARCHAR(200),
        lesson VARCHAR(100),
        sentence_number INTEGER,
        english TEXT,
        correct_answer TEXT,
        wrong_answer TEXT,
        phase VARCHAR(20) DEFAULT 'block',
        round INTEGER DEFAULT 1,
        is_correct BOOLEAN NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log('Creating indexes...');
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_blocks_progress_user_id ON blocks_progress(user_id)
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_blocks_progress_blocks_id ON blocks_progress(blocks_id)
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_blocks_progress_created_at ON blocks_progress(created_at)
    `);
    
    console.log('blocks_progress migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
