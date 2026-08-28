/**
 * Bộ phân tích nội dung tin nhắn thuần túy (Pure Markdown & Link/Mention Parser).
 * Không dùng innerHTML để đảm bảo tuyệt đối an toàn chống XSS.
 */

export type MessageTokenType =
  | 'text'
  | 'link'
  | 'md-link'
  | 'image'
  | 'mention'
  | 'channel'
  | 'spoiler'
  | 'bold'
  | 'italic'
  | 'strike'
  | 'inline-code'
  | 'code-block'
  | 'quote';

export interface MessageContentToken {
  key: string;
  type: MessageTokenType;
  value: string;
  url?: string;
  language?: string;
  isEveryone?: boolean;
  children?: MessageContentToken[];
}

const URL_CANDIDATE_REGEX = /(https?:\/\/[^\s<>"'`]+)/g;
const TRAILING_PUNCTUATION_REGEX = /[.,!?;:)}\]]+$/;

/**
 * Regex nhận diện Mention:
 * - Bắt đầu bằng @ sau ký tự đầu dòng, khoảng trắng hoặc dấu mở ngoặc/quote (^|[\s(\[{<"'])
 * - Tên username: [a-zA-Z0-9_.]{3,32} hoặc từ khóa 'everyone'
 */
const MENTION_CANDIDATE_REGEX = /(^|[\s(\[{<"'])@([a-zA-Z0-9_.]{3,32}|everyone)/gi;

/** Regex nhận diện Spoiler: bọc trong ||nội dung|| */
const SPOILER_REGEX = /\|\|([\s\S]+?)\|\|/g;

/** Regex nhận diện Code Block: ```lang\ncode\n``` */
const CODE_BLOCK_REGEX = /```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/g;

/** Regex nhận diện Inline Code: `code` */
const INLINE_CODE_REGEX = /`([^`\n]+)`/g;

/** Regex nhận diện Markdown Image: ![alt](url) */
const IMAGE_REGEX = /!\[([^\]\n]*)\]\((https?:\/\/[^\s<>"'`)]+)\)/g;

/** Regex nhận diện Markdown Link: [label](url) */
const MD_LINK_REGEX = /(?:^|[^\!])\[([^\]\n]+)\]\((https?:\/\/[^\s<>"'`)]+)\)/g;

/** Regex nhận diện Bold: **text** */
const BOLD_REGEX = /\*\*([\s\S]+?)\*\*/g;

/** Regex nhận diện Strike: ~~text~~ */
const STRIKE_REGEX = /~~([\s\S]+?)~~/g;

/** Regex nhận diện Italic: *text* hoặc _text_ */
const ITALIC_STAR_REGEX = /(^|[^\*])\*([^\*\n]+?)\*([^\*]|$)/g;
const ITALIC_UNDERSCORE_REGEX = /(^|[^_])_([^_\n]+?)_([^_]|$)/g;

/**
 * Hàm phân tích đệ quy cho các đoạn text thông thường (bold, italic, strike, spoiler, links, mentions).
 */
function parseInlineSpans(
  text: string,
  prefix: string,
  depth = 0,
): MessageContentToken[] {
  if (!text) return [];
  if (depth > 5) return [{ key: `${prefix}-text`, type: 'text', value: text }];

  // 1. Phân tách Code Block trước (nếu có)
  if (text.includes('```')) {
    const tokens: MessageContentToken[] = [];
    let lastIdx = 0;
    let counter = 0;
    const matches = text.matchAll(CODE_BLOCK_REGEX);

    for (const match of matches) {
      const matchIdx = match.index ?? 0;
      const lang = match[1] || '';
      const code = match[2] || '';

      if (matchIdx > lastIdx) {
        tokens.push(...parseInlineSpans(text.substring(lastIdx, matchIdx), `${prefix}-cb-${counter++}`, depth + 1));
      }

      tokens.push({
        key: `${prefix}-cb-${counter++}`,
        type: 'code-block',
        value: code,
        language: lang,
      });

      lastIdx = matchIdx + match[0].length;
    }

    if (lastIdx < text.length) {
      tokens.push(...parseInlineSpans(text.substring(lastIdx), `${prefix}-cb-${counter++}`, depth + 1));
    }
    return tokens;
  }

  // 2. Phân tách Inline Code
  if (text.includes('`')) {
    const tokens: MessageContentToken[] = [];
    let lastIdx = 0;
    let counter = 0;
    const matches = text.matchAll(INLINE_CODE_REGEX);

    for (const match of matches) {
      const matchIdx = match.index ?? 0;
      const code = match[1];

      if (matchIdx > lastIdx) {
        tokens.push(...parseInlineSpans(text.substring(lastIdx, matchIdx), `${prefix}-ic-${counter++}`, depth + 1));
      }

      tokens.push({
        key: `${prefix}-ic-${counter++}`,
        type: 'inline-code',
        value: code,
      });

      lastIdx = matchIdx + match[0].length;
    }

    if (lastIdx < text.length) {
      tokens.push(...parseInlineSpans(text.substring(lastIdx), `${prefix}-ic-${counter++}`, depth + 1));
    }
    return tokens;
  }

  // 3. Phân tách Markdown Images ![alt](url)
  if (text.includes('![') && text.includes('](')) {
    const tokens: MessageContentToken[] = [];
    let lastIdx = 0;
    let counter = 0;
    const matches = text.matchAll(IMAGE_REGEX);

    for (const match of matches) {
      const matchIdx = match.index ?? 0;
      const alt = match[1] || '';
      const href = match[2];

      if (matchIdx > lastIdx) {
        tokens.push(...parseInlineSpans(text.substring(lastIdx, matchIdx), `${prefix}-img-${counter++}`, depth + 1));
      }

      tokens.push({
        key: `${prefix}-img-${counter++}`,
        type: 'image',
        value: alt,
        url: href,
      });

      lastIdx = matchIdx + match[0].length;
    }

    if (lastIdx < text.length) {
      tokens.push(...parseInlineSpans(text.substring(lastIdx), `${prefix}-img-${counter++}`, depth + 1));
    }
    return tokens;
  }

  // 4. Phân tách Markdown Links [label](url)
  if (text.includes('[') && text.includes('](')) {
    const tokens: MessageContentToken[] = [];
    let lastIdx = 0;
    let counter = 0;
    const matches = text.matchAll(MD_LINK_REGEX);

    for (const match of matches) {
      const matchIdx = match.index ?? 0;
      const rawMatch = match[0];
      const label = match[1];
      const href = match[2];

      const linkStart = rawMatch.startsWith('[') ? matchIdx : matchIdx + 1;

      if (linkStart > lastIdx) {
        tokens.push(...parseInlineSpans(text.substring(lastIdx, linkStart), `${prefix}-ml-${counter++}`, depth + 1));
      }

      tokens.push({
        key: `${prefix}-ml-${counter++}`,
        type: 'md-link',
        value: label,
        url: href,
      });

      lastIdx = linkStart + (rawMatch.startsWith('[') ? rawMatch.length : rawMatch.length - 1);
    }

    if (lastIdx < text.length) {
      tokens.push(...parseInlineSpans(text.substring(lastIdx), `${prefix}-ml-${counter++}`, depth + 1));
    }
    return tokens;
  }

  // 4. Phân tách Spoilers ||...||
  if (text.includes('||')) {
    const tokens: MessageContentToken[] = [];
    let lastIdx = 0;
    let counter = 0;
    const matches = text.matchAll(SPOILER_REGEX);

    for (const match of matches) {
      const matchIdx = match.index ?? 0;
      const spoiler = match[1];

      if (matchIdx > lastIdx) {
        tokens.push(...parseInlineSpans(text.substring(lastIdx, matchIdx), `${prefix}-sp-${counter++}`, depth + 1));
      }

      tokens.push({
        key: `${prefix}-sp-${counter++}`,
        type: 'spoiler',
        value: spoiler,
        children: parseInlineSpans(spoiler, `${prefix}-spchild-${counter}`, depth + 1),
      });

      lastIdx = matchIdx + match[0].length;
    }

    if (lastIdx < text.length) {
      tokens.push(...parseInlineSpans(text.substring(lastIdx), `${prefix}-sp-${counter++}`, depth + 1));
    }
    return tokens;
  }

  // 5. Phân tách Bold **...**
  if (text.includes('**')) {
    const tokens: MessageContentToken[] = [];
    let lastIdx = 0;
    let counter = 0;
    const matches = text.matchAll(BOLD_REGEX);

    for (const match of matches) {
      const matchIdx = match.index ?? 0;
      const boldContent = match[1];

      if (matchIdx > lastIdx) {
        tokens.push(...parseInlineSpans(text.substring(lastIdx, matchIdx), `${prefix}-b-${counter++}`, depth + 1));
      }

      tokens.push({
        key: `${prefix}-b-${counter++}`,
        type: 'bold',
        value: boldContent,
        children: parseInlineSpans(boldContent, `${prefix}-bchild-${counter}`, depth + 1),
      });

      lastIdx = matchIdx + match[0].length;
    }

    if (lastIdx < text.length) {
      tokens.push(...parseInlineSpans(text.substring(lastIdx), `${prefix}-b-${counter++}`, depth + 1));
    }
    return tokens;
  }

  // 6. Phân tách Strike ~~...~~
  if (text.includes('~~')) {
    const tokens: MessageContentToken[] = [];
    let lastIdx = 0;
    let counter = 0;
    const matches = text.matchAll(STRIKE_REGEX);

    for (const match of matches) {
      const matchIdx = match.index ?? 0;
      const strikeContent = match[1];

      if (matchIdx > lastIdx) {
        tokens.push(...parseInlineSpans(text.substring(lastIdx, matchIdx), `${prefix}-s-${counter++}`, depth + 1));
      }

      tokens.push({
        key: `${prefix}-s-${counter++}`,
        type: 'strike',
        value: strikeContent,
        children: parseInlineSpans(strikeContent, `${prefix}-schild-${counter}`, depth + 1),
      });

      lastIdx = matchIdx + match[0].length;
    }

    if (lastIdx < text.length) {
      tokens.push(...parseInlineSpans(text.substring(lastIdx), `${prefix}-s-${counter++}`, depth + 1));
    }
    return tokens;
  }

  // 7. Phân tách Italic *...* hoặc _..._
  if (text.includes('*')) {
    const tokens: MessageContentToken[] = [];
    let lastIdx = 0;
    let counter = 0;
    const matches = text.matchAll(ITALIC_STAR_REGEX);

    for (const match of matches) {
      const matchIdx = match.index ?? 0;
      const leadingChar = match[1] || '';
      const italicContent = match[2];
      const trailingChar = match[3] || '';

      const contentStart = matchIdx + leadingChar.length;

      if (contentStart > lastIdx) {
        tokens.push(...parseInlineSpans(text.substring(lastIdx, contentStart), `${prefix}-it-${counter++}`, depth + 1));
      }

      tokens.push({
        key: `${prefix}-it-${counter++}`,
        type: 'italic',
        value: italicContent,
        children: parseInlineSpans(italicContent, `${prefix}-itchild-${counter}`, depth + 1),
      });

      lastIdx = contentStart + 1 + italicContent.length + 1; // +2 for stars
      if (trailingChar) {
        lastIdx -= trailingChar.length;
      }
    }

    if (lastIdx < text.length) {
      tokens.push(...parseInlineSpans(text.substring(lastIdx), `${prefix}-it-${counter++}`, depth + 1));
    }
    return tokens;
  }

  // 8. Phân tách Auto URLs
  if (text.includes('http://') || text.includes('https://')) {
    const tokens: MessageContentToken[] = [];
    let lastIdx = 0;
    let counter = 0;
    const urlMatches = text.matchAll(URL_CANDIDATE_REGEX);

    for (const match of urlMatches) {
      const matchIdx = match.index ?? 0;
      const rawUrl = match[0];

      if (matchIdx > lastIdx) {
        tokens.push(...parseInlineSpans(text.substring(lastIdx, matchIdx), `${prefix}-u-${counter++}`, depth + 1));
      }

      const puncMatch = rawUrl.match(TRAILING_PUNCTUATION_REGEX);
      let candidateUrl = rawUrl;
      let trailingPunctuation = '';

      if (puncMatch) {
        trailingPunctuation = puncMatch[0];
        candidateUrl = rawUrl.slice(0, rawUrl.length - trailingPunctuation.length);
      }

      let isValidHttpUrl = false;
      let finalHref = '';
      try {
        const urlObj = new URL(candidateUrl);
        if (urlObj.protocol === 'http:' || urlObj.protocol === 'https:') {
          isValidHttpUrl = true;
          finalHref = urlObj.href;
        }
      } catch {
        isValidHttpUrl = false;
      }

      if (isValidHttpUrl) {
        tokens.push({
          key: `${prefix}-u-${counter++}`,
          type: 'link',
          value: candidateUrl,
          url: finalHref,
        });
      } else {
        tokens.push({
          key: `${prefix}-u-${counter++}`,
          type: 'text',
          value: candidateUrl,
        });
      }

      if (trailingPunctuation) {
        tokens.push({
          key: `${prefix}-u-${counter++}`,
          type: 'text',
          value: trailingPunctuation,
        });
      }

      lastIdx = matchIdx + rawUrl.length;
    }

    if (lastIdx < text.length) {
      tokens.push(...parseInlineSpans(text.substring(lastIdx), `${prefix}-u-${counter++}`, depth + 1));
    }
    return tokens;
  }

  // 9. Phân tách Mentions @username / @everyone
  if (text.includes('@')) {
    const tokens: MessageContentToken[] = [];
    let lastIdx = 0;
    let counter = 0;
    const mentionMatches = text.matchAll(MENTION_CANDIDATE_REGEX);

    for (const match of mentionMatches) {
      const fullMatchIdx = match.index ?? 0;
      const prefixChar = match[1] || '';
      let rawUsername = match[2];
      const mentionStart = fullMatchIdx + prefixChar.length;

      if (mentionStart > lastIdx) {
        tokens.push({
          key: `${prefix}-m-${counter++}`,
          type: 'text',
          value: text.substring(lastIdx, mentionStart),
        });
      }

      let trailingPunctuation = '';
      const puncMatch = rawUsername.match(TRAILING_PUNCTUATION_REGEX);
      if (puncMatch && rawUsername.length - puncMatch[0].length >= 3) {
        trailingPunctuation = puncMatch[0];
        rawUsername = rawUsername.slice(0, rawUsername.length - trailingPunctuation.length);
      }

      const isEveryone = rawUsername.toLowerCase() === 'everyone';

      if (isEveryone) {
        tokens.push({
          key: `${prefix}-m-${counter++}`,
          type: 'mention',
          value: 'everyone',
          isEveryone: true,
        });
      } else {
        tokens.push({
          key: `${prefix}-m-${counter++}`,
          type: 'text',
          value: `@${rawUsername}`,
        });
      }

      if (trailingPunctuation) {
        tokens.push({
          key: `${prefix}-m-${counter++}`,
          type: 'text',
          value: trailingPunctuation,
        });
      }

      lastIdx = mentionStart + 1 + rawUsername.length + trailingPunctuation.length;
    }

    if (lastIdx < text.length) {
      tokens.push({
        key: `${prefix}-m-${counter++}`,
        type: 'text',
        value: text.substring(lastIdx),
      });
    }
    return tokens;
  }

  // Mặc định là text token thuần
  return [
    {
      key: `${prefix}-text`,
      type: 'text',
      value: text,
    },
  ];
}

/**
 * Phân tích toàn bộ nội dung tin nhắn thành cây token Markdown an toàn:
 * - Hỗ trợ Blockquotes (> ...), Code Blocks (```), Spoilers (||), Bold, Italic, Strike, Inline Code, Links, Mentions.
 */
export function parseMessageContent(
  content: string | null | undefined,
  keyPrefix = 'msg',
): MessageContentToken[] {
  if (!content) return [];

  // Fast path nếu không có bất kỳ ký tự đặc biệt nào
  if (
    !content.includes('http://') &&
    !content.includes('https://') &&
    !content.includes('@') &&
    !content.includes('||') &&
    !content.includes('**') &&
    !content.includes('~~') &&
    !content.includes('`') &&
    !content.includes('[') &&
    !content.includes('>') &&
    !content.includes('*')
  ) {
    return [
      {
        key: `${keyPrefix}-tok-0-text`,
        type: 'text',
        value: content,
      },
    ];
  }

  // 1. Phân tách Blockquotes theo dòng
  const lines = content.split('\n');
  const blocks: { isQuote: boolean; lines: string[] }[] = [];
  let currentBlock: { isQuote: boolean; lines: string[] } | null = null;

  for (const line of lines) {
    const isQuoteLine = line.startsWith('> ');
    const cleanLine = isQuoteLine ? line.slice(2) : line;

    if (!currentBlock || currentBlock.isQuote !== isQuoteLine) {
      currentBlock = { isQuote: isQuoteLine, lines: [cleanLine] };
      blocks.push(currentBlock);
    } else {
      currentBlock.lines.push(cleanLine);
    }
  }

  const resultTokens: MessageContentToken[] = [];
  let blockCounter = 0;

  for (const block of blocks) {
    const blockText = block.lines.join('\n');
    const blockPrefix = `${keyPrefix}-b${blockCounter++}`;

    if (block.isQuote) {
      resultTokens.push({
        key: `${blockPrefix}-quote`,
        type: 'quote',
        value: blockText,
        children: parseInlineSpans(blockText, `${blockPrefix}-qchild`),
      });
    } else {
      resultTokens.push(...parseInlineSpans(blockText, blockPrefix));
    }
  }

  // Tối ưu gộp các text token rỗng hoặc liền kề
  const mergedTokens: MessageContentToken[] = [];
  for (const tok of resultTokens) {
    if (!tok.value && tok.type === 'text') continue;
    const prev = mergedTokens[mergedTokens.length - 1];
    if (prev && prev.type === 'text' && tok.type === 'text') {
      prev.value += tok.value;
    } else {
      mergedTokens.push({ ...tok });
    }
  }

  return mergedTokens;
}

/**
 * Trích xuất danh sách username (viết thường, không trùng lặp) được nhắc tới trong tin nhắn.
 */
export function extractMentionUsernames(content: string | null | undefined): string[] {
  if (!content || !content.includes('@')) {
    return [];
  }
  const usernames = new Set<string>();
  const matches = content.matchAll(MENTION_CANDIDATE_REGEX);
  for (const m of matches) {
    const raw = (m[2] || '').toLowerCase();
    if (raw && raw !== 'everyone') {
      usernames.add(raw);
    }
  }
  return Array.from(usernames);
}

/**
 * Kiểm tra xem tin nhắn có nhắc tới username cụ thể hay không.
 */
export function isMentioningUser(
  content: string | null | undefined,
  targetUsername: string | null | undefined,
): boolean {
  if (!content || !targetUsername) {
    return false;
  }
  const mentions = extractMentionUsernames(content);
  return mentions.includes(targetUsername.toLowerCase());
}

/**
 * Kiểm tra xem tin nhắn có chứa @everyone hay không.
 */
export function isMentioningEveryone(content: string | null | undefined): boolean {
  if (!content || !content.includes('@')) {
    return false;
  }
  return /(^|[\s(\[{<"'])@everyone\b/i.test(content);
}
