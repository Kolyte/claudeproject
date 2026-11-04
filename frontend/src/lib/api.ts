import type { ApiError, ApiResponse } from '@neo/contracts'
import { supabase } from './supabase'

export class ApiClientError extends Error {
  status: number
  code: string
  fields?: Record<string, string>
  constructor(status: number, error: ApiError['error']) {
    super(error.message)
    this.status = status
    this.code = error.code
    this.fields = error.fields
  }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!path.startsWith('/') || path.startsWith('//')) throw new Error('Use an API-relative path.')
  const headers = new Headers(options.headers)
  headers.set('Accept', 'application/json')
  if (options.body) headers.set('Content-Type', 'application/json')
  const session = supabase ? await supabase.auth.getSession() : null
  if (session?.error) throw new Error('Your session could not be restored. Sign in again.')
  if (session?.data.session?.access_token) headers.set('Authorization', `Bearer ${session.data.session.access_token}`)
  let response: Response
  try { response = await fetch(`/api${path}`, { ...options, headers, cache: 'no-store' }) } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new Error('Could not reach North East Origins. Check your connection and try again.')
  }
  let payload
  try { payload = await response.json() } catch { throw new Error('The server returned an unexpected response. Please try again.') }
  if (!response.ok) throw new ApiClientError(response.status, payload.error ?? { code: 'INTERNAL_ERROR', message: 'The request could not be completed.' })
  return payload as T
}
export function save<T>(path: string, body: unknown, method = 'POST') {
  return api<ApiResponse<T>>(path, { method, body: JSON.stringify(body) })
}
export const message = (error: unknown) => error instanceof Error ? error.message : 'Something went wrong. Please try again.'
