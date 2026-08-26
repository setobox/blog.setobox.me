const AMPERSAND_PATTERN = /&/g
const LESS_THAN_PATTERN = /</g
const GREATER_THAN_PATTERN = />/g
const DOUBLE_QUOTE_PATTERN = /"/g
const SINGLE_QUOTE_PATTERN = /'/g

/**
 * Escape the five XML entities. Feed and sitemap values are mostly
 * machine-generated, but titles and descriptions come from frontmatter --
 * keep this on every interpolated value.
 */
export function escapeXml(unsafe: string): string {
  return unsafe
    .replace(AMPERSAND_PATTERN, '&amp;')
    .replace(LESS_THAN_PATTERN, '&lt;')
    .replace(GREATER_THAN_PATTERN, '&gt;')
    .replace(DOUBLE_QUOTE_PATTERN, '&quot;')
    .replace(SINGLE_QUOTE_PATTERN, '&apos;')
}
