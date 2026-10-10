const escapeHtml = (value: string): string => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const safeHref = (href: string): string => {
  const trimmedHref = href.trim();
  if (/^(https?:\/\/|\/|#)/i.test(trimmedHref) && !/^javascript:/i.test(trimmedHref)) {
    return trimmedHref;
  }
  return '#';
};

const renderInlineMarkdown = (value: string): string => {
  const escaped = escapeHtml(value);
  const tokens: string[] = [];
  const protect = (html: string): string => {
    tokens.push(html);
    return `\u0000TOKEN${tokens.length - 1}\u0000`;
  };

  let rendered = escaped
    .replace(/`([^`]+)`/g, (_, code: string) => protect(`<code>${code}</code>`))
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, text: string, href: string) => {
      return protect(`<a href="${escapeHtml(safeHref(href))}">${text}</a>`);
    })
    .replace(/\*\*([^*]+)\*\*|__([^_]+)__/g, (_, bold: string, alternateBold: string) => `<strong>${bold || alternateBold}</strong>`)
    .replace(/\*([^*]+)\*|_([^_]+)_/g, (_, italic: string, alternateItalic: string) => `<em>${italic || alternateItalic}</em>`);

  return rendered.replace(/\u0000TOKEN(\d+)\u0000/g, (_, index: string) => tokens[Number(index)]);
};

export const renderMarkdown = (markdown: string): string => {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const output: string[] = [];
  let paragraph: string[] = [];
  let listType: 'ul' | 'ol' | null = null;
  let listItems: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      output.push(`<p>${paragraph.map(renderInlineMarkdown).join('<br />')}</p>`);
      paragraph = [];
    }
  };

  const flushList = () => {
    if (listType && listItems.length > 0) {
      output.push(`<${listType}>${listItems.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join('')}</${listType}>`);
    }
    listType = null;
    listItems = [];
  };

  for (const line of lines) {
    const heading = line.match(/^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/);
    const unorderedItem = line.match(/^\s*[-*+]\s+(.+)$/);
    const orderedItem = line.match(/^\s*\d+[.)]\s+(.+)$/);

    if (heading) {
      flushParagraph();
      flushList();
      output.push(`<h${Math.max(2, Math.min(6, line.match(/^\s*(#+)/)?.[1].length || 2))}>${renderInlineMarkdown(heading[1])}</h${Math.max(2, Math.min(6, line.match(/^\s*(#+)/)?.[1].length || 2))}>`);
    } else if (unorderedItem || orderedItem) {
      flushParagraph();
      const nextListType = unorderedItem ? 'ul' : 'ol';
      if (listType !== nextListType) {
        flushList();
        listType = nextListType;
      }
      listItems.push((unorderedItem || orderedItem)![1]);
    } else if (!line.trim()) {
      flushParagraph();
      flushList();
    } else {
      if (listType) flushList();
      paragraph.push(line.trim());
    }
  }

  flushParagraph();
  flushList();
  return output.join('');
};
