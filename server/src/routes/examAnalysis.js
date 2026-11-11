import express from 'express';
import multer from 'multer';
import Anthropic from '@anthropic-ai/sdk';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

// 문제 만들기 > 새로 만들기: 업로드한 시험지(사진/PDF)를 Claude로 읽어 문항별 유형을 매칭한다.

const MODEL = 'claude-opus-5-5';
const SAMPLES_PER_TYPE = 2; // 프롬프트에 넣을 유형별 예시 문제 수
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

// 유형 샘플을 유형별로 묶어 프롬프트용 텍스트로 만든다
async function loadTypeSamples() {
  const result = await pool.query(`
    SELECT question_type, question
    FROM (
      SELECT question_type, question,
             ROW_NUMBER() OVER (PARTITION BY question_type ORDER BY id) AS rn
      FROM question_type_samples
    ) t
    WHERE rn <= $1
    ORDER BY question_type, rn
  `, [SAMPLES_PER_TYPE]);

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
    '',
    '하나의 지문에 여러 문항이 딸린 경우에도 문항마다 따로 적습니다. 문항을 빠뜨리거나 합치지 마세요.',
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
          },
          required: ['number', 'question_type', 'answer_format', 'instruction'],
          additionalProperties: false,
        },
      },
    },
    required: ['questions'],
    additionalProperties: false,
  };
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
            { type: 'text', text: '이 시험지의 모든 문항을 순서대로 찾아 유형을 매칭해주세요.' },
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
    res.json({ questions });
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
