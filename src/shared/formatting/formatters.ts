const zarFormatter = new Intl.NumberFormat('en-ZA', {
  style: 'currency',
  currency: 'ZAR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const dateFormatter = new Intl.DateTimeFormat('en-ZA', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

export function formatZar(amount: number): string {
  return zarFormatter.format(amount)
}

export function formatDateZa(isoDate: string | Date | null | undefined): string {
  if (!isoDate) {
    return '—'
  }
  let date: Date
  if (typeof isoDate === 'string') {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim())
    date = match
      ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
      : new Date(isoDate)
  } else {
    date = isoDate
  }
  if (Number.isNaN(date.getTime())) {
    return '—'
  }
  return dateFormatter.format(date)
}

export function pluralize(count: number, singular: string, plural?: string): string {
  const label = count === 1 ? singular : (plural ?? `${singular}s`)
  return `${count} ${label}`
}

/**
 * Commercial half-away-from-zero rounding to 2 decimal places (cents),
 * matching .NET MidpointRounding.AwayFromZero on the server.
 */
export function roundCentsAwayFromZero(value: number): number {
  const sign = value < 0 ? -1 : 1
  const scaled = Math.abs(value) * 100
  const rounded = Math.floor(scaled + 0.5 + 1e-12)
  return (sign * rounded) / 100
}
