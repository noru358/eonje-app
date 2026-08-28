function decodeEntities(value) {
  return String(value)
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

function addValue(target, key, value) {
  if (!(key in target)) {
    target[key] = value;
    return;
  }
  if (Array.isArray(target[key])) target[key].push(value);
  else target[key] = [target[key], value];
}

function collapse(node) {
  const text = decodeEntities(node.text.join('')).trim();
  const keys = Object.keys(node.children);
  if (!keys.length) return text;
  if (text) node.children._text = text;
  return node.children;
}

// Deliberately small XML parser for Seoul Open API payloads. It ignores
// attributes because citydata is represented through elements/text only, but
// preserves repeated tags as arrays and dotted tag names such as RESULT.CODE.
export function parseXml(xml) {
  const source = String(xml || '').replace(/^\uFEFF/, '');
  const doc = {};
  const stack = [{ name: null, children: doc, text: [] }];
  const tokens = source.match(/<!--[\s\S]*?-->|<\?[^>]*\?>|<!\[CDATA\[[\s\S]*?\]\]>|<[^>]+>|[^<]+/g) || [];

  for (const token of tokens) {
    if (token.startsWith('<!--') || token.startsWith('<?')) continue;
    if (token.startsWith('<![CDATA[')) {
      stack[stack.length - 1].text.push(token.slice(9, -3));
      continue;
    }
    if (token.startsWith('</')) {
      if (stack.length === 1) throw new Error('Malformed Seoul XML: unexpected closing tag');
      const closingName = token.slice(2, -1).trim();
      const node = stack.pop();
      if (closingName !== node.name) throw new Error(`Malformed Seoul XML: expected </${node.name}> but found </${closingName}>`);
      addValue(stack[stack.length - 1].children, node.name, collapse(node));
      continue;
    }
    if (token.startsWith('<')) {
      if (token.startsWith('<!')) continue;
      const selfClosing = /\/\s*>$/.test(token);
      const inner = token.slice(1, selfClosing ? -2 : -1).trim();
      const name = inner.split(/\s+/, 1)[0];
      if (!name) continue;
      if (selfClosing) addValue(stack[stack.length - 1].children, name, '');
      else stack.push({ name, children: {}, text: [] });
      continue;
    }
    stack[stack.length - 1].text.push(token);
  }

  if (stack.length !== 1) throw new Error('Malformed Seoul XML: unclosed tag');
  return doc;
}

function first(v) {
  if (Array.isArray(v)) return first(v[0]);
  if (v && typeof v === 'object' && '_text' in v) return first(v._text);
  return v;
}

export function parseSeoulXml(xml) {
  const payload = parseXml(xml);
  const root = payload['SeoulRtd.citydata'];
  const result = root?.RESULT || payload.RESULT;
  const code = first(result?.['RESULT.CODE'] ?? result?.CODE);
  const message = first(result?.['RESULT.MESSAGE'] ?? result?.MESSAGE);

  if (code && code !== 'INFO-000') {
    throw new Error(`Seoul API ${code}${message ? `: ${message}` : ''}`);
  }
  if (!root?.CITYDATA) {
    throw new Error('Seoul API XML did not contain CITYDATA');
  }
  return payload;
}
