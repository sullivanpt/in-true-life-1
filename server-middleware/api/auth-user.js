// route handlers for user authentication (associate and deasociate active session with a user)
// assumes it is mounted under '/me/user'
'use strict'

const router = require('express').Router()
const uuidV4 = require('uuid/v4')
const { reqSessionEk } = require('./auth')
const models = require('./models')

/**
 * helper to attach user to session
 * called when creating a new user or logging in an existing user
 */
function attachUserToSession (req, user) {
  // user credentials are verified, update session data
  // TODO: shall we issue new ek too? probably yes
  // TODO: evidence in the next /me/restore is going to cause this new evidence to get discarded
  req.session.evidence.push({
    ts: Date.now(),
    ek: reqSessionEk(req),
    user: user.id
  })
  req.session.user = user.id
  user.session = req.session.id
}

// this end point purposely removes session current authorization to private data and current association
// returns status 204 on success
// intended for use when leaving a public PC
// assumes req.session is attached and verified
router.post('/logout', (req, res) => {
  if (!req.session.user) return res.status(204).end() // no associated user, already logged out
  let user = models.users.find(obj => obj.id === req.session.user)
  if (!user) throw new Error('invalid session.user')
  req.session.user = null
  user.session = null
  // TODO: shall we issue new eK too? probably yes
  res.status(204).end() // TODO: do we need/want to request client do a full page refresh here?
})

// this end point creates a new user and current session authorization
// returns status 201 on success
// returns status 400 on failure because content is illegal (e.g. profanity filter)
// returns status 403 on failure because session already associated with a user
// returns status 409 on failure because account already exists
// assumes req.session is attached and verified
router.post('/create', (req, res) => {
  if (req.session.user) return res.status(403).end() // already logged in
  if (!req.body.name || !req.body.password) return res.status(400).end() // malformed data
  if (models.users.find(obj => obj.name === req.body.name)) return res.status(409).end() // user name already used
  if (req.body.name === 'profane') return res.status(400).end() // TODO: simulate profanity filter
  let user = {
    id: 's-' + uuidV4(),
    name: req.body.name,
    hash: req.body.password, // TODO: real password hashing with salt
    salt: null
  }
  models.users.push(user)
  attachUserToSession(req, user)
  res.status(201).json({ id: user.id, name: user.name })
})

// get meta-data about enabled auth methods for the requested user id. result set might be empty if nothing enabled.
// return status 404 for unknown user id, which is OK because user IDs are public anyway.
// important! uses req.body.user, not req.session.user (user can be changed from current associated user)
router.post('/strategies', (req, res) => {
  let user
  if (req.body.name) { // TODO: sanitize input
    user = models.users.find(obj => obj.name === req.body.name)
  } else {
    user = models.users.find(obj => obj.id === req.session.user)
  }
  if (!user) return res.status(404).end()
  res.json({
    user: { id: user.id, name: user.name }, // for convenience return user public details
    password: user.hash && { token: user.id } // client must return this value with password. TODO: for XSRF return a signed, expiring token
    // TODO: prepare metadata for other auth methods here
  })
})

// this end point accepts a login token and a clear text password and returns status 204 if user becomes authenticated for private access
// returns status 204 on success, all other paths return 401 (or maybe 500)
// assumes req.session is attached and verified
// important! uses req.body user, not req.session.user (user can be changed from current associated user)
// TODO: after login do we want to start searching for messages from associated sessions?
router.post('/password', (req, res) => {
  let user = models.users.find(obj => obj.id === req.body.token) // TODO: sanitize input, validate token signature
  if (!user) return res.status(401).end()
  let hash = req.body.password // TODO: sanitize input, and a real password hashing scheme
  if (!user.hash || user.hash !== hash) return res.status(401).end() // TODO: constant time secure-compare
  // TODO: do we need to double check sk and/or ek don't get swapped out during the two-stage auth?
  attachUserToSession(req, user)
  res.status(204).end() // TODO: do we need/want to request client do a full page refresh here?
})

module.exports = router
