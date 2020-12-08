export const DEFAULT_ID_LENGTH = 6;

const ALPHABET = [
  ...chars("a", "z"),
  ...chars("A", "Z"),
  ...chars("0", "9"),
].filter((c) => ["0", "O", "o"].includes(c) === false); // remove similar looking characters

/**
 * Generate random ID of the given length.
 * @param length
 * @returns A random Id. Uniqueness of the ID is not guaranteed.
 */
export default function generateRandomId(length?: number): string | undefined {
  const id = Array(length === undefined ? DEFAULT_ID_LENGTH : length)
    .fill(1)
    .map(() => pickRandomChar(ALPHABET))
    .join("");
  return id === "" ? undefined : id;
}

function pickRandomChar(alpahbet: string[]) {
  const randomIdx = Math.floor(Math.random() * (alpahbet.length - 1));
  return alpahbet[randomIdx];
}

function chars(firstChar: string, lastChar: string): string[] {
  const first = firstChar.charCodeAt(0);
  const last = lastChar.charCodeAt(0);
  const chars = [];

  if (
    isNaN(first) ||
    isNaN(last) ||
    first >= last ||
    firstChar.length > 1 ||
    lastChar.length > 1
  )
    return [];

  for (let i = first; i <= last; i++) {
    chars.push(String.fromCharCode(i));
  }
  return chars;
}
