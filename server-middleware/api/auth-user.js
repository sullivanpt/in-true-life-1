// route handlers for user authentication (associate and deasociate active session with a user)
// assumes it is mounted under '/me/user'
'use strict'

const router = require('express').Router()
const uuidV4 = require('uuid/v4')
const { generateTracker, attachUserToSession, findUserOnSession } = require('./auth')
const models = require('./models')

/**
 * helper to test if a proposed user name is appropriate and available
 * assumes name has been santitized
 * returns falsey if name is OK, else reason string why it cannot be used
 */
function checkNewUserName (name) {
  if (!name) return 'INVALID'
  if (name === 'profane') return 'RESERVED' // TODO: simulate profanity filter
  if (models.users.find(obj => obj.name === name)) return 'EXISTS' // user name already used. TODO: rely on DB uniqueness index for atomic check
}

// this end point purposely removes session current authorization to and deletes private data (user is kept but purged)
// returns status 204 on success
// returns status 401 if supplied password does not match
// intended for use by disgruntled person
// assumes req.session is attached and verified
router.post('/forget', (req, res) => {
  let { user } = findUserOnSession(req, models.users)
  if (!user) return res.status(204).end() // no associated user, already logged out
  let hash = req.body.password // TODO: sanitize input, and a real password hashing scheme
  if (!user.hash || user.hash !== hash) return res.status(401).end() // TODO: constant time secure-compare
  user = { id: user.id, name: 'u-' + generateTracker(), disabled: 'forget' }
  models.users[models.users.findIndex(obj => obj.id === user.id)] = user
  req.session.activity.push(Object.assign({ ts: Date.now(), action: 'forget', user: user.id }, req.body)) // keep change history, especially cookies acceptance
  req.session.logins.push({ ts: Date.now() })
  req.session.settings = {} // clear settings. TODO: do we want to only clear some settings?
  res.status(204).end() // TODO: do we need/want to request client do a full page refresh here?
})

// this end point purposely removes session current authorization to private data and current association
// returns status 204 on success
// intended for use when leaving a public PC
// assumes req.session is attached and verified
router.post('/logout', (req, res) => {
  let { user } = findUserOnSession(req, models.users)
  if (!user) return res.status(204).end() // no associated user, already logged out
  user.session = null
  req.session.logins.push({ ts: Date.now() })
  req.session.settings = {} // clear settings. TODO: do we want to only clear some settings?
  res.status(204).end() // TODO: do we need/want to request client do a full page refresh here?
})

// this end point purposely removes session current authorization to private data but leaves current association
// returns status 204 on success
// intended to discourage paranoid from actual logout when just want to protect data
// assumes req.session is attached and verified
router.post('/lock', (req, res) => {
  let { user, authorized } = findUserOnSession(req, models.users)
  if (!user || !authorized) return res.status(204).end() // no associated user, already logged out or locked
  req.session.logins.push({ ts: Date.now(), user: user.id })
  res.status(204).end() // TODO: do we need/want to request client do a full page refresh here?
})

// this end point creates a new user and current session authorization
// returns status 201 on success
// returns status 400 on failure because content is illegal (e.g. profanity filter)
// returns status 403 on failure because session already associated with a user
// returns status 409 on failure because account already exists
// assumes req.session is attached and verified
router.post('/create', (req, res) => {
  if (findUserOnSession(req, models.users).user) return res.status(403).end() // already logged in
  if (!req.body.token || !req.body.password) return res.status(400).end() // malformed data. TODO: sanitize input, validate token
  let name = req.body.token
  switch (checkNewUserName(name)) {
    case 'INVALID': return res.status(400).end()
    case 'RESERVED': return res.status(400).end()
    case 'EXISTS': return res.status(409).end()
  }
  let user = {
    id: 's-' + uuidV4(),
    name,
    hash: req.body.password, // TODO: real password hashing with salt
    salt: null
  }
  models.users.push(user)
  attachUserToSession(req, user)
  res.status(201).json({ id: user.id, name: user.name, tags: user.tags || [] })
})

// get meta-data about enabled auth methods for the requested user id. result set might be empty if nothing enabled.
// returned 'exists' flag is false for unknown user id, which is OK because user IDs are public anyway.
// returned 'reason' if the supplied user name doesn't exist but is not allowed.
// important! uses req.body.user, not findUserOnSession (user can be changed from current associated user)
router.post('/strategies', (req, res) => {
  let user
  if (req.body.name) { // TODO: sanitize input
    user = models.users.find(obj => obj.name === req.body.name)
  } else {
    user = findUserOnSession(req, models.users).user
  }
  let exists = !!user
  let reason = user ? undefined : checkNewUserName(req.body.name)
  res.json({
    exists,
    reason,
    user: user ? { id: user.id, name: user.name } : { name: req.body.name }, // for convenience return user public details
    password: exists && user.hash && { token: user.id }, // client must return this value with password. TODO: for XSRF return a signed, expiring token
    newPassword: !exists && !reason && { token: req.body.name } // client must return this value with new passwore
    // TODO: prepare metadata for other auth methods here
  })
})

// this end point accepts a login token and a clear text password and returns status 204 if user becomes authenticated for private access
// returns status 204 on success, all other paths return 401 (or maybe 500)
// assumes req.session is attached and verified
// important! uses req.body user, not findUserOnSession (user can be changed from current associated user)
// TODO: after login do we want to start searching for messages from associated sessions?
// TODO: we need to return a new secure token with a client readable timestamp (jwt?) to prevent session reuse attacks, and CSRF
router.post('/password', (req, res) => {
  let user = models.users.find(obj => obj.id === req.body.token) // TODO: sanitize input, validate token signature
  if (!user) return res.status(401).end()
  let hash = req.body.password // TODO: sanitize input, and a real password hashing scheme
  if (!user.hash || user.hash !== hash) return res.status(401).end() // TODO: constant time secure-compare
  // TODO: do we need to double check sk and/or ek didn't change during the two-stage auth?
  attachUserToSession(req, user)
  res.status(204).end() // TODO: do we need/want to request client do a full page refresh here?
})

module.exports = router
