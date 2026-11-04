import { z } from 'zod'
import { canonicalSkills } from '../features/discovery/skills.js'
import type { Request } from 'express'
import { HttpError } from './errors.js'

export const shortText = z.string().trim().min(1).max(120)
export const longText = z.string().trim().min(1).max(5000)
// Known spellings become canonical ("reactjs" -> "React"); duplicates are removed case-insensitively.
export const skills = z.array(z.string().trim().min(1).max(60)).max(30).transform(value => canonicalSkills(value))
export const stage = z.enum(['idea', 'prototype', 'mvp', 'launched'])
export function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value)
  if (!result.success) {
    const fields = Object.fromEntries(result.error.issues.map(issue => [issue.path.join('.') || 'request', issue.message]))
    throw new HttpError(400, 'VALIDATION_ERROR', 'Check the supplied fields.', fields)
  }
  return result.data
}
export function id(req: Request, key: string) { return parse(z.uuid(), req.params[key]) }
export function pagination(query: Request['query']) {
  return parse(z.object({
    limit: z.coerce.number().int().min(1).max(50).default(20),
    offset: z.coerce.number().int().min(0).default(0),
  }), query)
}
export function snake(row: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key.replace(/[A-Z]/g, c => `_${c.toLowerCase()}`), value]))
}
export function camel<T>(row: Record<string, unknown>): T {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase()), value])) as T
}
export const nonempty = <T extends z.ZodRawShape>(schema: z.ZodObject<T>) => schema.partial().refine(value => Object.keys(value).length > 0, 'Choose at least one field.')
