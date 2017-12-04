// API route stubs to return sample data
'use strict'

const app = require('express')()
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
const { reqSessionEk, hasAccessPrivate } = require('./auth')
const { meRestoreHandler, meVerifySession } = require('./auth-session')
const authUser = require('./auth-user')
const models = require('./models')

/**
 * Helper to generate REST GET list and GET instance end points
 */
function restify (resource, list) {
  app.get(`/${resource}`, (req, res) => { res.json({ [resource]: list }) })
  app.get(`/${resource}/:id`, (req, res) => {
    let result = list.find(obj => obj.id === req.params.id)
    if (result) res.json(result)
    else res.status(404).end()
  })
}

/**
 * REST API mocks for accessing mock data
 */

app.use(cookieParser())
app.use(bodyParser.json({ type: () => true }))
app.use(function apiLogger (req, res, next) {
  // TODO: log session.name (not cookies/ek/sk), use morgan to defer log to processing end
  // TODO: log request and response json
  console.log(`API ${req.method} ${req.originalUrl}`, req.headers['cookie'], reqSessionEk(req), req.body)
  next()
})

// this end point will accept a missing or invalid session sk and return a new or prexisting valid one
// Attaches session name as req.logId for tracking sessions in logging
app.post('/me/restore', meRestoreHandler)

// this middleware attaches a valid session at req.session or throws an exception (status 401)
// Attaches session name as req.logId for tracking sessions in logging
app.use(meVerifySession)

// TODO: CSRF protection middleware on:
// if origin present much match host / X-Forwarded-Host,
// X-Requested-With must be XMLHttpRequest
// TODO: sensitive access middleware on some routes based on ek, etc.

// these end points change the user currently associated with the session
// e.g. POST '/me/user/logout' POST '/me/user/strategies' POST '/me/user/password'
app.use('/me/user', authUser)

// end point returns the current session state:
// - session public details
// - session settings
// - public user details
// public data about the most recently fully authenticated user on the current session
// if no user has been associated or if the association was purposely removed user is undefined
// - boolean authorized -- truthy indicates GET /me/private will succeed
//
// assumes req.session is attached and verified
app.get('/me/reload', (req, res) => {
  let session = { id: req.session.id, name: req.session.name }
  let user, authorized
  if (req.session.user) {
    user = models.users.find(obj => obj.id === req.session.user)
    if (!user) throw new Error('invalid session.user')
    authorized = !hasAccessPrivate(req, user)
    user = { id: user.id, name: user.name }
  }
  return res.json({ session, user, authorized, settings: req.session.settings })
})

// end point updates session settings
// TODO: copy these between sessions on successful login, and maybe clear on logout?
app.post('/me/settings', (req, res) => {
  req.session.settings = Object.assign(req.session.settings || {}, req.body) // TODO: validation
  res.end()
})

// this end point returns status 401 if the current session no longer has access (or never had access) to the user's private data
// assumes req.session is attached and verified
app.get('/me/private', (req, res) => {
  if (!req.session.user) return res.status(404).end() // no associated user
  let user = models.users.find(obj => obj.id === req.session.user)
  if (!user) throw new Error('invalid session.user')
  if (!hasAccessPrivate(req, user)) return res.status(401).end()
  return res.json(user) // this is the happy path
})

restify('users', models.users)
restify('sessions', models.sessions)
restify('messages', models.messages)
restify('auras', models.auras)
restify('profiles', models.profiles)
restify('comments', models.comments)

// All other API routes return a 404 to prevent infinite recursion with Nuxt UI and to make debugging easier
app.route('/*')
  .all((req, res) => { res.status(404).end() })

// Simplify debugging by logging developer errors
app.use(function (err, req, res, next) {
  console.error('API Error', req.logId, err.stack)
  res.status(500).end()
})

module.exports = app
