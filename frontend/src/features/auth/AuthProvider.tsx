import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { ApiResponse, Profile } from '@neo/contracts'
import { supabase } from '../../lib/supabase'
import { api, message } from '../../lib/api'

interface AuthState { session: Session | null; profile: Profile | null; loading: boolean; error: string; refreshProfile: () => Promise<void>; signOut: () => Promise<void> }
const AuthContext = createContext<AuthState | null>(null)
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(Boolean(supabase))
  const [profileState, setProfile] = useState<{ userId: string; profile: Profile } | null>(null)
  const [error, setError] = useState('')
  const userId = session?.user.id
  useEffect(() => {
    if (!supabase) return
    let active = true
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) { setSession(nextSession); setLoading(false) }
    })
    supabase.auth.getSession().then(({ data, error }) => {
      if (active) { setSession(data.session); setLoading(false); if (error) setError('Your session could not be restored. Please sign in again.') }
    }).catch(() => { if (active) { setLoading(false); setError('Your session could not be restored. Please sign in again.') } })
    return () => { active = false; subscription.unsubscribe() }
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    if (userId) api<ApiResponse<Profile>>('/me', { signal: controller.signal }).then(({ data }) => {
      if (!controller.signal.aborted) { setProfile({ userId, profile: data }); setError('') }
    }).catch(error => { if (!controller.signal.aborted) setError(message(error)) })
    return () => controller.abort()
  }, [userId])
  const refreshProfile = async () => {
    if (!session) return
    const { data } = await api<ApiResponse<Profile>>('/me')
    setProfile({ userId: session.user.id, profile: data }); setError('')
  }
  const signOut = async () => {
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setSession(null); setProfile(null)
  }
  const profile = profileState?.userId === session?.user.id ? profileState?.profile ?? null : null
  return <AuthContext.Provider value={{ session, profile, loading, error, refreshProfile, signOut }}>{children}</AuthContext.Provider>
}
export function useAuth() {
  const state = useContext(AuthContext)
  if (!state) throw new Error('AuthProvider is required.')
  return state
}
