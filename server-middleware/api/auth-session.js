// API end point handlers and middleware for session handling
'use strict'
const uuidV4 = require('uuid/v4')
const uid = require('uid-safe')
const { generateTracker, reqSessionEk, findAuthorizedSession, formatMeRestore } = require('./auth')
const models = require('./models')

// expects to be mounted at POST '/me/restore'
// this end point will accept a missing or invalid session sk and return a new or prexisting valid one
// Attaches session name as req.logId for tracking sessions in logging
// include ek cookie value in evidence (existing or newly generated)
// NOTE: authenticated user gets added in evidence sometimes too.
function meRestoreHandler (req, res) {
  let newSk, newEk
  let ek = reqSessionEk(req) // by default we pass the ek through
  let session = findAuthorizedSession(req, models.sessions) // TODO: do we need exception handler for rate limiter reached
  if (!session) {
    newSk = true
    newEk = true
    ek = uid.sync(24) // TODO: do we really want a synchronous call here?
    session = {
      id: 's-' + uuidV4(),
      name: 's-' + generateTracker(),
      sk: uid.sync(24), // TODO: do we really want a synchronous call here?
      evidence: [Object.assign({
        ts: Date.now(),
        ek
      }, req.body)], // TODO: sanitize this
      // default values follow
      seen: 0,
      logins: [],
      activity: []
    }
    req.logId = session.name
    models.sessions.push(session)
    res.status(201)
  } else {
    req.logId = session.name
    // append changed evidence.
    // note, evidence omitted from subsequent requests do not generate a change.
    // TODO: maybe debounce or rate limit evidence changes?
    // protect against multiple simultaneous sessions (copied sk/ek, unpredictable evidence, etc.)
    // maybe limit to 6 changes per 6 hours and merge with last 6 changes
    // if limit exceeded do we silently ignore evidence or refuse to return session
    let newEvidence = Object.assign({
      ek: ek || '+' // this tests if "short life" ek cookie value has changed or is undefined
    }, req.body)
    let lastEvidence = session.evidence[session.evidence.length - 1]
    let evidence
    for (let key in newEvidence) {
      if (newEvidence[key] !== lastEvidence[key]) {
        evidence = evidence || {
          ts: Date.now(),
          ek: uid.sync(24) // TODO: do we really want a synchronous call here?
        }
        if (key !== 'ek') evidence[key] = newEvidence[key]
      }
    }
    if (evidence) {
      // TODO: debounce new ek, alleviate refresh race conditions, enable ajax login followed by refresh
      // when received previous ek, only ek is different, new ek was issued in last 30? seconds
      newEk = true
      ek = evidence.ek
      session.evidence.push(evidence)
    }
  }
  res.json(formatMeRestore(session, {
    newSk,
    newEk,
    ek,
    secure: req.body.secure // cookie SSL only determined by our caller (Nuxt UI)
  }))
}
exports.meRestoreHandler = meRestoreHandler

// expects to be mounted immediately after '/me/restore' to protect all subsequent routes
// this middleware attaches a valid session at req.session or throws an exception (status 401)
// Attaches session name as req.logId for tracking sessions in logging
function meVerifySession (req, res, next) {
  req.session = findAuthorizedSession(req, models.sessions) // TODO: do we need exception handler for rate limiter reached?
  if (!req.session) return res.status(401).end()
  req.logId = req.session.name
  next()
}
exports.meVerifySession = meVerifySession
