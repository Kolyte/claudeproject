import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Profile, ParticipationType, WorkMode } from '@neo/contracts'
import { useAuth } from './AuthProvider'
import { save, message } from '../../lib/api'
import { Feedback, Field } from '../../components/ui/Feedback'

export function ProfilePage() {
  const { profile, error: authError, refreshProfile } = useAuth()
  const [retryError, setRetryError] = useState('')
  if (!profile) return <Feedback loading={!authError && !retryError} error={authError || retryError} retry={() => { refreshProfile().catch(error => setRetryError(message(error))) }} />
  return <ProfileForm key={profile.id} profile={profile} refreshProfile={refreshProfile} />
}
function ProfileForm({ profile, refreshProfile }: { profile: Profile; refreshProfile: () => Promise<void> }) {
  const [form, setForm] = useState<Profile>(profile)
  const [skills, setSkills] = useState(profile.declaredSkills.join(', '))
  const [interests, setInterests] = useState(profile.interests.join(', '))
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!form) return
    setBusy(true); setError(''); setSaved(false)
    try {
      const { id: _id, ...patch } = form
      await save<Profile>('/me', { ...patch, declaredSkills: skills.split(',').map(s => s.trim()).filter(Boolean), interests: interests.split(',').map(s => s.trim()).filter(Boolean) }, 'PATCH')
      await refreshProfile(); setSaved(true)
    } catch (error) { setError(message(error)) } finally { setBusy(false) }
  }
  return <section className="neo-auth card pad"><h1>Your profile</h1><p className="muted">Your profile is private. Founders receive only your name, declared skills and availability when you apply.</p>
    <form className="neo-form" onSubmit={submit}>
      <Field label="Display name"><input required maxLength={120} value={form.displayName} onChange={e => setForm({ ...form, displayName: e.target.value })} /></Field>
      <Field label="About you"><textarea maxLength={5000} value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} /></Field>
      <Field label="Location"><input maxLength={120} value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="e.g. Newcastle" /></Field>
      <Field label="Declared skills (comma separated)"><input value={skills} onChange={e => setSkills(e.target.value)} /></Field>
      <Field label="Interests (comma separated)"><input value={interests} onChange={e => setInterests(e.target.value)} /></Field>
      <Field label="Hours available each week"><input type="number" min={1} max={80} value={form.hoursPerWeek ?? ''} onChange={e => setForm({ ...form, hoursPerWeek: e.target.value ? Number(e.target.value) : null })} /></Field>
      <fieldset><legend>Participation</legend>{(['cofounder', 'contributor', 'task', 'mentor'] as ParticipationType[]).map(value => <label className="neo-check" key={value}><input type="checkbox" checked={form.participationTypes.includes(value)} onChange={e => setForm({ ...form, participationTypes: e.target.checked ? [...form.participationTypes, value] : form.participationTypes.filter(item => item !== value) })} />{value}</label>)}</fieldset>
      <fieldset><legend>Work modes</legend>{(['local', 'remote', 'hybrid'] as WorkMode[]).map(value => <label className="neo-check" key={value}><input type="checkbox" checked={form.workModes.includes(value)} onChange={e => setForm({ ...form, workModes: e.target.checked ? [...form.workModes, value] : form.workModes.filter(item => item !== value) })} />{value}</label>)}</fieldset>
      <Feedback error={error} />{saved && <p role="status">Profile saved.</p>}
      <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save profile'}</button>
    </form>
  </section>
}
