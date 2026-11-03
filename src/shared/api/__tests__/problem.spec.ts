import { describe, expect, it } from 'vitest'
import { ApiError, mapProblemDetails, normalizeFieldKey } from '../problem'

describe('normalizeFieldKey', () => {
  it('maps Lines[2].UnitPrice and lines[2].unitPrice to the same key', () => {
    expect(normalizeFieldKey('Lines[2].UnitPrice')).toBe('lines[2].unitPrice')
    expect(normalizeFieldKey('lines[2].unitPrice')).toBe('lines[2].unitPrice')
    expect(normalizeFieldKey('Lines[2].UnitPrice')).toBe(normalizeFieldKey('lines[2].unitPrice'))
  })
})

describe('mapProblemDetails', () => {
  it('maps mixed-case field keys to known form fields', () => {
    const error = new ApiError('Validation failed', 400, {
      title: 'One or more validation errors occurred.',
      status: 400,
      errors: {
        Email: ['Email format is invalid.'],
        Password: ['Password is too short.'],
        BusinessName: ['Business name is required.'],
      },
    })

    const result = mapProblemDetails(error, {
      knownFields: ['businessName', 'email', 'password'],
    })

    expect(result.fieldErrors).toEqual({
      email: ['Email format is invalid.'],
      password: ['Password is too short.'],
      businessName: ['Business name is required.'],
    })
    expect(result.title).toBe('')
  })

  it('routes unknown field keys into the banner title', () => {
    const error = new ApiError('Validation failed', 400, {
      title: 'Validation error',
      status: 400,
      errors: {
        Email: ['Email is invalid.'],
        TenantQuota: ['Maximum workspaces reached for this domain.'],
      },
    })

    const result = mapProblemDetails(error, {
      knownFields: ['email', 'password'],
    })

    expect(result.fieldErrors).toEqual({
      email: ['Email is invalid.'],
    })
    expect(result.title).toBe('Maximum workspaces reached for this domain.')
  })

  it('routes duplicate email conflict title onto the email field when requested', () => {
    const error = new ApiError('Conflict', 409, {
      title: 'An account with this email address already exists.',
      status: 409,
    })

    const result = mapProblemDetails(error, {
      knownFields: ['businessName', 'email', 'password'],
      routeEmailMentionsToField: true,
    })

    expect(result.fieldErrors.email).toEqual(['An account with this email address already exists.'])
  })

  it('handles responses that are not ProblemDetails gracefully', () => {
    const result = mapProblemDetails(new Error('Unexpected parse error'))
    expect(result.fieldErrors).toEqual({})
    expect(result.title).toBe('Something went wrong. Please check your input and try again.')
  })
})
