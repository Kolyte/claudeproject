import { createClient } from '@supabase/supabase-js'
import type { Env } from '../env.js'
import { HttpError } from './errors.js'

export function createDb(env: Env, token?: string) {
  if (!env.supabaseUrl || !env.supabaseKey) {
    throw new HttpError(503, 'SERVICE_UNAVAILABLE', 'Account services are not configured yet.')
  }
  return createClient(env.supabaseUrl, env.supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    ...(token && { global: { headers: { Authorization: `Bearer ${token}` } } }),
  })
}

export function databaseError(error: { code?: string } | null): never {
  if (error?.code === '23505') throw new HttpError(409, 'CONFLICT', 'This record already exists.')
  if (error?.code === '42501') throw new HttpError(403, 'FORBIDDEN', 'You cannot change this record.')
  if (['23514', '23502', '22P02'].includes(error?.code ?? '')) throw new HttpError(400, 'VALIDATION_ERROR', 'Check the supplied fields.')
  throw new HttpError(503, 'SERVICE_UNAVAILABLE', 'Data could not be loaded or saved. Please try again.')
}
