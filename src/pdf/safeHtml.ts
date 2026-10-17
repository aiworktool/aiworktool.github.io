const ALLOWED = new Set([
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'a', 'ul', 'ol', 'li',
  'table', 'thead', 'tbody', 'tr', 'th', 'td', 'h1', 'h2', 'h3', 'h4',
  'span', 'img', 'blockquote', 'sup', 'sub',
]);

// mammoth 的 HTML 会直接插入页面。只留下排版需要的标签，去掉脚本和危险链接。
export function safeDocHtml(html: string): string {
  const withoutBlocks = html.replace(
    /<(script|iframe|object|embed|style)\b[^>]*>[\s\S]*?<\/\1>/gi,
    '',
  );
  return withoutBlocks.replace(/<\/?([a-zA-Z0-9]+)([^>]*)>/g, (whole, rawTag: string, rawAttrs: string) => {
    const tag = rawTag.toLowerCase();
    if (!ALLOWED.has(tag)) return '';
    if (whole.startsWith('</')) return `</${tag}>`;
    const attrs = keepAttrs(tag, rawAttrs);
    if (attrs === null) return '';
    return `<${tag}${attrs}>`;
  });
}

function keepAttrs(tag: string, raw: string): string | null {
  if (tag === 'a') {
    const href = attrValue(raw, 'href');
    return href && safeLink(href) ? ` href="${escapeAttr(href)}"` : '';
  }
  if (tag === 'img') {
    const src = attrValue(raw, 'src');
    if (!src || !safeImage(src)) return null;
    return ` src="${escapeAttr(src)}" alt=""`;
  }
  return '';
}

function attrValue(raw: string, name: string): string {
  const match = new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i').exec(raw);
  return match?.[2] ?? match?.[3] ?? '';
}

function safeLink(href: string): boolean {
  return /^(https?:|mailto:)/i.test(href.trim());
}

function safeImage(src: string): boolean {
  return /^data:image\/(png|jpeg|jpg|gif|webp);/i.test(src.trim()) || /^https?:/i.test(src.trim());
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
