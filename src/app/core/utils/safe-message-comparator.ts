/**
 * Safe Message Comparator cho việc sắp xếp tin nhắn:
 * - Nếu cả 2 ID là chuỗi số nguyên dương (PostgreSQL Snowflake / BIGINT): so sánh chính xác bằng BigInt (không ép Number JS để tránh mất độ chính xác).
 * - Nếu một trong hai hoặc cả hai là optimistic ID (chuỗi bắt đầu bằng temp-, UUID, v.v.): so sánh theo timestamp `createdAt`.
 * - Nếu timestamp bằng nhau hoặc không hợp lệ: fallback theo `optimisticSeq`, `clientNonce` hoặc chuỗi `id`.
 * - Tuyệt đối không ném exception làm crash computed signals / stores.
 */
export type MessageComparable =
  | string
  | {
      id: string;
      createdAt?: string | null;
      clientNonce?: string | null;
      optimisticSeq?: number;
    };

export function compareMessageOrder(
  a: MessageComparable | null | undefined,
  b: MessageComparable | null | undefined,
): number {
  if (a === b) return 0;
  if (!a && !b) return 0;
  if (!a) return -1;
  if (!b) return 1;

  const objA = typeof a === 'string' ? { id: a } : a;
  const objB = typeof b === 'string' ? { id: b } : b;

  const idA = (objA.id ?? '').trim();
  const idB = (objB.id ?? '').trim();

  const isANumeric = /^\d+$/.test(idA);
  const isBNumeric = /^\d+$/.test(idB);

  // 1. Cả 2 đều là persisted Snowflake/BigInt numeric string
  if (isANumeric && isBNumeric) {
    try {
      const bigA = BigInt(idA);
      const bigB = BigInt(idB);
      if (bigA < bigB) return -1;
      if (bigA > bigB) return 1;
      return 0;
    } catch {
      // Fallback nếu có lỗi bất thường
    }
  }

  // 2. Một hoặc cả 2 là optimistic / non-numeric ID -> so sánh theo createdAt
  const timeA = objA.createdAt ? new Date(objA.createdAt).getTime() : NaN;
  const timeB = objB.createdAt ? new Date(objB.createdAt).getTime() : NaN;

  const validA = !isNaN(timeA);
  const validB = !isNaN(timeB);

  if (validA && validB && timeA !== timeB) {
    return timeA - timeB;
  }

  // 3. Fallback theo optimistic sequence nếu có
  if (objA.optimisticSeq !== undefined && objB.optimisticSeq !== undefined) {
    if (objA.optimisticSeq !== objB.optimisticSeq) {
      return objA.optimisticSeq - objB.optimisticSeq;
    }
  }

  // 4. Fallback theo clientNonce nếu có
  if (objA.clientNonce && objB.clientNonce && objA.clientNonce !== objB.clientNonce) {
    return objA.clientNonce.localeCompare(objB.clientNonce);
  }

  // 5. Fallback chuỗi id
  return idA.localeCompare(idB);
}
