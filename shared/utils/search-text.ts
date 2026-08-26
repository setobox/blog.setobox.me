import { removeFrontmatter } from './reading-time'

/**
 * Markdown reduced to searchable prose.
 *
 * Built at parse time from raw markdown rather than walked out of the MDC AST
 * at request time, matching how `minutes` is derived in the content hook.
 */

// Split by fence character so the info string can exclude that character. A
// shared `[^\n]*` would let the opener and the info string trade characters,
// which is polynomial backtracking on adversarial input.
//
// The unterminated-fence fallback is `(?![\s\S])`, i.e. end of input: under /m a
// bare `$` would let the lazy body stop at the first newline instead.
const FENCED_BACKTICK_RE = /^ {0,3}`{3,}[^`\n]*\n[\s\S]*?(?:^ {0,3}`{3,}[ \t]*$|(?![\s\S]))/gm
const FENCED_TILDE_RE = /^ {0,3}~{3,}[^~\n]*\n[\s\S]*?(?:^ {0,3}~{3,}[ \t]*$|(?![\s\S]))/gm
const HTML_COMMENT_RE = /<!--[\s\S]*?-->/g
const MDC_BLOCK_RE = /^::[^\n]*$/gm
const MDC_ATTRS_RE = /\{[^{}\n]*\}/g
const HTML_TAG_RE = /<\/?[a-z][^>]*>/gi
const IMAGE_RE = /!\[[^\]]*\]\([^)]*\)/g
const LINK_RE = /\[([^\]]*)\]\([^)]*\)/g
const REFERENCE_DEFINITION_RE = /^[^\S\n]*\[[^\]]+\]:[^\S\n]*\S.*$/gm
const INLINE_CODE_RE = /`([^`\n]+)`/g
const HEADING_MARKER_RE = /^\s{0,3}#{1,6}\s+/gm
const BLOCKQUOTE_MARKER_RE = /^\s{0,3}>\s?/gm
const LIST_MARKER_RE = /^\s{0,3}(?:[-*+]|\d{1,9}[.)])\s+/gm
// One unambiguous character class; the required dash is checked in JS rather
// than with a second quantifier that could trade characters with the first.
const TABLE_DIVIDER_RE = /^[ \t:|-]+$/gm
const THEMATIC_BREAK_RE = /^\s{0,3}(?:[-*_]\s*){3,}$/gm
const EMPHASIS_RE = /(\*{1,3}|_{1,3}|~{2})(?=\S)([\s\S]*?\S)\1/g
const PIPE_RE = /\|/g
const WHITESPACE_RE = /\s+/g

/** Enough context to match on, without shipping whole articles to the client. */
const MAX_BODY_LENGTH = 1_200

export function markdownToSearchText(markdown: string): string {
  return removeFrontmatter(markdown)
    // Code blocks first: their contents must not be parsed as markdown.
    .replace(FENCED_BACKTICK_RE, ' ')
    .replace(FENCED_TILDE_RE, ' ')
    .replace(HTML_COMMENT_RE, ' ')
    .replace(MDC_BLOCK_RE, ' ')
    .replace(REFERENCE_DEFINITION_RE, ' ')
    .replace(IMAGE_RE, ' ')
    .replace(LINK_RE, '$1')
    .replace(HTML_TAG_RE, ' ')
    .replace(INLINE_CODE_RE, '$1')
    .replace(HEADING_MARKER_RE, '')
    .replace(BLOCKQUOTE_MARKER_RE, '')
    .replace(LIST_MARKER_RE, '')
    .replace(TABLE_DIVIDER_RE, line => (line.includes('-') ? ' ' : line))
    .replace(THEMATIC_BREAK_RE, ' ')
    .replace(EMPHASIS_RE, '$2')
    .replace(MDC_ATTRS_RE, ' ')
    .replace(PIPE_RE, ' ')
    .replace(WHITESPACE_RE, ' ')
    .trim()
}

/** Truncated on a word boundary where one is nearby, to avoid a cut mid-word. */
export function truncateSearchText(text: string, max = MAX_BODY_LENGTH): string {
  if (text.length <= max)
    return text

  const clipped = text.slice(0, max)
  const lastSpace = clipped.lastIndexOf(' ')

  // Guarded so a single early space cannot discard most of the text; pure CJK
  // has no spaces at all and keeps the hard clip.
  return (lastSpace > max * 0.5 ? clipped.slice(0, lastSpace) : clipped).trim()
}

export function buildSearchBody(markdown: string, max = MAX_BODY_LENGTH): string {
  return truncateSearchText(markdownToSearchText(markdown), max)
}
