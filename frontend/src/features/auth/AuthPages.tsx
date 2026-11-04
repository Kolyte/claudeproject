import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { message } from '../../lib/api'
import { Feedback, Field, SetupNotice } from '../../components/ui/Feedback'
import { useAuth } from './AuthProvider'

export function LoginPage() { return <AuthPage signup={false} /> }
export function SignupPage() { return <AuthPage signup /> }
function AuthPage({ signup }: { signup: boolean }) {
  const { session, loading } = useAuth()
  const [params] = useSearchParams()
  const requested = params.get('next') ?? '/profile'
  const hasUnsafeCharacter = [...requested].some(character => character === '\\' || character.charCodeAt(0) < 32)
  const destination = /^\/(?!\/)/.test(requested) && !hasUnsafeCharacter && !/^\/(login|signup)(\?|$)/.test(requested) ? requested : '/profile'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirmation, setConfirmation] = useState(false)
  if (!supabase) return <SetupNotice />
  if (loading) return <Feedback loading />
  if (session) return <Navigate to={destination} replace />
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('')
    try {
      if (signup) {
        const { data, error } = await supabase!.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: `${window.location.origin}/login?next=${encodeURIComponent(destination)}` } })
        if (error) throw error
        setConfirmation(!data.session)
      } else {
        const { error } = await supabase!.auth.signInWithPassword({ email: email.trim(), password })
        if (error) throw error
      }
    } catch (error) { setError(message(error)) } finally { setBusy(false) }
  }
  return <section className="neo-auth card pad">
    <h1>{signup ? 'Join North East Origins' : 'Welcome back'}</h1>
    <p className="muted">Find a project worth joining, or the people who can help build yours.</p>
    {confirmation ? <p role="status">Check your email to confirm your account, then sign in here.</p> : <form onSubmit={submit} className="neo-form">
      <Field label="Email"><input type="email" autoComplete="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} /></Field>
      <Field label="Password"><input type="password" autoComplete={signup ? 'new-password' : 'current-password'} minLength={signup ? 8 : undefined} required value={password} onChange={event => setPassword(event.target.value)} /></Field>
      <Feedback error={error} />
      <button className="btn btn-primary" disabled={busy}>{busy ? 'Please wait…' : signup ? 'Create account' : 'Sign in'}</button>
    </form>}
    <p className="neo-form-foot"><Link to={`${signup ? '/login' : '/signup'}?next=${encodeURIComponent(destination)}`}>{signup ? 'Already registered? Sign in' : 'Create an account'}</Link></p>
  </section>
}
