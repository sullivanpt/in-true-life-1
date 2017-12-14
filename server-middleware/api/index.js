// API route stubs to return sample data
'use strict'

const app = require('express')()
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
const get = require('lodash/get')
const keyBy = require('lodash/keyby')
const { reqSessionEk, findUserOnSession } = require('./auth')
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
 * helper to return unread messages for session
 * user can be null or the current user for the session
 */
function findMessages (session, user, now = Date.now()) {
  let expiration = 7 * 24 * 60 * 60 * 1000 // messages expire 7 days after being seen
  let seen = get(session, 'settings.seen', expiration) // messages sent after this are 'new'
  let expired = seen - expiration // messages sent after this are deleted
  return models.messages.filter(obj =>
    (!obj.expires || obj.expires > now) && // not 'removed'
    obj.ts > expired && // not seen so long ago it's hidden
    (obj.toSession === session.id || // to this session
      (user && obj.toUser === user.id) || // to this user
      obj.toSessions === 'all' || // to all sessions
      (obj.toTag && get(user, 'tags', []).includes(obj.toTag))) // to all users with given tag, e.g. 'support'
  )
}

/**
 * helper to return
 * - are there unseen/new messages
 * - are there seen but not expired messages
 */
function checkMessages (session, user) {
  let messages = findMessages(session, user)
  let seen = get(session, 'settings.seen', 0) // messages sent after this are 'new'
  let unseen = messages.filter(obj => obj.ts > seen)
  return { alerts: messages.length, alerted: unseen.length }
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
  let { user, authorized } = findUserOnSession(req, models.users)
  let { alerts, alerted } = checkMessages(req.session, user)
  if (user) user = { id: user.id, name: user.name, tags: user.tags }
  return res.json({ session, user, authorized, settings: req.session.settings, alerts, alerted })
})

// end point updates session settings
// TODO: copy these between sessions on successful login, and maybe clear on logout?
app.post('/me/settings', (req, res) => {
  req.session.settings = Object.assign(req.session.settings || {}, req.body) // TODO: validation
  req.session.activity.push(Object.assign({ ts: Date.now(), action: 'settings' }, req.body)) // keep change history, especially cookies acceptance
  res.end()
})

// end point to retrieve alerts
app.get('/me/alerts', (req, res) => {
  let { user } = findUserOnSession(req, models.users)
  let messages = findMessages(req.session, user)
  req.session.settings = Object.assign(req.session.settings || {}, { seen: Date.now() }) // updates last read
  // TODO: do not populate the response with user and session names
  let users = keyBy(models.users, 'id')
  let sessions = keyBy(models.sessions, 'id')
  messages = messages.map(obj => Object.assign({
    name: sessions[obj.fromSession].name || users[obj.fromUser].name || 'anonymous'
  }, obj))
  res.json({ messages })
})

// this end point returns status 401 if the current session no longer has access (or never had access) to the user's private data
// assumes req.session is attached and verified
// TODO: maybe also return login strategies we can add to our existing account here?
app.get('/me/private', (req, res) => {
  let { user, authorized } = findUserOnSession(req, models.users)
  if (!user) return res.status(404).end() // no associated user
  if (!authorized) return res.status(401).end()
  return res.json({ id: user.id, name: user.name, channels: user.channels || [] })
})

// TODO: POST /me/private/password, /me/private/delete, /me/private/channels, and /me/user/lock

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
