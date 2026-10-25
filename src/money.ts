/** "1,590.00 " -> 1590. The shop shows prices without a currency symbol. */
export function parseMoney(text: string): number {
  const value = Number(text.replace(/[^0-9.]/g, ''));
  if (Number.isNaN(value) || text.trim() === '') {
    throw new Error(`Not a money value: "${text}"`);
  }
  return value;
}
