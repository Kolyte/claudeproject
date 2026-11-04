import type { ErrorRequestHandler } from 'express'
import type { ApiErrorCode } from '@neo/contracts'

export class HttpError extends Error {
  constructor(public status: number, public code: ApiErrorCode, message: string, public fields?: Record<string, string>) {
    super(message)
  }
}

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: { code: error.code, message: error.message, ...(error.fields && { fields: error.fields }) } })
    return
  }
  if (error?.type === 'entity.parse.failed' || error?.type === 'entity.too.large') {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Send a valid JSON object smaller than 32 KB.' } })
    return
  }
  // Log only a category. Provider errors may include private request/config values.
  console.error('Unhandled API error')
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' } })
}
