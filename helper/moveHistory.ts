export function applyMoveAfterHistoryCursor(
  moves: string[],
  cursor: number,
  nextMove: string,
): { moves: string[]; cursor: number } {
  const safeCursor = Math.max(0, Math.min(cursor, moves.length));
  const trimmed = moves.slice(0, safeCursor);
  trimmed.push(nextMove);
  return { moves: trimmed, cursor: trimmed.length };
}
