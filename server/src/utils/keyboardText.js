// 엑셀에 섞인, 키보드로 칠 수 없는 문자를 키보드 문자로 바꾼다.
// 아포스트로피·따옴표·대시는 같은 모양의 키보드 문자로 바꾸고,
// 악센트는 기본 글자로 풀며, 대응 문자가 없는 기호는 빼 둔다.

const LOOKALIKES = [
  [/[\u2018\u2019\u201A\u201B\u2032\u2035\u02B9\u02BB\u02BC\u00B4]/g, "'"],
  [/[\u201C\u201D\u201E\u201F\u2033\u2036\u00AB\u00BB\u2039\u203A\u301D\u301E\u301F]/g, '"'],
  [/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212\uFE58\uFE63\uFF0D]/g, '-'],
  [/\u2026/g, '...'],
  [/[\u00B7\u2022\u2027\u30FB\uFF65]/g, '.'],
  [/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' '],
  [/[\u00AD\u200B-\u200D\u2060\uFEFF]/g, ''],
];

const KEYBOARD_CHAR = /[\t\n\r\u20A9\u1100-\u11FF\u3130-\u318F\uA960-\uA97F\uAC00-\uD7A3\uD7B0-\uD7FF\u0020-\u007E]/;

export function toKeyboardText(value) {
  if (typeof value !== 'string') return value;
  let text = value.normalize('NFKC');
  for (const [pattern, replacement] of LOOKALIKES) {
    text = text.replace(pattern, replacement);
  }
  text = text.normalize('NFKD').replace(/\p{M}/gu, '').normalize('NFC');
  return [...text].filter((char) => KEYBOARD_CHAR.test(char)).join('');
}
