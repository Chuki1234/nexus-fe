/**
 * Bộ phân tích nội dung tin nhắn thuần túy (Pure Parser), không dùng innerHTML.
 * Linkify an toàn các URL http/https và phân tích Mention (@username, @everyone) an toàn.
 */

export interface MessageContentToken {
  key: string;
  type: 'text' | 'link' | 'mention';
  value: string;
  url?: string;
  isEveryone?: boolean;
}

const URL_CANDIDATE_REGEX = /(https?:\/\/[^\s<>"'`]+)/g;
const TRAILING_PUNCTUATION_REGEX = /[.,!?;:)}\]]+$/;

/**
 * Regex nhận diện Mention:
 * - Bắt đầu bằng @ sau ký tự đầu dòng, khoảng trắng hoặc dấu mở ngoặc/quote (^|[\s(\[{<"'])
 * - Tên username contract: [a-zA-Z0-9_.]{3,32} hoặc từ khóa 'everyone'
 */
const MENTION_CANDIDATE_REGEX = /(^|[\s(\[{<"'])@([a-zA-Z0-9_.]{3,32}|everyone)/g;

export function parseMessageContent(
  content: string | null | undefined,
  keyPrefix = 'msg',
): MessageContentToken[] {
  if (!content) {
    return [];
  }

  // Fast path: nếu không chứa http://, https:// và không chứa @ thì trả về toàn bộ text token
  if (!content.includes('http://') && !content.includes('https://') && !content.includes('@')) {
    return [
      {
        key: `${keyPrefix}-tok-0-text`,
        type: 'text',
        value: content,
      },
    ];
  }

  // Pass 1: Tách các URL hợp lệ
  const pass1Tokens: MessageContentToken[] = [];
  let lastIndex = 0;
  let tokenCounter = 0;

  const urlMatches = content.matchAll(URL_CANDIDATE_REGEX);

  for (const match of urlMatches) {
    const matchIndex = match.index ?? 0;
    const rawCandidate = match[0];

    // Phần văn bản trước URL
    if (matchIndex > lastIndex) {
      const textChunk = content.substring(lastIndex, matchIndex);
      pass1Tokens.push({
        key: `${keyPrefix}-p1-${tokenCounter++}-text`,
        type: 'text',
        value: textChunk,
      });
    }

    lastIndex = matchIndex + rawCandidate.length;

    // Tách dấu câu cuối URL
    const puncMatch = rawCandidate.match(TRAILING_PUNCTUATION_REGEX);
    let candidateUrl = rawCandidate;
    let trailingPunctuation = '';

    if (puncMatch) {
      trailingPunctuation = puncMatch[0];
      candidateUrl = rawCandidate.slice(0, rawCandidate.length - trailingPunctuation.length);
    }

    // Xác thực an toàn bằng new URL()
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

    if (isValidHttpUrl && candidateUrl.length > 0) {
      pass1Tokens.push({
        key: `${keyPrefix}-p1-${tokenCounter++}-link`,
        type: 'link',
        value: candidateUrl,
        url: finalHref,
      });

      if (trailingPunctuation) {
        pass1Tokens.push({
          key: `${keyPrefix}-p1-${tokenCounter++}-text`,
          type: 'text',
          value: trailingPunctuation,
        });
      }
    } else {
      pass1Tokens.push({
        key: `${keyPrefix}-p1-${tokenCounter++}-text`,
        type: 'text',
        value: rawCandidate,
      });
    }
  }

  if (lastIndex < content.length) {
    const trailingChunk = content.substring(lastIndex);
    pass1Tokens.push({
      key: `${keyPrefix}-p1-${tokenCounter++}-text`,
      type: 'text',
      value: trailingChunk,
    });
  }

  // Pass 2: Trong các text token, phân tách tiếp các mention @username / @everyone
  const pass2Tokens: MessageContentToken[] = [];
  let pass2Counter = 0;

  for (const token of pass1Tokens) {
    if (token.type !== 'text' || !token.value.includes('@')) {
      pass2Tokens.push({
        ...token,
        key: `${keyPrefix}-tok-${pass2Counter++}-${token.type}`,
      });
      continue;
    }

    const text = token.value;
    let textLastIndex = 0;
    const mentionMatches = text.matchAll(MENTION_CANDIDATE_REGEX);

    for (const mMatch of mentionMatches) {
      const fullMatchIndex = mMatch.index ?? 0;
      const prefix = mMatch[1]; // e.g. " " or "(" or ""
      let rawUsername = mMatch[2]; // e.g. "minhtai" or "minhtai."

      const mentionStartIndex = fullMatchIndex + prefix.length;

      // Text trước mention (bao gồm prefix ký tự ngăn cách nếu có)
      if (mentionStartIndex > textLastIndex) {
        const precedingText = text.substring(textLastIndex, mentionStartIndex);
        pass2Tokens.push({
          key: `${keyPrefix}-tok-${pass2Counter++}-text`,
          type: 'text',
          value: precedingText,
        });
      }

      // Xử lý dấu câu kết thúc dính vào username (ví dụ: @minhtai. hoặc @minhtai,)
      let trailingPunctuation = '';
      const puncMatch = rawUsername.match(TRAILING_PUNCTUATION_REGEX);
      if (puncMatch && rawUsername.length - puncMatch[0].length >= 3) {
        trailingPunctuation = puncMatch[0];
        rawUsername = rawUsername.slice(0, rawUsername.length - trailingPunctuation.length);
      }

      const isEveryone = rawUsername.toLowerCase() === 'everyone';

      pass2Tokens.push({
        key: `${keyPrefix}-tok-${pass2Counter++}-mention`,
        type: 'mention',
        value: rawUsername,
        isEveryone,
      });

      if (trailingPunctuation) {
        pass2Tokens.push({
          key: `${keyPrefix}-tok-${pass2Counter++}-text`,
          type: 'text',
          value: trailingPunctuation,
        });
      }

      textLastIndex = mentionStartIndex + 1 + rawUsername.length + trailingPunctuation.length;
    }

    if (textLastIndex < text.length) {
      const remainingText = text.substring(textLastIndex);
      pass2Tokens.push({
        key: `${keyPrefix}-tok-${pass2Counter++}-text`,
        type: 'text',
        value: remainingText,
      });
    }
  }

  // Tối ưu gộp các text token liền kề (nếu có) và lọc token rỗng
  const mergedTokens: MessageContentToken[] = [];
  for (const tok of pass2Tokens) {
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
 * Dùng cho hệ thống xử lý notification hoặc tagging.
 */
export function extractMentionUsernames(content: string | null | undefined): string[] {
  if (!content || !content.includes('@')) {
    return [];
  }
  const tokens = parseMessageContent(content);
  const usernames = new Set<string>();
  for (const token of tokens) {
    if (token.type === 'mention' && token.value) {
      usernames.add(token.value.toLowerCase());
    }
  }
  return Array.from(usernames);
}

/**
 * Kiểm tra xem tin nhắn có nhắc tới username cụ thể hay không (không phân biệt hoa/thường).
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
  if (!content) {
    return false;
  }
  const mentions = extractMentionUsernames(content);
  return mentions.includes('everyone');
}
