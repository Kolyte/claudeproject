import type { Request, Response } from 'express'
import { id } from './validation.js'
import { HttpError } from './errors.js'
import { databaseError } from './supabase.js'

export async function visibleProject(req: Request, res: Response, manage = false) {
  const projectId = id(req, 'projectId')
  const { data, error } = await res.locals.db.from('projects').select('*').eq('id', projectId).maybeSingle()
  if (error) databaseError(error)
  if (!data) throw new HttpError(404, 'NOT_FOUND', 'Project not found.')
  if (manage && data.owner_id !== res.locals.user?.id) throw new HttpError(403, 'FORBIDDEN', 'Only the project owner can do that.')
  return data
}
