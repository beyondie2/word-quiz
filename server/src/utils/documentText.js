function decodeXmlEntities(value) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)));
}

function appendPart(parts, text, underline) {
  if (!text) return;
  const last = parts[parts.length - 1];
  if (last && last.underline === underline) last.text += text;
  else parts.push({ text, underline });
}

function renderParts(parts) {
  return parts
    .map((part) => (part.underline ? `<u>${part.text}</u>` : part.text))
    .join('')
    .replace(/<\/u>([ \t]*)<u>/g, '$1');
}

function runIsUnderlined(run) {
  return /<w:u\b(?![^>]*w:val="(?:none|false|0)")[^>]*\/?>/.test(run);
}

export function wordXmlToText(xml) {
  const source = String(xml || '')
    .replace(/<w:del\b[\s\S]*?<\/w:del>/g, '')
    .replace(/<w:tab\/>/g, '\t')
    .replace(/<w:br\b[^>]*\/>/g, '\n')
    .replace(/<w:cr\b[^>]*\/>/g, '\n');
  const lines = [];

  for (const paragraph of source.split(/<\/w:p>/)) {
    const parts = [];
    for (const match of paragraph.matchAll(/<w:r\b[^>]*>([\s\S]*?)<\/w:r>/g)) {
      const run = match[1];
      const text = [...run.matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g)]
        .map((item) => decodeXmlEntities(item[1]))
        .join('');
      appendPart(parts, text, runIsUnderlined(run));
    }
    const line = renderParts(parts);
    if (line) lines.push(line);
  }

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

export function htmlToUnderlineText(html) {
  let source = String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|tr|table)>/gi, '\n')
    .replace(/<\/t[dh]>/gi, '\t');

  let previous = '';
  while (source !== previous) {
    previous = source;
    source = source.replace(/<span\b([^>]*)>([\s\S]*?)<\/span>/gi, (_, attrs, inner) => (
      /text-decoration\s*:\s*underline/i.test(attrs) ? `<u>${inner}</u>` : inner
    ));
  }

  source = source.replace(/<(?!\/?u\b)[^>]+>/gi, '');
  source = decodeXmlEntities(source).replace(/<\/u>([ \t]*)<u>/g, '$1');
  return source.replace(/\n{3,}/g, '\n\n').trim();
}

export function rtfToText(rtf) {
  const input = String(rtf || '');
  const parts = [];
  const stack = [false];
  let underline = false;
  let index = 0;

  const skipControlSpace = () => {
    if (input[index] === ' ') index += 1;
  };

  while (index < input.length) {
    const char = input[index];
    if (char === '{') {
      stack.push(underline);
      index += 1;
      continue;
    }
    if (char === '}') {
      underline = stack.pop() ?? false;
      index += 1;
      continue;
    }
    if (char !== '\\') {
      appendPart(parts, char, underline);
      index += 1;
      continue;
    }

    if (input.startsWith('\\ulnone', index) || input.startsWith('\\ul0', index)) {
      underline = false;
      index += input.startsWith('\\ulnone', index) ? 7 : 4;
      skipControlSpace();
      continue;
    }
    if (input.startsWith('\\ul', index) && !/^\\u-?\d/.test(input.slice(index))) {
      underline = true;
      index += 3;
      skipControlSpace();
      continue;
    }
    if (input.startsWith('\\pard', index)) {
      index += 5;
      skipControlSpace();
      continue;
    }
    if (input.startsWith('\\par', index)) {
      appendPart(parts, '\n', false);
      index += 4;
      skipControlSpace();
      continue;
    }
    if (input.startsWith('\\tab', index)) {
      appendPart(parts, '\t', underline);
      index += 4;
      skipControlSpace();
      continue;
    }
    const unicode = input.slice(index).match(/^\\u(-?\d+)\??/);
    if (unicode) {
      const code = Number(unicode[1]);
      appendPart(parts, String.fromCharCode(code < 0 ? code + 65536 : code), underline);
      index += unicode[0].length;
      continue;
    }
    const hex = input.slice(index).match(/^\\'([0-9a-f]{2})/i);
    if (hex) {
      index += hex[0].length;
      continue;
    }
    const word = input.slice(index).match(/^\\[a-z]+-?\d* ?/i);
    if (word) {
      index += word[0].length;
      continue;
    }
    index += 1;
  }

  return renderParts(parts).replace(/\n{3,}/g, '\n\n').trim();
}
