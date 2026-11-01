import { describe, expect, it } from 'vitest'
import { safeRedirect } from '../redirect'

describe('safeRedirect', () => {
  it('accepts valid internal relative paths with query strings', () => {
    expect(safeRedirect('/invoices?status=Sent')).toBe('/invoices?status=Sent')
    expect(safeRedirect('/dashboard')).toBe('/dashboard')
  })

  it('rejects protocol-relative URLs, external URLs, and empty values', () => {
    expect(safeRedirect('//evil.com')).toBe('/')
    expect(safeRedirect('https://evil.com')).toBe('/')
    expect(safeRedirect('/\\evil.com')).toBe('/')
    expect(safeRedirect('')).toBe('/')
    expect(safeRedirect(undefined)).toBe('/')
    expect(safeRedirect(null)).toBe('/')
  })
})
