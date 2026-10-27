// users 테이블에 신분(role)과 담당 선생님(teacher_id) 컬럼 추가
import pool from '../config/database.js';

async function migrateAddUserRole() {
  const client = await pool.connect();

  try {
    console.log('🔄 Starting user role migration...');

    await client.query('BEGIN');

    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'student'
    `);
    console.log('✅ Added role column');

    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS teacher_id INTEGER
    `);
    console.log('✅ Added teacher_id column');

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'users_role_check'
        ) THEN
          ALTER TABLE users
            ADD CONSTRAINT users_role_check
            CHECK (role IN ('teacher', 'student'));
        END IF;
      END $$;
    `);
    console.log('✅ Added role check constraint');

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'users_teacher_id_fkey'
        ) THEN
          ALTER TABLE users
            ADD CONSTRAINT users_teacher_id_fkey
            FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);
    console.log('✅ Added teacher_id foreign key');

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'users_teacher_only_for_student'
        ) THEN
          ALTER TABLE users
            ADD CONSTRAINT users_teacher_only_for_student
            CHECK (role = 'student' OR teacher_id IS NULL);
        END IF;
      END $$;
    `);
    console.log('✅ Added teacher-only-for-student constraint');

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'users_teacher_not_self'
        ) THEN
          ALTER TABLE users
            ADD CONSTRAINT users_teacher_not_self
            CHECK (teacher_id IS NULL OR teacher_id <> id);
        END IF;
      END $$;
    `);
    console.log('✅ Added teacher-not-self constraint');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_teacher_id ON users(teacher_id)
    `);
    console.log('✅ Added indexes');

    await client.query(`
      COMMENT ON COLUMN users.role IS '신분: teacher(선생님) 또는 student(학생)'
    `);
    await client.query(`
      COMMENT ON COLUMN users.teacher_id IS '학생의 담당 선생님 (users.id). 선생님은 NULL'
    `);

    await client.query('COMMIT');

    console.log('🎉 User role migration completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrateAddUserRole();
