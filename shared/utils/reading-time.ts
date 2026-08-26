const CHINESE_CHARACTERS_PER_MINUTE = 300
const WORDS_PER_MINUTE = 200

const HAN_CHARACTER_PATTERN = /\p{Script=Han}/gu
const WORD_PATTERN = /[A-Z0-9]+(?:[._'-][A-Z0-9]+)*/gi

export function estimateReadingMinutes(markdown: string): number {
  const content = removeFrontmatter(markdown)
  const chineseCharacterCount = content.match(HAN_CHARACTER_PATTERN)?.length ?? 0
  const wordCount = content
    .replace(HAN_CHARACTER_PATTERN, ' ')
    .match(WORD_PATTERN)
    ?.length ?? 0

  return Math.max(
    1,
    Math.ceil(
      chineseCharacterCount / CHINESE_CHARACTERS_PER_MINUTE
      + wordCount / WORDS_PER_MINUTE,
    ),
  )
}

export function resolveReadingMinutes(markdown: string, minutes?: number): number {
  if (typeof minutes === 'number' && Number.isInteger(minutes) && minutes > 0)
    return minutes

  return estimateReadingMinutes(markdown)
}

export function removeFrontmatter(markdown: string): string {
  const content = markdown.replaceAll('\r\n', '\n')
  const normalizedContent = content.startsWith('\uFEFF') ? content.slice(1) : content

  if (!normalizedContent.startsWith('---\n'))
    return normalizedContent

  const closingFenceIndex = normalizedContent.indexOf('\n---\n', 4)
  if (closingFenceIndex < 0)
    return normalizedContent

  return normalizedContent.slice(closingFenceIndex + 5)
}
