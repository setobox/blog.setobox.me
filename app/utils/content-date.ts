export type ContentDateInput = Date | string

export function isoContentDate(input: ContentDateInput): string {
  return new Date(input).toISOString().slice(0, 10)
}

export function formatContentDate(input: ContentDateInput): string {
  return isoContentDate(input).replaceAll('-', '/')
}

export function contentUtcYear(input: ContentDateInput): number {
  return new Date(input).getUTCFullYear()
}

export function contentUtcMonth(input: ContentDateInput): number {
  return Number(isoContentDate(input).slice(5, 7))
}

export function contentMonthLabel(month: number): string {
  return `${month}月`
}
