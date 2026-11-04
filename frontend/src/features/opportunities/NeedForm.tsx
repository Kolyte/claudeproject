import { type FormEvent, useState } from 'react'
import type { Compensation, Need, ParticipationType, WorkMode } from '@neo/contracts'
import { Feedback, Field } from '../../components/ui/Feedback'
import { ApiClientError, message, save } from '../../lib/api'
import { compensationLabels, participationLabels, workModeLabels } from './labels'
import { SkillInput, parseSkillList } from '../discovery'

type NeedFields = Omit<Need, 'id' | 'projectId' | 'createdAt' | 'status'>

const blank: NeedFields = {
  title: '',
  description: '',
  requiredSkills: [],
  desirableSkills: [],
  participationType: 'contributor',
  hoursPerWeek: 5,
  workMode: 'hybrid',
  location: '',
  compensation: 'unspecified',
}

// Known spellings are canonicalised ("reactjs" -> "React") and case-insensitive duplicates removed.
const splitSkills = parseSkillList

function options<T extends string>(labels: Record<T, string>) {
  return (Object.entries(labels) as [T, string][]).map(([value, label]) => <option key={value} value={value}>{label}</option>)
}

/** Status is changed from the need's card, so it is not part of this form. */
export default function NeedForm({ projectId, existing, onSaved, onCancel }: { projectId: string; existing?: Need; onSaved: () => void; onCancel: () => void }) {
  const [fields, setFields] = useState<NeedFields>(existing ?? blank)
  const [required, setRequired] = useState(existing?.requiredSkills.join(', ') ?? '')
  const [desirable, setDesirable] = useState(existing?.desirableSkills.join(', ') ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [invalid, setInvalid] = useState<Record<string, string>>({})

  const set = <K extends keyof NeedFields>(key: K, value: NeedFields[K]) => setFields(previous => ({ ...previous, [key]: value }))
  const fieldError = (key: string) => invalid[key] && <span className="op-field-error">{invalid[key]}</span>

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true); setError(''); setInvalid({})
    try {
      const { title, description, participationType, hoursPerWeek, workMode, location, compensation } = fields
      const body = { title, description, participationType, hoursPerWeek, workMode, location, compensation, requiredSkills: splitSkills(required), desirableSkills: splitSkills(desirable) }
      await save<Need>(existing ? `/needs/${existing.id}` : `/projects/${projectId}/needs`, body, existing ? 'PATCH' : 'POST')
      onSaved()
    } catch (caught) {
      setError(message(caught))
      if (caught instanceof ApiClientError) setInvalid(caught.fields ?? {})
      setBusy(false)
    }
  }

  return <form className="neo-form" onSubmit={submit}>
    <Field label="Opportunity title"><input required maxLength={120} value={fields.title} onChange={event => set('title', event.target.value)} />{fieldError('title')}</Field>
    <Field label="What help do you need?"><textarea required maxLength={5000} value={fields.description} onChange={event => set('description', event.target.value)} />{fieldError('description')}</Field>
    <div className="field"><SkillInput multiple label="Required skills (comma separated)" placeholder="e.g. React, PostgreSQL" value={required} onChange={setRequired} />{fieldError('requiredSkills')}</div>
    <div className="field"><SkillInput multiple label="Desirable skills (comma separated)" placeholder="e.g. Figma, AI/ML" value={desirable} onChange={setDesirable} />{fieldError('desirableSkills')}</div>
    <div className="op-form-row">
      <Field label="Participation"><select value={fields.participationType} onChange={event => set('participationType', event.target.value as ParticipationType)}>{options(participationLabels)}</select></Field>
      <Field label="Hours per week"><input required type="number" min={1} max={80} step={1} value={fields.hoursPerWeek} onChange={event => set('hoursPerWeek', event.target.valueAsNumber)} />{fieldError('hoursPerWeek')}</Field>
    </div>
    <div className="op-form-row">
      <Field label="Work mode"><select value={fields.workMode} onChange={event => set('workMode', event.target.value as WorkMode)}>{options(workModeLabels)}</select></Field>
      <Field label="Location"><input required maxLength={120} value={fields.location} onChange={event => set('location', event.target.value)} />{fieldError('location')}</Field>
    </div>
    <Field label="Compensation"><select value={fields.compensation} onChange={event => set('compensation', event.target.value as Compensation)}>{options(compensationLabels)}</select></Field>
    <Feedback error={error} />
    <div className="op-actions">
      <button className="btn btn-primary btn-sm" disabled={busy}>{busy ? 'Saving…' : existing ? 'Save opportunity' : 'Add opportunity'}</button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel} disabled={busy}>Cancel</button>
    </div>
  </form>
}
