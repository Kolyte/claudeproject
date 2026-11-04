import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from './AuthProvider'
import { Feedback, SetupNotice } from '../../components/ui/Feedback'
import { supabase } from '../../lib/supabase'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  const location = useLocation()
  if (!supabase) return <SetupNotice />
  if (loading) return <Feedback loading />
  if (!session) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search + location.hash)}`} replace />
  return <div key={session.user.id}>{children}</div>
}
