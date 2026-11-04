import type { Profile, ProfilePatch } from '@neo/contracts'
import { HttpError } from '../../lib/errors.js'

export function parseProfilePatch(input: unknown): ProfilePatch {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new HttpError(400, 'VALIDATION_ERROR', 'Send a profile object.')
  const fields: Record<string, string> = {}
  const result: Record<string, unknown> = {}
  const allowed = ['displayName', 'bio', 'location', 'declaredSkills', 'interests', 'hoursPerWeek', 'participationTypes', 'workModes']
  const entries = Object.entries(input)
  if (!entries.length) throw new HttpError(400, 'VALIDATION_ERROR', 'Choose at least one profile field.')
  for (const [key, value] of entries) {
    if (!allowed.includes(key)) { fields[key] = 'Unknown or read-only field.'; continue }
    if (['displayName', 'bio', 'location'].includes(key)) {
      const max = key === 'bio' ? 5000 : 120
      if (typeof value !== 'string' || value.trim().length > max || (key === 'displayName' && !value.trim())) {
        fields[key] = `Enter ${key === 'displayName' ? '1' : '0'}–${max} characters.`
      } else result[key] = value.trim()
    } else if (key === 'hoursPerWeek') {
      if (value !== null && (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 80)) fields[key] = 'Enter a whole number from 1 to 80, or null.'
      else result[key] = value
    } else {
      const options = key === 'participationTypes' ? ['cofounder', 'contributor', 'task', 'mentor'] : key === 'workModes' ? ['local', 'remote', 'hybrid'] : null
      if (!Array.isArray(value) || value.length > 30 || value.some(v => typeof v !== 'string' || !v.trim() || v.trim().length > 60 || (options && !options.includes(v.trim())))) {
        fields[key] = options ? 'Choose valid options.' : 'Use up to 30 entries of 1–60 characters.'
      } else result[key] = [...new Set(value.map(v => v.trim()))]
    }
  }
  if (Object.keys(fields).length) throw new HttpError(400, 'VALIDATION_ERROR', 'Check your profile details.', fields)
  return result as ProfilePatch
}

export function toProfile(row: Record<string, unknown>): Profile {
  return {
    id: row.id as string, displayName: row.display_name as string, bio: row.bio as string,
    location: row.location as string, declaredSkills: row.declared_skills as string[], interests: row.interests as string[],
    hoursPerWeek: row.hours_per_week as number | null, participationTypes: row.participation_types as Profile['participationTypes'],
    workModes: row.work_modes as Profile['workModes'],
  }
}

export function toProfileRow(patch: ProfilePatch) {
  const names: Record<string, string> = { displayName: 'display_name', bio: 'bio', location: 'location', declaredSkills: 'declared_skills', interests: 'interests', hoursPerWeek: 'hours_per_week', participationTypes: 'participation_types', workModes: 'work_modes' }
  return Object.fromEntries(Object.entries(patch).map(([key, value]) => [names[key], value]))
}
