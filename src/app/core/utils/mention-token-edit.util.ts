export interface AtomicMentionDeletion {
  value: string;
  caret: number;
}

interface MentionRange {
  start: number;
  end: number;
}

const MENTION_TOKEN_REGEX = /(^|[\s(\[{<"'])@(everyone|[a-zA-Z0-9_.]{3,32})(?=$|[\s.,!?;:)\]}>])/gi;

function findMentionRanges(value: string): MentionRange[] {
  const ranges: MentionRange[] = [];
  for (const match of value.matchAll(MENTION_TOKEN_REGEX)) {
    const prefixLength = match[1].length;
    const start = (match.index || 0) + prefixLength;
    ranges.push({ start, end: start + 1 + match[2].length });
  }
  return ranges;
}

/**
 * Xoá mention như một token nguyên khối trong textarea.
 * Trả null nếu thao tác không chạm vào mention để trình duyệt xử lý bình thường.
 */
export function deleteMentionTokenAtomically(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  key: 'Backspace' | 'Delete',
): AtomicMentionDeletion | null {
  const ranges = findMentionRanges(value);
  if (ranges.length === 0) return null;

  let deleteStart = Math.min(selectionStart, selectionEnd);
  let deleteEnd = Math.max(selectionStart, selectionEnd);

  if (deleteStart !== deleteEnd) {
    const touched = ranges.filter((range) => deleteStart < range.end && deleteEnd > range.start);
    if (touched.length === 0) return null;
    deleteStart = Math.min(deleteStart, ...touched.map((range) => range.start));
    deleteEnd = Math.max(deleteEnd, ...touched.map((range) => range.end));
  } else {
    const caret = deleteStart;
    const touched = ranges.find((range) => {
      const trailingSpaceEnd = range.end + (value[range.end] === ' ' ? 1 : 0);
      return key === 'Backspace'
        ? caret > range.start && caret <= trailingSpaceEnd
        : caret >= range.start && caret < range.end;
    });
    if (!touched) return null;
    deleteStart = touched.start;
    deleteEnd = touched.end + (value[touched.end] === ' ' ? 1 : 0);
  }

  return {
    value: value.slice(0, deleteStart) + value.slice(deleteEnd),
    caret: deleteStart,
  };
}
