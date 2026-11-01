/*
 * How AXIOM misreads a number under Null interference. Display only: the
 * caller shows this for a moment and the real value is never touched.
 */

/** A plausible wrong reading: a digit or two swapped for noise or neighbours. */
export function corruptReading(text: string, random: () => number = Math.random) {
  const characters = [...text];
  const digitIndexes = characters
    .map((character, index) => (/\d/.test(character) ? index : -1))
    .filter((index) => index >= 0);
  if (digitIndexes.length === 0) return text.length > 0 ? `${text.slice(0, -1)}▒` : "▒";
  const swaps = Math.min(digitIndexes.length, 1 + Math.floor(random() * 2));
  for (let index = 0; index < swaps; index += 1) {
    const at = digitIndexes[Math.floor(random() * digitIndexes.length)];
    characters[at] = random() < 0.3 ? "▒" : String(Math.floor(random() * 10));
  }
  const corrupted = characters.join("");
  return corrupted === text ? `${text.slice(0, -1)}▒` : corrupted;
}
