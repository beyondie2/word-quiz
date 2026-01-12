-- 영단어 외우기 앱 데이터베이스 스키마

-- Users 테이블: 사용자 정보
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Books 테이블: 단어장 정보
CREATE TABLE IF NOT EXISTS books (
    id SERIAL PRIMARY KEY,
    book_name VARCHAR(200) NOT NULL,
    unit VARCHAR(100) NOT NULL,
    english VARCHAR(500) NOT NULL,
    korean VARCHAR(500) NOT NULL,
    example TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- UserProgress 테이블: 사용자별 학습 기록
CREATE TABLE IF NOT EXISTS user_progress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_name VARCHAR(200) NOT NULL,
    unit VARCHAR(100) NOT NULL,
    english VARCHAR(500) NOT NULL,
    korean VARCHAR(500) NOT NULL,
    wrong_answer VARCHAR(500),
    practice_mode VARCHAR(20) NOT NULL CHECK (practice_mode IN ('korean', 'english')),
    korean_answer_type VARCHAR(20) NOT NULL CHECK (korean_answer_type IN ('one', 'all')),
    round INTEGER DEFAULT 1,
    unit_review_count INTEGER DEFAULT 0,
    is_correct BOOLEAN NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_books_book_name ON books(book_name);
CREATE INDEX IF NOT EXISTS idx_books_unit ON books(unit);
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_book_unit ON user_progress(book_name, unit);
CREATE INDEX IF NOT EXISTS idx_user_progress_created_at ON user_progress(created_at);

-- 샘플 데이터 (테스트용)
INSERT INTO users (username) VALUES 
    ('홍길동'),
    ('김철수'),
    ('이영희')
ON CONFLICT (username) DO NOTHING;

INSERT INTO books (book_name, unit, english, korean, example) VALUES
    ('영어 기초 단어장', 'Unit 1', 'apple', '사과', 'I eat an apple every day.'),
    ('영어 기초 단어장', 'Unit 1', 'banana', '바나나', 'Bananas are yellow.'),
    ('영어 기초 단어장', 'Unit 1', 'orange', '오렌지', 'Orange juice is delicious.'),
    ('영어 기초 단어장', 'Unit 1', 'grape', '포도', 'I like purple grapes.'),
    ('영어 기초 단어장', 'Unit 1', 'watermelon', '수박', 'Watermelon is refreshing in summer.'),
    ('영어 기초 단어장', 'Unit 2', 'dog', '개, 강아지', 'My dog is very friendly.'),
    ('영어 기초 단어장', 'Unit 2', 'cat', '고양이', 'The cat is sleeping on the sofa.'),
    ('영어 기초 단어장', 'Unit 2', 'bird', '새', 'Birds can fly in the sky.'),
    ('영어 기초 단어장', 'Unit 2', 'fish', '물고기', 'Fish live in water.'),
    ('영어 기초 단어장', 'Unit 2', 'rabbit', '토끼', 'Rabbits have long ears.'),
    ('TOEIC 필수 단어', 'Chapter 1', 'achieve', '달성하다, 성취하다', 'She achieved her goal.'),
    ('TOEIC 필수 단어', 'Chapter 1', 'acquire', '획득하다, 습득하다', 'He acquired new skills.'),
    ('TOEIC 필수 단어', 'Chapter 1', 'benefit', '이익, 혜택', 'There are many benefits to exercise.'),
    ('TOEIC 필수 단어', 'Chapter 1', 'budget', '예산', 'We need to stay within budget.'),
    ('TOEIC 필수 단어', 'Chapter 1', 'confirm', '확인하다', 'Please confirm your reservation.')
ON CONFLICT DO NOTHING;
