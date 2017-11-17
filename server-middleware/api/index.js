// API route stubs to return sample data
'use strict'

const app = require('express')()
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
const uuidV4 = require('uuid/v4')
const { reqSessionSecret, findAuthorizedSession, formatMeResponse } = require('./auth')

/**
 * private verified person identity tied to a collection of sessions (aka members)
 * includes admins, system, robots, persons, etc.
 */
let users = [
  { id: 'u1', name: 'u1-name', salt: 'u1-salt', hash: 'u1-hash' }, // see https://www.npmjs.com/package/pbkdf2-password
  {
    id: 'u2',
    name: 'u2-name',
    channels: [
      { device: 'phone-abc', events: [{ type: 'messages', tags: ['alerts'] }] },
      { email: 'u2@mail.com', verified: 123456 }
    ]
  }
]

/**
 * linked to browser cookie (aka trackers)
 *
 * tracks activity metrics, emotional feedback, etc.
 * can be associated with mutiple users, e.g. public terminal.
 *
 * maybe can have primary/preferred/most recently/frequently used profile?
 */
let sessions = [
  { id: 's1', secret: 's1-secret', name: 's1-name', aspects: [{ ts: 123456, ipAddress: '1.2.3.4' }] },
  {
    id: 's2', // the public key for read access to the session
    secret: 's2-secret', // controls update access and must only be shared with the session owner
    name: 's2-name', // the public display name of the session
    tags: ['robot', 'system'],
    aspects: [{ ts: 123456, user: 'u2' }, { ts: 133456, user: 'u1' }], // private time ordered list of unique user agent properties
    activity: [{ ts: 123456, action: 'rate', value: 5 }] // private time ordered list of metrics about this session, usually user actions
  },
  { id: 's3', secret: 's3-secret', name: 's3-name' }
]

/**
 * private messages between sessions (or assoc user)
 * - help and alerts to and from community admin to session (or associated user)
 * - session (or assoc user) to session (or assoc user) private data reveal for IRL meetup
 * individual read/reply, but group send targeting for system alerts/tos changes/etc.
 */
let messages = [
  { id: 'm1', name: 'm1-name', fromSession: 's2', toSession: 's1' },
  { id: 'm2', name: 'm2-name', fromSession: 's2', toSessions: 'all' }
]

/**
 * unverified person identity tied to a collection of sessions
 * - sessions can be in multiple auras with differing probabilities
 * - created by aspect algorithms
 * -- known user login (100% probability, only reduced by fraud)
 * -- known user claims sessions retroactively (typically not 100%)
 * -- aspect matching like IP or geo or biometrics
 */
let auras = [
  { id: 'a1', name: 'a1-name', sessions: ['s1', 's2'] },
  { id: 'a2', name: 'a2-name', sessions: ['s2'] }
]

/**
 * public profile participating in discussion: singles, match-makers, etc.
 * - created by a session
 * - edited by any session
 * - can be locked to a specific user aura
 * types:
 * - profile: single, match-maker, pet, etc.
 * - topic of discussion: building, park, etc. something that can't 'talk'
 */
let profiles = [
  {

    id: 'p1',
    title: 'p1-title',
    author: 's1',
    type: 'SINGLE',
    text: 'descriptive text', // markdown
    photos: ['http://images.fonearena.com/blog/wp-content/uploads/2013/11/Lenovo-p780-camera-sample-10.jpg']
  },
  { id: 'p1.1', title: 'p1-title', author: 's2', edits: 'p1' },
  { id: 'p2', title: 'p2-title', author: 's2', type: 'SINGLE' },
  { id: 'p3', title: 'p3-title', author: 's2', type: 'MATCHER' },
  { id: 'p4', title: 'p4-title', author: 's2', type: 'MODERATOR' }
]

/**
 * types of public messages:
 * session about/to public profile: discuss and rate profile
 *                                  discuss and rate match-maker
 * session about pair of public profiles, discuss and rate a match
 * session as public profile about pair of public profiles, discuss and rate a match
 * session as public profile to another profile: as a match-maker
 *                                               as a match
 */
let comments = [
  { id: 'c1', title: 'c1-title', author: 's1', about: ['p1.1'] },
  {
    id: 'c2',
    title: 'c2-title',
    author: 's2',
    about: ['p1', 'p2'],
    as: 'p3',
    text: 'descriptive text' // markdown
  },
  { id: 'c3', title: 'c3-title', author: 's1', about: ['p2'], as: 'p1' }
]

/**
 * generate a short but statistically probably unique ID string. See http://stackoverflow.com/a/8084248
 * TODO: use thematic dictionary instead, e.g. cat breeds....
 */
function generateTracker () {
  return (Math.random() + 1).toString(36).substr(2, 5)
}

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
  console.log(`API ${req.method} ${req.originalUrl}`, reqSessionSecret(req), req.body)
  next()
})

// this end point will accept a missing or invalid session secret and return a new or prexisting valid one
app.post('/me/restore', (req, res) => {
  let refresh
  let session = findAuthorizedSession(req, sessions) // TODO: do we need exception handler for rate limiter reached
  if (!session) {
    refresh = true
    session = {
      id: 's-' + uuidV4(),
      name: 's-' + generateTracker(),
      secret: uuidV4(), // TODO: uuid is too predictable for use as a session token
      aspects: [Object.assign({ ts: Date.now() }, req.body)] // TODO: sanitize this
    }
    sessions.push(session)
    res.status(201)
  } else {
    // append changed aspects. TODO: maybe debounce or rate limit aspect changes?
    let lastAspect = session.aspects[session.aspects.length - 1]
    let aspect
    for (let key in req.body) {
      if (req.body[key] !== lastAspect[key]) {
        aspect = aspect || { ts: Date.now() }
        aspect[key] = res.body[key]
      }
    }
    if (aspect) session.aspects.push(aspect)
  }
  res.json(formatMeResponse(session, { // TODO: filter private data (aspects, activity, etc.)
    refresh,
    secure: req.body.secure // cookie SSL only determined by our caller (Nuxt UI)
  }))
})

// this middleware attaches a valid session at req.session or throws an exception (status 401)
app.use(function apiCheckAuth (req, res, next) {
  req.session = findAuthorizedSession(req, sessions) // TODO: do we need exception handler for rate limiter reached?
  if (!req.session) return res.status(401).end()
  next()
})

restify('users', users)
restify('sessions', sessions)
restify('messages', messages)
restify('auras', auras)
restify('profiles', profiles)
restify('comments', comments)

app.get('/everything', (req, res) => {
  res.json({
    me: users[1], // TODO: restrict access by active session
    sessions, // TODO: filter private data (secret, aspects, activity, etc.)
    messages,
    auras,
    profiles,
    comments
  })
})

// All other API routes return a 404 to prevent infinite recursion with Nuxt UI and to make debugging easier
app.route('/*')
  .all((req, res) => { res.status(404).end() })

module.exports = app
