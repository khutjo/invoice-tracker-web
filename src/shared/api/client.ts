import { ApiError, type ProblemDetailsPayload } from './problem'

export interface AuthHooks {
  getAccessToken: () => string | null
  refreshSession: () => Promise<string | null>
  onUnauthorized: () => void | Promise<void>
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
  skipAuthRefresh?: boolean
}

const API_BASE = '/api/v1'

let authHooks: AuthHooks = {
  getAccessToken: () => null,
  refreshSession: async () => null,
  onUnauthorized: () => {},
}

let inFlightRefresh: Promise<string | null> | null = null

export function configureApiClientAuth(hooks: AuthHooks): void {
  authHooks = hooks
}

function isAuthEndpoint(path: string): boolean {
  return path.startsWith('/auth/')
}

async function parseErrorPayload(response: Response): Promise<ProblemDetailsPayload | null> {
  const contentType = response.headers.get('content-type') ?? ''
  if (
    contentType.includes('application/problem+json') ||
    contentType.includes('application/json')
  ) {
    try {
      return (await response.json()) as ProblemDetailsPayload
    } catch {
      return null
    }
  }
  return null
}

async function executeFetch(
  path: string,
  options: RequestOptions,
  accessTokenOverride?: string | null,
): Promise<Response> {
  const headers = new Headers(options.headers)
  const token =
    accessTokenOverride !== undefined ? accessTokenOverride : authHooks.getAccessToken()

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  let serializedBody: BodyInit | undefined
  if (options.body !== undefined && options.body !== null) {
    if (options.body instanceof FormData || options.body instanceof Blob) {
      serializedBody = options.body
    } else if (typeof options.body === 'string') {
      serializedBody = options.body
    } else {
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json')
      }
      serializedBody = JSON.stringify(options.body)
    }
  }

  const url = path.startsWith('http') || path.startsWith('/api/') ? path : `${API_BASE}${path}`
  const { body: _rawBody, skipAuthRefresh: _skip, ...restInit } = options

  try {
    return await fetch(url, {
      ...restInit,
      headers,
      ...(serializedBody !== undefined ? { body: serializedBody } : {}),
    })
  } catch (err) {
    throw new ApiError(
      err instanceof Error ? err.message : 'Network error',
      0,
      null,
      true,
    )
  }
}

async function performRequest(path: string, options: RequestOptions = {}): Promise<Response> {
  let response = await executeFetch(path, options)

  if (
    response.status === 401 &&
    !options.skipAuthRefresh &&
    !isAuthEndpoint(path)
  ) {
    if (!inFlightRefresh) {
      inFlightRefresh = authHooks.refreshSession().finally(() => {
        inFlightRefresh = null
      })
    }

    const newAccessToken = await inFlightRefresh
    if (newAccessToken) {
      response = await executeFetch(path, { ...options, skipAuthRefresh: true }, newAccessToken)
    } else {
      await authHooks.onUnauthorized()
    }
  }

  if (!response.ok) {
    const problem = await parseErrorPayload(response)
    const message = problem?.title || problem?.detail || `HTTP ${response.status}`
    throw new ApiError(message, response.status, problem, false)
  }

  return response
}

export async function apiRequest<T = void>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const response = await performRequest(path, options)
  if (response.status === 204) {
    return undefined as T
  }

  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    return (await response.json()) as T
  }
  return undefined as T
}

export async function apiBlobRequest(
  path: string,
  options: RequestOptions = {},
): Promise<Blob> {
  const response = await performRequest(path, options)
  return await response.blob()
}

export const apiClient = {
  get<T>(path: string, options?: RequestOptions): Promise<T> {
    return apiRequest<T>(path, { ...options, method: 'GET' })
  },
  post<T = void>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return apiRequest<T>(path, { ...options, method: 'POST', body })
  },
  put<T = void>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return apiRequest<T>(path, { ...options, method: 'PUT', body })
  },
  delete<T = void>(path: string, options?: RequestOptions): Promise<T> {
    return apiRequest<T>(path, { ...options, method: 'DELETE' })
  },
  getBlob(path: string, options?: RequestOptions): Promise<Blob> {
    return apiBlobRequest(path, { ...options, method: 'GET' })
  },
}
