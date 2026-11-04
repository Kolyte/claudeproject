import { z } from 'zod'
import { longText, nonempty, shortText, skills } from '../../lib/validation.js'

const compensation = z.enum(['paid', 'voluntary', 'equity_discussion', 'unspecified'])
const needStatus = z.enum(['open', 'reviewing', 'filled', 'closed'])

const needFields = z.strictObject({
  title: shortText,
  description: longText,
  requiredSkills: skills,
  desirableSkills: skills,
  participationType: z.enum(['cofounder', 'contributor', 'task', 'mentor']),
  hoursPerWeek: z.number().int().min(1).max(80),
  workMode: z.enum(['local', 'remote', 'hybrid']),
  location: shortText,
  compensation,
  status: needStatus,
})

export const needCreate = needFields.extend({
  requiredSkills: skills.default([]),
  desirableSkills: skills.default([]),
  compensation: compensation.default('unspecified'),
  status: needStatus.default('open'),
})
export const needPatch = nonempty(needFields)
export const applicationCreate = z.strictObject({ message: longText })
export const applicationPatch = z.strictObject({ status: z.enum(['reviewing', 'accepted', 'rejected', 'withdrawn']) })
