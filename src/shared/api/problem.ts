export interface ProblemDetailsPayload {
  type?: string
  title?: string
  status?: number
  detail?: string
  instance?: string
  errors?: Record<string, string[]>
}

export interface MappedProblem {
  status?: number | undefined
  title: string
  fieldErrors: Record<string, string[]>
  isNetworkError: boolean
}

export class ApiError extends Error {
  readonly status: number
  readonly problem: ProblemDetailsPayload | null
  readonly isNetworkError: boolean

  constructor(
    message: string,
    status: number,
    problem: ProblemDetailsPayload | null = null,
    isNetworkError = false,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.problem = problem
    this.isNetworkError = isNetworkError
  }
}

/**
 * Normalizes a single segment (e.g. "PostalCode" -> "postalCode")
 * or a dotted/indexed path ("Lines[2].UnitPrice" -> "lines[2].unitPrice").
 */
export function normalizeFieldKey(rawKey: string): string {
  const cleaned = rawKey.startsWith('$.') ? rawKey.slice(2) : rawKey
  return cleaned
    .split('.')
    .map((segment) => {
      if (!segment) return segment
      return segment.charAt(0).toLowerCase() + segment.slice(1)
    })
    .join('.')
}

export interface MapProblemOptions {
  /**
   * Optional list of known form field names (e.g. ['businessName', 'email', 'password']).
   * Errors for keys not in this list are surfaced in `title` so the user never misses them.
   */
  knownFields?: readonly string[]
  /**
   * When true, any validation/conflict error whose key or title/detail mentions "email"
   * is attached to the `email` field (covers 400/409 duplicate email responses).
   */
  routeEmailMentionsToField?: boolean
}

const NETWORK_ERROR_MESSAGE = "We couldn't reach the server. Check your connection and try again."

/**
 * Maps an unknown thrown error (or RFC 9457 ProblemDetails / ValidationProblemDetails)
 * into a structured `{ status, title, fieldErrors, isNetworkError }` shape for forms.
 */
export function mapProblemDetails(error: unknown, options: MapProblemOptions = {}): MappedProblem {
  const fieldErrors: Record<string, string[]> = {}
  const unknownFieldMessages: string[] = []

  const knownLookup = new Map<string, string>()
  if (options.knownFields) {
    for (const field of options.knownFields) {
      knownLookup.set(field.toLowerCase(), field)
    }
  }

  let status: number | undefined
  let problem: ProblemDetailsPayload | null = null
  let isNetworkError = false

  if (error instanceof ApiError) {
    status = error.status
    problem = error.problem
    isNetworkError = error.isNetworkError
  } else if (
    error &&
    typeof error === 'object' &&
    ('errors' in error || 'title' in error || 'status' in error)
  ) {
    problem = error as ProblemDetailsPayload
    status = problem.status
  } else if (error instanceof TypeError) {
    isNetworkError = true
  }

  if (isNetworkError || (status !== undefined && status >= 500)) {
    return {
      status,
      title: NETWORK_ERROR_MESSAGE,
      fieldErrors: {},
      isNetworkError: true,
    }
  }

  if (problem?.errors && typeof problem.errors === 'object') {
    for (const [rawKey, rawMessages] of Object.entries(problem.errors)) {
      const messages = Array.isArray(rawMessages)
        ? rawMessages.filter((m): m is string => typeof m === 'string' && m.trim().length > 0)
        : []
      if (messages.length === 0) continue

      const normalized = normalizeFieldKey(rawKey)
      const lower = normalized.toLowerCase()

      if (knownLookup.size > 0) {
        const canonical = knownLookup.get(lower)
        if (canonical) {
          fieldErrors[canonical] = [...(fieldErrors[canonical] ?? []), ...messages]
        } else if (
          options.routeEmailMentionsToField &&
          (lower.includes('email') || messages.some((m) => m.toLowerCase().includes('email')))
        ) {
          fieldErrors.email = [...(fieldErrors.email ?? []), ...messages]
        } else {
          unknownFieldMessages.push(...messages)
        }
      } else {
        fieldErrors[normalized] = [...(fieldErrors[normalized] ?? []), ...messages]
      }
    }
  }

  const rawTitle =
    (typeof problem?.detail === 'string' && problem.detail.trim()) ||
    (typeof problem?.title === 'string' && problem.title.trim()) ||
    ''

  if (
    options.routeEmailMentionsToField &&
    !fieldErrors.email &&
    rawTitle.toLowerCase().includes('email') &&
    (status === 400 || status === 409 || status === undefined)
  ) {
    fieldErrors.email = [rawTitle]
  }

  let title = ''
  if (unknownFieldMessages.length > 0) {
    title = unknownFieldMessages.join(' ')
  } else if (Object.keys(fieldErrors).length === 0) {
    title = rawTitle || 'Something went wrong. Please check your input and try again.'
  }

  return {
    status,
    title,
    fieldErrors,
    isNetworkError: false,
  }
}
