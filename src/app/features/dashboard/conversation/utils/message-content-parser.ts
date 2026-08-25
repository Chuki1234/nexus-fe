/**
 * Bộ phân tích nội dung tin nhắn thuần túy (Pure Parser), không dùng innerHTML.
 * Linkify an toàn các URL http/https và loại trừ scheme nguy hiểm (javascript:, data:, file:, vbscript:).
 */

export interface MessageContentToken {
  key: string;
  type: 'text' | 'link';
  value: string;
  url?: string;
}

const URL_CANDIDATE_REGEX = /(https?:\/\/[^\s<>"'`]+)/g;
const TRAILING_PUNCTUATION_REGEX = /[.,!?;:)}\]]+$/;

export function parseMessageContent(
  content: string | null | undefined,
  keyPrefix = 'msg',
): MessageContentToken[] {
  if (!content) {
    return [];
  }

  // Fast path: nếu không chứa http:// hoặc https:// thì trả về toàn bộ text token
  if (!content.includes('http://') && !content.includes('https://')) {
    return [
      {
        key: `${keyPrefix}-tok-0-text`,
        type: 'text',
        value: content,
      },
    ];
  }

  const tokens: MessageContentToken[] = [];
  let lastIndex = 0;
  let tokenCounter = 0;

  const matches = content.matchAll(URL_CANDIDATE_REGEX);

  for (const match of matches) {
    const matchIndex = match.index ?? 0;
    const rawCandidate = match[0];

    // Phần văn bản trước URL
    if (matchIndex > lastIndex) {
      const textChunk = content.substring(lastIndex, matchIndex);
      tokens.push({
        key: `${keyPrefix}-tok-${tokenCounter++}-text`,
        type: 'text',
        value: textChunk,
      });
    }

    lastIndex = matchIndex + rawCandidate.length;

    // Tách dấu câu cuối câu (dấu chấm, phẩy, ngoặc) nếu có
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
      tokens.push({
        key: `${keyPrefix}-tok-${tokenCounter++}-link`,
        type: 'link',
        value: candidateUrl,
        url: finalHref,
      });

      if (trailingPunctuation) {
        tokens.push({
          key: `${keyPrefix}-tok-${tokenCounter++}-text`,
          type: 'text',
          value: trailingPunctuation,
        });
      }
    } else {
      // Nếu candidate không phải URL hợp lệ, giữ nguyên dạng text
      tokens.push({
        key: `${keyPrefix}-tok-${tokenCounter++}-text`,
        type: 'text',
        value: rawCandidate,
      });
    }
  }

  // Phần văn bản còn lại sau URL cuối cùng
  if (lastIndex < content.length) {
    const trailingChunk = content.substring(lastIndex);
    tokens.push({
      key: `${keyPrefix}-tok-${tokenCounter++}-text`,
      type: 'text',
      value: trailingChunk,
    });
  }

  // Tối ưu gộp các text token liền kề (nếu có)
  const mergedTokens: MessageContentToken[] = [];
  for (const tok of tokens) {
    const prev = mergedTokens[mergedTokens.length - 1];
    if (prev && prev.type === 'text' && tok.type === 'text') {
      prev.value += tok.value;
    } else {
      mergedTokens.push({ ...tok });
    }
  }

  return mergedTokens;
}
