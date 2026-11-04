import express from 'express'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Env } from './env.js'
import { apiRouter } from './routes.js'
import { errorHandler } from './lib/errors.js'

export function createApp(env: Env, frontendDir = fileURLToPath(new URL('../../frontend/dist/', import.meta.url))) {
  const app = express()
  app.locals.env = env
  app.disable('x-powered-by')
  app.use((_req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff')
    res.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    res.set('X-Robots-Tag', 'noindex, nofollow')
    next()
  })
  app.use('/api', express.json({ limit: '32kb' }), apiRouter(env))
  app.use('/api', (_req, res) => { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'API route not found.' } }) })
  if (env.production) {
    if (!existsSync(resolve(frontendDir, 'index.html'))) throw new Error('Build the frontend before starting production.')
    app.use(express.static(frontendDir, { index: false }))
    app.get('/{*page}', (req, res, next) => {
      if (req.path.startsWith('/assets/') || !req.accepts('html')) return next()
      res.set('Cache-Control', 'no-cache').sendFile('index.html', { root: frontendDir })
    })
  }
  app.use((_req, res) => { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Page not found.' } }) })
  app.use(errorHandler)
  return app
}
