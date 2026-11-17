import express from 'express';
import multer from 'multer';
import Anthropic from '@anthropic-ai/sdk';
import pool from '../config/database.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

// 문제은행: 텍스트를 지문으로 나누고, 유형별 문제와 해설을 만든다.

const MODEL = 'claude-opus-5-5';
const SOURCE_TYPES = ['교과서', '모의고사', '부교재'];
const SHORT_ANSWER_TYPES = new Set(['국어낱말', '국어영작', '추론영작', '주관식요약']);
const TEXTBOOK_PASSAGE_LIMIT = 10;
const OTHER_PASSAGE_LIMIT = 40;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});

let client = null;
function getClient() {
  if (!client) client = new Anthropic();
  return client;
}

const router = express.Router();

function cleanList(value, limit) {
  const items = Array.isArray(value) ? value : [];
  const seen = new Set();
  const list = [];
  for (const item of items) {
    const text = String(item ?? '').trim().slice(0, limit);
    if (!text || seen.has(text)) continue;
    seen.add(text);
    list.push(text);
  }
  return list;
}

function readScope(body) {
  let scope = body?.scope;
  if (typeof scope === 'string') {
    try {
      scope = JSON.parse(scope);
    } catch {
      scope = null;
    }
  }
  scope = scope || {};
  return {
    textbook: {
      title: String(scope.textbook?.title ?? '').trim().slice(0, 200),
      units: cleanList(scope.textbook?.units, 200),
    },
    mockExams: cleanList(scope.mockExams, 200),
    supplementary: {
      bookName: String(scope.supplementary?.bookName ?? '').trim().slice(0, 200),
      scopes: cleanList(scope.supplementary?.scopes, 200),
    },
  };
}

function scopeTargets(scope) {
  const targets = [];
  if (scope.textbook.title && scope.textbook.units.length > 0) {
    for (const unit of scope.textbook.units) {
      targets.push({ source_type: '교과서', title: scope.textbook.title, unit_name: unit });
    }
  }
  for (const name of scope.mockExams) {
    targets.push({ source_type: '모의고사', title: name, unit_name: '' });
  }
  if (scope.supplementary.bookName && scope.supplementary.scopes.length > 0) {
    for (const subScope of scope.supplementary.scopes) {
      targets.push({ source_type: '부교재', title: scope.supplementary.bookName, unit_name: subScope });
    }
  }
  return targets;
}

function scopePrompt(scope) {
  const lines = [];
  if (scope.textbook.title && scope.textbook.units.length > 0) {
    lines.push(`교과서 책 제목: ${scope.textbook.title}`);
    lines.push('교과서 단원:');
    for (const unit of scope.textbook.units) lines.push(`- ${unit}`);
  }
  if (scope.mockExams.length > 0) {
    lines.push('모의고사 이름:');
    for (const name of scope.mockExams) lines.push(`- ${name}`);
  }
  if (scope.supplementary.bookName && scope.supplementary.scopes.length > 0) {
    lines.push(`부교재 책 이름: ${scope.supplementary.bookName}`);
    lines.push('부교재 하위범위:');
    for (const subScope of scope.supplementary.scopes) lines.push(`- ${subScope}`);
  }
  return lines.join('\n');
}

function readTextFile(file) {
  if (!file) return { error: '텍스트 파일을 올려주세요' };
  const name = String(file.originalname || '');
  const type = String(file.mimetype || '');
  const isText = type.startsWith('text/') || /\.txt$/i.test(name);
  if (!isText) return { error: '텍스트 파일(.txt)만 읽을 수 있습니다' };
  if (file.buffer.includes(0)) return { error: '텍스트 파일(.txt)만 읽을 수 있습니다' };
  const text = file.buffer.toString('utf8').replace(/^\uFEFF/, '').trim();
  if (!text) return { error: '파일에 읽을 내용이 없습니다' };
  if (text.length > 500000) return { error: '파일이 너무 깁니다. 나눠서 올려주세요' };
  return { text };
}

function targetKey(item) {
  return `${item.source_type}\n${item.title}\n${item.unit_name}`;
}

function normalizePassages(rawPassages, targets) {
  const allowed = new Map(targets.map((target) => [targetKey(target), target]));
  const counts = new Map();
  const passages = [];

  for (const raw of Array.isArray(rawPassages) ? rawPassages : []) {
    const sourceType = String(raw?.source_type ?? '').trim();
    const title = String(raw?.title ?? '').trim();
    const unitName = sourceType === '모의고사' ? '' : String(raw?.unit_name ?? '').trim();
    const passage = String(raw?.passage ?? '').trim();
    if (!SOURCE_TYPES.includes(sourceType) || !passage) continue;
    const target = allowed.get(targetKey({ source_type: sourceType, title, unit_name: unitName }));
    if (!target) continue;

    const key = targetKey(target);
    const count = counts.get(key) || 0;
    const limit = sourceType === '교과서' ? TEXTBOOK_PASSAGE_LIMIT : OTHER_PASSAGE_LIMIT;
    if (count >= limit) continue;
    counts.set(key, count + 1);
    passages.push({ ...target, passage });
  }
  return passages;
}

const passageSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    passages: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          source_type: { type: 'string', enum: SOURCE_TYPES },
          title: { type: 'string' },
          unit_name: { type: 'string' },
          passage: { type: 'string' },
        },
        required: ['source_type', 'title', 'unit_name', 'passage'],
      },
    },
  },
  required: ['passages'],
};

function questionSchema(types) {
  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      questions: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            question_type: { type: 'string', enum: types },
            question: { type: 'string' },
            answer: { type: 'string' },
            explanation: { type: 'string' },
          },
          required: ['question_type', 'question', 'answer', 'explanation'],
        },
      },
    },
    required: ['questions'],
  };
}

function splitPrompt() {
  return [
    '당신은 한국 고등학교 영어 시험의 지문을 나누는 도우미입니다.',
    '사용자가 준 텍스트를, 고등학교 영어 시험 한 문제에 들어갈 지문 분량으로 나눕니다.',
    '지문은 영어 본문만 담습니다. 발문, 문항 번호, 선택지, 정답, 해설은 넣지 않습니다.',
    '한 지문은 대략 120~180 영어 단어입니다. 원문에 없는 문장을 지어내지 않습니다.',
    '',
    '출처는 사용자가 지정한 목록 안에서만 고릅니다. 제목과 단원 이름은 지정한 글자를 그대로 씁니다.',
    '- 교과서: 단원(한 과)마다 5개에서 10개의 지문으로 나눕니다. 단원이 하나면 그 단원에 모두 넣습니다.',
    '- 모의고사: 문제 하나의 본문을 지문 하나로 둡니다. unit_name은 빈 문자열입니다.',
    '- 부교재: 문제 하나의 본문을 지문 하나로 둡니다. unit_name은 지정한 하위범위입니다.',
    '지정한 범위에 없는 내용은 지문으로 만들지 않습니다.',
  ].join('\n');
}

function buildQuestionPrompt(byType) {
  const sections = [...byType.entries()].map(([type, samples]) => {
    const format = SHORT_ANSWER_TYPES.has(type) ? '주관식' : '객관식';
    const body = samples
      .map((sample, index) => `<example index="${index + 1}">\n${sample}\n</example>`)
      .join('\n');
    return `<question_type name="${type}" answer_format="${format}">\n${body}\n</question_type>`;
  });
  return [
    '당신은 한국 고등학교 영어 시험 문제를 만드는 도우미입니다.',
    '주어진 지문 하나만 사용합니다. 지문에 없는 내용을 사실처럼 지어내지 않습니다.',
    '아래 유형마다 문제를 하나씩 만듭니다. 발문, 지문 배치, 선택지 형식은 그 유형의 예시를 따릅니다.',
    '객관식은 선택지를 ①부터 ⑤까지 다섯 개 둡니다. 주관식은 선택지를 두지 않습니다.',
    'question에는 발문, 지문, 선택지를 학생이 푸는 문제 형태로 모두 넣습니다.',
    'answer에는 정답만 적습니다. 객관식은 정답 선택지 번호와 글자, 주관식은 정답 문장이나 단어입니다.',
    'explanation에는 왜 그 답이 맞는지 한국어로 짧게 적습니다.',
    '',
    ...sections,
  ].join('\n');
}

async function callModel({ system, user, schema, maxTokens }) {
  let lastError = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const stream = getClient().beta.messages.stream({
        model: MODEL,
        max_tokens: maxTokens,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: {
          effort: 'medium',
          format: { type: 'json_schema', schema },
        },
        system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: user }],
      });
      const message = await stream.finalMessage();
      if (message.stop_reason === 'refusal') {
        const error = new Error('AI가 이 작업을 거절했습니다');
        error.statusCode = 422;
        throw error;
      }
      if (message.stop_reason === 'max_tokens') {
        const error = new Error('내용이 너무 길어 결과가 잘렸습니다. 파일을 나눠서 올려주세요');
        error.statusCode = 422;
        throw error;
      }
      const textBlock = message.content.find((block) => block.type === 'text');
      if (!textBlock) {
        const error = new Error('AI 응답이 비어 있습니다');
        error.statusCode = 502;
        throw error;
      }
      return JSON.parse(textBlock.text);
    } catch (error) {
      lastError = error;
      const status = error?.status;
      if (status === 429 || status === 529 || status === 503) {
        await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

async function loadTypeSamples() {
  const result = await pool.query(`
    SELECT question_type, question
    FROM question_type_samples
    ORDER BY question_type, id
  `);
  const byType = new Map();
  for (const row of result.rows) {
    const type = String(row.question_type || '').trim();
    const question = String(row.question || '').trim();
    if (!type || !question) continue;
    if (!byType.has(type)) byType.set(type, []);
    byType.get(type).push(question);
  }
  return byType;
}

function normalizeQuestions(rawQuestions, types) {
  const byType = new Map();
  for (const raw of Array.isArray(rawQuestions) ? rawQuestions : []) {
    const type = String(raw?.question_type ?? '').trim();
    const question = String(raw?.question ?? '').trim();
    const answer = String(raw?.answer ?? '').trim();
    const explanation = String(raw?.explanation ?? '').trim();
    if (!types.includes(type) || !question || !answer || byType.has(type)) continue;
    byType.set(type, {
      question_type: type,
      answer_format: SHORT_ANSWER_TYPES.has(type) ? '주관식' : '객관식',
      question,
      answer: explanation ? `정답: ${answer}\n해설: ${explanation}` : answer,
    });
  }
  return types.map((type) => byType.get(type)).filter(Boolean);
}

function examScopeOf(passage) {
  const scope = passage.source_type === '모의고사' ? passage.title : passage.unit_name;
  return String(scope || passage.title).trim().slice(0, 200);
}

async function mapPool(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  async function run() {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => run()));
  return results;
}

function sendAiError(res, error) {
  if (error?.statusCode) return res.status(error.statusCode).json({ error: error.message });
  if (error instanceof Anthropic.AuthenticationError) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY가 올바르지 않습니다' });
  }
  if (error instanceof Anthropic.RateLimitError) {
    return res.status(429).json({ error: '요청이 많습니다. 잠시 후 다시 시도해주세요' });
  }
  if (error instanceof Anthropic.BadRequestError) {
    return res.status(400).json({ error: `파일을 처리하지 못했습니다: ${error.message}` });
  }
  if (error instanceof Anthropic.APIError) {
    return res.status(502).json({ error: 'AI 서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요' });
  }
  return res.status(500).json({ error: '문제를 만들지 못했습니다' });
}

router.post('/generate', authenticateToken, requireAdmin, (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || '파일을 올리지 못했습니다' });
    next();
  });
}, async (req, res) => {
  req.setTimeout(30 * 60 * 1000);

  const file = readTextFile(req.file);
  if (file.error) return res.status(400).json({ error: file.error });

  const scope = readScope(req.body);
  const targets = scopeTargets(scope);
  if (targets.length === 0) {
    return res.status(400).json({ error: '교과서 단원, 모의고사, 부교재 범위 중 하나를 선택해주세요' });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: '서버에 ANTHROPIC_API_KEY가 설정되지 않았습니다' });
  }

  try {
    const byType = await loadTypeSamples();
    const types = [...byType.keys()];
    if (types.length === 0) {
      return res.status(400).json({ error: '등록된 시험지유형이 없습니다. 시험지유형 관리에서 먼저 추가해주세요' });
    }

    const split = await callModel({
      system: splitPrompt(),
      user: `${scopePrompt(scope)}\n\n아래 텍스트를 지문으로 나누세요.\n\n${file.text}`,
      schema: passageSchema,
      maxTokens: 32000,
    });
    const passages = normalizePassages(split.passages, targets);
    if (passages.length === 0) {
      return res.status(422).json({ error: '선택한 범위에 넣을 지문을 찾지 못했습니다' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const passage of passages) {
        await client.query(
          `INSERT INTO question_bank (source_type, title, unit_name, passage)
           SELECT $1, $2, $3, $4
           WHERE NOT EXISTS (
             SELECT 1 FROM question_bank
             WHERE source_type = $1 AND title = $2 AND unit_name = $3 AND passage = $4
           )`,
          [passage.source_type, passage.title, passage.unit_name, passage.passage]
        );
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    const questionPrompt = buildQuestionPrompt(byType);
    const made = await mapPool(passages, 2, async (passage, index) => {
      console.log(`문제은행 지문 ${index + 1}/${passages.length} 문제 생성`);
      const user = [
        `출처: ${passage.source_type}`,
        `제목: ${passage.title}`,
        passage.unit_name ? `단원: ${passage.unit_name}` : '단원: 없음',
        '',
        '지문:',
        passage.passage,
        '',
        `유형 ${types.length}개를 각각 한 문제씩 만드세요: ${types.join(', ')}`,
      ].join('\n');

      try {
        let questions = [];
        for (let attempt = 0; attempt < 2 && questions.length < types.length; attempt += 1) {
          const result = await callModel({
            system: questionPrompt,
            user,
            schema: questionSchema(types),
            maxTokens: 32000,
          });
          questions = normalizeQuestions(result.questions, types);
        }
        return { passage, questions, failed: false };
      } catch (error) {
        console.error(`문제은행 지문 ${index + 1} 문제 생성 실패:`, error);
        return { passage, questions: [], failed: true };
      }
    });

    let questionCount = 0;
    let incompleteCount = 0;
    let failedCount = 0;
    for (const item of made) {
      if (item.failed) {
        failedCount += 1;
        continue;
      }
      if (item.questions.length < types.length) incompleteCount += 1;
      const examScope = examScopeOf(item.passage);
      for (const question of item.questions) {
        await pool.query(
          `INSERT INTO exam_questions (exam_scope, question_type, answer_format, question, answer)
           VALUES ($1, $2, $3, $4, $5)`,
          [examScope, question.question_type, question.answer_format, question.question, question.answer]
        );
        questionCount += 1;
      }
    }

    const notes = [];
    if (incompleteCount > 0) notes.push(`${incompleteCount}개 지문은 일부 유형이 빠졌습니다.`);
    if (failedCount > 0) notes.push(`${failedCount}개 지문은 문제를 만들지 못했습니다.`);
    res.json({
      success: true,
      passageCount: passages.length,
      questionCount,
      incompleteCount,
      failedCount,
      message: `지문 ${passages.length}개를 저장하고 문제 ${questionCount}개를 만들었습니다. ${notes.join(' ')}`.trim(),
    });
  } catch (error) {
    console.error('Question bank generate error:', error);
    return sendAiError(res, error);
  }
});

export default router;
