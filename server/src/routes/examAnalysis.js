import express from 'express';
import multer from 'multer';
import Anthropic from '@anthropic-ai/sdk';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

// 문제 만들기 > 새로 만들기: 업로드한 시험지(사진/PDF)를 Claude로 읽어 문항별 유형을 매칭한다.

const MODEL = 'claude-opus-5-5';
const UNCLASSIFIED = '미분류';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 30 },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'images' && IMAGE_TYPES.includes(file.mimetype)) return cb(null, true);
    if (file.fieldname === 'pdf' && file.mimetype === 'application/pdf') return cb(null, true);
    cb(new Error('사진(jpg, png, webp, gif) 또는 PDF 파일만 올릴 수 있습니다'));
  },
});

const uploadFields = upload.fields([
  { name: 'images', maxCount: 30 },
  { name: 'pdf', maxCount: 1 },
]);

// API 키는 ANTHROPIC_API_KEY 환경변수에서 읽는다 (.env 로드 후 만들도록 처음 요청 때 생성)
let client = null;
function getClient() {
  if (!client) client = new Anthropic();
  return client;
}

const router = express.Router();

// question_type_samples의 모든 문제를 유형별로 묶는다 (시험지의 각 문항을 이 문제들 전부와 비교)
async function loadTypeSamples() {
  const result = await pool.query(`
    SELECT question_type, question
    FROM question_type_samples
    ORDER BY question_type, id
  `);

  const byType = new Map();
  for (const row of result.rows) {
    const type = row.question_type.trim();
    if (!byType.has(type)) byType.set(type, []);
    byType.get(type).push(row.question.trim());
  }
  return byType;
}

function buildSystemPrompt(byType) {
  const sections = [...byType.entries()].map(([type, samples]) => {
    const body = samples
      .map((q, i) => `<example index="${i + 1}">\n${q}\n</example>`)
      .join('\n');
    return `<question_type name="${type}">\n${body}\n</question_type>`;
  });

  return [
    '당신은 한국 고등학교 영어 시험지를 분석하는 도우미입니다.',
    '사용자가 시험지(사진 또는 PDF)를 주면, 시험지에 있는 모든 문항을 시험지에 나온 순서대로 찾아 각 문항의 유형을 정합니다.',
    '',
    '유형은 아래 유형 목록 중에서만 고릅니다. 각 유형에는 예시 문제가 있으니, 발문(지시문)과 문제 형태를 예시와 비교해 가장 비슷한 유형을 고르세요.',
    `어느 유형에도 맞지 않으면 "${UNCLASSIFIED}"로 표시합니다.`,
    '',
    '문항별로 다음을 적습니다.',
    '- number: 시험지에 인쇄된 문항 번호 그대로 (예: "1", "서답형 1", "단답형 2")',
    '- question_type: 위 규칙으로 고른 유형',
    '- answer_format: 선택지(①②③④⑤)가 있으면 "객관식", 없으면 "주관식"',
    '- instruction: 문항의 발문(지시문) 한 줄',
    '- question: 그 문항의 문제 자체. 발문, 지문, 선택지를 시험지에 인쇄된 글자 그대로 옮긴다. 문항 번호는 빼되, 틀린 글자나 알아보기 어려운 글자도 고치지 말고 보이는 대로 적는다.',
    '',
    '하나의 지문에 여러 문항이 딸린 경우에도 문항마다 따로 적습니다. 문항을 빠뜨리거나 합치지 마세요.',
    '',
    '각 문항의 지문이 어디서 왔는지도 정합니다. 사용자가 적어 준 시험범위(교과서 단원, 모의고사, 부교재 하위범위)와 지문을 비교합니다.',
    '- 지정한 교과서 단원의 지문이면 source_kind는 "교과서"입니다. source_detail에는 그 책 제목과 단원 이름을 지정한 글자 그대로 적습니다.',
    '- 지정한 모의고사의 지문이면 source_kind는 "모의고사"입니다. source_detail에는 그 모의고사 이름을 지정한 글자 그대로 적습니다.',
    '- 지정한 부교재 하위범위의 지문이면 source_kind는 "부교재"입니다. source_detail에는 그 책 이름과 하위범위를 지정한 글자 그대로 적습니다.',
    '- 지정한 범위 어디에도 없으면 source_kind는 "기타"입니다. source_detail에는 그 지문이 실제로 실린 책과 장·단원·회차를 적습니다. 예: "EBS 수능특강 영어 3강", "능률 영어독해 5과". 책이나 장을 특정할 수 없으면 "출처를 찾지 못함"이라고 적습니다.',
    '- source_detail에는 "교과서", "모의고사", "부교재", "기타"라는 분류 단어를 넣지 않습니다.',
    '한 지문에 여러 문항이 있으면 문항마다 같은 출처를 적습니다. 지문이 없는 문항도 가능하면 출처를 찾고, 판단할 수 없으면 기타와 "출처를 찾지 못함"을 적습니다.',
    '',
    '<question_types>',
    ...sections,
    '</question_types>',
  ].join('\n');
}

function buildOutputSchema(typeNames) {
  return {
    type: 'object',
    properties: {
      questions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            number: { type: 'string' },
            question_type: { type: 'string', enum: [...typeNames, UNCLASSIFIED] },
            answer_format: { type: 'string', enum: ['객관식', '주관식'] },
            instruction: { type: 'string' },
            question: { type: 'string' },
            source_kind: { type: 'string', enum: ['교과서', '모의고사', '부교재', '기타'] },
            source_detail: { type: 'string' },
          },
          required: ['number', 'question_type', 'answer_format', 'instruction', 'question', 'source_kind', 'source_detail'],
          additionalProperties: false,
        },
      },
    },
    required: ['questions'],
    additionalProperties: false,
  };
}

const SOURCE_KINDS = ['교과서', '모의고사', '부교재', '기타'];

function cleanScopeText(value, maxLen) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, maxLen);
}

function cleanScopeList(value, maxItems, maxLen) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const items = [];
  for (const entry of value) {
    const text = cleanScopeText(entry, maxLen);
    if (!text || seen.has(text)) continue;
    seen.add(text);
    items.push(text);
    if (items.length >= maxItems) break;
  }
  return items;
}

function readScope(body) {
  let parsed = {};
  try {
    parsed = JSON.parse(String(body?.scope || '{}'));
  } catch {
    parsed = {};
  }
  if (!parsed || typeof parsed !== 'object') parsed = {};
  const textbook = parsed.textbook && typeof parsed.textbook === 'object' ? parsed.textbook : {};
  const supplementary = parsed.supplementary && typeof parsed.supplementary === 'object' ? parsed.supplementary : {};
  return {
    textbook: {
      title: cleanScopeText(textbook.title, 200),
      units: cleanScopeList(textbook.units, 40, 100),
    },
    mockExams: cleanScopeList(parsed.mockExams, 40, 200),
    supplementary: {
      bookName: cleanScopeText(supplementary.bookName, 200),
      scopes: cleanScopeList(supplementary.scopes, 40, 100),
    },
  };
}

function compactText(value) {
  return String(value || '').replace(/\s+/g, '');
}

function longestMatch(detail, names) {
  const haystack = compactText(detail);
  let best = '';
  for (const name of names) {
    const needle = compactText(name);
    if (!needle || !haystack.includes(needle)) continue;
    if (needle.length > compactText(best).length) best = name;
  }
  return best;
}

function scopePrompt(scope) {
  const lines = ['사용자가 지정한 시험범위입니다. 이 범위에 없는 지문은 기타로 분류합니다.'];
  if (scope.textbook.title && scope.textbook.units.length > 0) {
    lines.push(`교과서: ${scope.textbook.title}`);
    for (const unit of scope.textbook.units) lines.push(`- ${unit}`);
  } else {
    lines.push('교과서: 지정한 단원 없음');
  }
  if (scope.mockExams.length > 0) {
    lines.push('모의고사:');
    for (const name of scope.mockExams) lines.push(`- ${name}`);
  } else {
    lines.push('모의고사: 지정한 시험 없음');
  }
  if (scope.supplementary.bookName && scope.supplementary.scopes.length > 0) {
    lines.push(`부교재: ${scope.supplementary.bookName}`);
    for (const subScope of scope.supplementary.scopes) lines.push(`- ${subScope}`);
  } else {
    lines.push('부교재: 지정한 하위범위 없음');
  }
  return lines.join('\n');
}

function normalizeSource(raw, scope) {
  let kind = cleanScopeText(raw?.source_kind, 20);
  let detail = cleanScopeText(raw?.source_detail, 200);
  if (!SOURCE_KINDS.includes(kind)) kind = '기타';

  if (kind === '교과서') {
    const unit = longestMatch(detail, scope.textbook.units);
    if (unit && scope.textbook.title) detail = `${scope.textbook.title} ${unit}`;
    else kind = '기타';
  } else if (kind === '모의고사') {
    const name = longestMatch(detail, scope.mockExams);
    if (name) detail = name;
    else kind = '기타';
  } else if (kind === '부교재') {
    const subScope = longestMatch(detail, scope.supplementary.scopes);
    if (subScope && scope.supplementary.bookName) detail = `${scope.supplementary.bookName} ${subScope}`;
    else kind = '기타';
  }

  if (kind === '기타') {
    detail = detail.replace(/^(교과서|모의고사|부교재|기타)\s*/, '').trim();
    if (!detail) detail = '출처를 찾지 못함';
  }

  detail = detail.slice(0, 200);
  const sourceLabel = kind === '기타' ? `기타 ${detail}` : `${kind} ${detail}`;
  return { source_kind: kind, source_detail: detail, source_label: sourceLabel };
}

// POST /api/exam-analysis/analyze - 시험지 파일을 받아 문항별 유형 분석
router.post('/analyze', authenticateToken, (req, res, next) => {
  uploadFields(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}, async (req, res) => {
  const images = req.files?.images || [];
  const pdf = req.files?.pdf?.[0];

  if (images.length === 0 && !pdf) {
    return res.status(400).json({ error: '시험지 사진이나 PDF 파일을 올려주세요' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: '서버에 ANTHROPIC_API_KEY가 설정되지 않았습니다' });
  }

  try {
    const byType = await loadTypeSamples();
    if (byType.size === 0) {
      return res.status(400).json({ error: '등록된 시험지유형이 없습니다. 관리자 > 시험지유형 관리에서 먼저 추가해주세요' });
    }

    // 사진은 올린 순서대로, PDF는 그 뒤에 붙인다
    const fileBlocks = [
      ...images.map((file) => ({
        type: 'image',
        source: { type: 'base64', media_type: file.mimetype, data: file.buffer.toString('base64') },
      })),
      ...(pdf
        ? [{
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: pdf.buffer.toString('base64') },
          }]
        : []),
    ];

    const scope = readScope(req.body);

    const stream = getClient().beta.messages.stream({
      model: MODEL,
      max_tokens: 32000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: {
        effort: 'medium',
        format: { type: 'json_schema', schema: buildOutputSchema([...byType.keys()]) },
      },
      // 유형 샘플 프롬프트는 매번 같으므로 캐시해서 비용을 줄인다
      system: [{ type: 'text', text: buildSystemPrompt(byType), cache_control: { type: 'ephemeral' } }],
      messages: [
        {
          role: 'user',
          content: [
            ...fileBlocks,
            { type: 'text', text: `이 시험지의 모든 문항을 순서대로 찾아 유형을 매칭하고, 각 문항 지문의 출처를 적어주세요.\n\n${scopePrompt(scope)}` },
          ],
        },
      ],
    });

    const message = await stream.finalMessage();

    if (message.stop_reason === 'refusal') {
      return res.status(422).json({ error: 'AI가 이 시험지 분석을 거절했습니다' });
    }
    if (message.stop_reason === 'max_tokens') {
      return res.status(422).json({ error: '시험지가 너무 길어 분석 결과가 잘렸습니다. 파일을 나눠서 올려주세요' });
    }

    const textBlock = message.content.find((block) => block.type === 'text');
    if (!textBlock) {
      return res.status(502).json({ error: 'AI 응답에 분석 결과가 없습니다' });
    }

    const { questions } = JSON.parse(textBlock.text);
    res.json({
      questions: (Array.isArray(questions) ? questions : []).map((question) => ({
        ...question,
        ...normalizeSource(question, scope),
      })),
    });
  } catch (error) {
    console.error('Exam analysis error:', error);
    if (error instanceof Anthropic.AuthenticationError) {
      return res.status(500).json({ error: 'ANTHROPIC_API_KEY가 올바르지 않습니다' });
    }
    if (error instanceof Anthropic.RateLimitError) {
      return res.status(429).json({ error: '요청이 많습니다. 잠시 후 다시 시도해주세요' });
    }
    if (error instanceof Anthropic.BadRequestError) {
      return res.status(400).json({ error: `파일을 분석할 수 없습니다: ${error.message}` });
    }
    if (error instanceof Anthropic.APIError) {
      return res.status(502).json({ error: 'AI 서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요' });
    }
    res.status(500).json({ error: '시험지 분석에 실패했습니다' });
  }
});

export default router;
