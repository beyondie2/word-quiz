// users 테이블에 담당 선생님 이메일(teacher_email) 컬럼 추가
import pool from '../config/database.js';

async function migrateAddTeacherEmail() {
  const client = await pool.connect();

  try {
    console.log('🔄 Starting teacher email migration...');

    await client.query('BEGIN');

    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS teacher_email VARCHAR(255)
    `);
    console.log('✅ Added teacher_email column');

    await client.query(`
      UPDATE users AS student
      SET teacher_email = teacher.email
      FROM users AS teacher
      WHERE student.teacher_id = teacher.id
        AND student.teacher_email IS NULL
        AND teacher.email IS NOT NULL
    `);
    console.log('✅ Backfilled teacher_email from existing teacher accounts');

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'users_teacher_email_only_for_student'
        ) THEN
          ALTER TABLE users
            ADD CONSTRAINT users_teacher_email_only_for_student
            CHECK (role = 'student' OR teacher_email IS NULL);
        END IF;
      END $$;
    `);
    console.log('✅ Added teacher-email-only-for-student constraint');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_teacher_email ON users(teacher_email)
    `);
    console.log('✅ Added teacher_email index');

    await client.query(`
      COMMENT ON COLUMN users.teacher_email IS '학생의 담당 선생님 이메일. 선생님은 NULL'
    `);

    await client.query('COMMIT');

    console.log('🎉 Teacher email migration completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrateAddTeacherEmail();
