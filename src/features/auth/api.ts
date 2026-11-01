import { apiClient } from 'src/shared/api/client'

export type UserRole = 'Owner' | 'Accountant'

export interface RegisterRequest {
  businessName: string
  firstName: string
  lastName: string
  email: string
  password: string
}

export interface RegisterResponse {
  userId: string
  businessId: string
  email: string
  role: UserRole
  emailVerified: boolean
}

export interface VerifyEmailRequest {
  userId: string
  token: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  jwtToken: string
  refreshToken: string
  expiresIn: number
  userId: string
  businessId: string
  role: UserRole
}

export interface RefreshRequest {
  refreshToken: string
}

export interface RefreshResponse {
  jwtToken: string
  refreshToken: string
  expiresIn: number
}

export interface LogoutRequest {
  refreshToken: string
}

export const authApi = {
  register(payload: RegisterRequest): Promise<RegisterResponse> {
    return apiClient.post<RegisterResponse>('/auth/register', payload, {
      skipAuthRefresh: true,
    })
  },

  verifyEmail(payload: VerifyEmailRequest): Promise<void> {
    return apiClient.post<void>('/auth/verify-email', payload, {
      skipAuthRefresh: true,
    })
  },

  login(payload: LoginRequest): Promise<LoginResponse> {
    return apiClient.post<LoginResponse>('/auth/login', payload, {
      skipAuthRefresh: true,
    })
  },

  refresh(payload: RefreshRequest): Promise<RefreshResponse> {
    return apiClient.post<RefreshResponse>('/auth/refresh', payload, {
      skipAuthRefresh: true,
    })
  },

  logout(payload: LogoutRequest): Promise<void> {
    return apiClient.post<void>('/auth/logout', payload, {
      skipAuthRefresh: true,
    })
  },
}
