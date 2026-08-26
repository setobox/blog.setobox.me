/**
 * Tokenizer shared by the index builder and the query parser.
 *
 * SQLite FTS5 is not used for search on this site: `@nuxt/content` creates its
 * virtual table with the default `unicode61` tokenizer, which treats an
 * unbroken run of Han characters as a single token. Prefix queries then fail to
 * match anything mid-word, which is most of a Chinese query.
 *
 * Instead: Latin runs tokenize on word boundaries, and CJK runs are expanded
 * into overlapping bigrams. Bigrams give substring recall without a dictionary
 * -- "性能优化" indexes as 性能/能优/优化, so the query "能优" still hits.
 */

const LATIN_RUN_RE = /[a-z0-9](?:[\w+#.-]*[a-z0-9+#])?/gi
// Script properties rather than literal ranges: clearer intent, and Han beyond
// the BMP (Ext B+) is covered too.
const CJK_RUN_RE = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]+/gu
// Non-global twin: `.test()` on a /g regex advances `lastIndex`, and `matchAll`
// copies it, so sharing one regex here would make a CJK query silently miss
// whenever a previous one left the cursor mid-string.
const CJK_TEST_RE = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u
const DIGIT_RE = /\d/

/** Single CJK characters are meaningful terms; single Latin letters are not. */
const MIN_LATIN_LENGTH = 2

export function isCjk(value: string): boolean {
  return CJK_TEST_RE.test(value)
}

/**
 * Overlapping bigrams of a CJK run, or the run itself when it is a single
 * character (so a one-character query is still findable).
 */
export function cjkBigrams(run: string): string[] {
  const characters = [...run]
  if (characters.length <= 1)
    return characters

  const grams: string[] = []
  for (let index = 0; index < characters.length - 1; index += 1)
    grams.push(`${characters[index]}${characters[index + 1]}`)

  return grams
}

export function tokenize(input: string): string[] {
  const tokens: string[] = []
  const source = input.normalize('NFKC')

  for (const match of source.matchAll(LATIN_RUN_RE)) {
    const token = match[0].toLowerCase()
    if (token.length >= MIN_LATIN_LENGTH || DIGIT_RE.test(token))
      tokens.push(token)
  }

  for (const match of source.matchAll(CJK_RUN_RE))
    tokens.push(...cjkBigrams(match[0]))

  return tokens
}

/**
 * Query terms keep their CJK runs whole rather than splitting to bigrams, so
 * the scorer can weight a long exact run above a coincidental bigram overlap.
 */
export function tokenizeQuery(input: string): string[] {
  const terms: string[] = []
  const source = input.normalize('NFKC')

  for (const match of source.matchAll(LATIN_RUN_RE))
    terms.push(match[0].toLowerCase())

  for (const match of source.matchAll(CJK_RUN_RE))
    terms.push(match[0])

  return [...new Set(terms)].filter(Boolean)
}
