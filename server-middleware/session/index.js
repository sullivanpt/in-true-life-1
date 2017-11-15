// attaches session object based on cookie or other tracker to each request
'use strict'

const fetch = require('cross-fetch')
const { reqIp, resCookie } = require('../helpers/express-patches')

let refreshMaxAge = 365 * 24 * 60 * 60 * 1000 // 1 year (i.e. forever, longer tracks the user agent longer)
let cookieName = 'session'

// lifted from https://github.com/nuxt-community/axios-module/blob/master/lib/index.js
const port = process.env.PORT || process.env.npm_package_config_nuxt_port || 3000
let host = process.env.HOST || process.env.npm_package_config_nuxt_host || 'localhost'
if (host === '0.0.0.0') {
  host = 'localhost'
}
const baseUrl = `http://${host}:${port}`

/**
 * Test if the session cookie is valid using the sessions API and attaches it to the request.
 * Assumes req.session is undefined
 * Leaves req.session undefined if the session is invalid, does not throw an exception.
 * Does throw exception for unexpected events like API failures.
 */
async function validatePriorSession (req, res) {
  if (!req.cookies[cookieName]) return
  // TODO: update aspects if needed
  // note the extra encodeURIComponent is just to protect against monkey business
  req.session = await fetch(baseUrl + '/api/sessions/' + encodeURIComponent(req.cookies[cookieName]))
    .then(res => {
      if (res.status !== 200) { // TODO: consolidate and normalize fetch error handling
        throw new Error('Unable to load session')
      }
      return res.json()
    })
  if (!req.session.id) {
    throw new Error('Illegal session id')
  }
}

/**
 * Create a new session using the sessions API and attach it to the request with a cookie.
 * Throws an exception if session creation fails.
 * Assumes req.session is undefined
 */
async function createNewSession (req, res) {
  req.session = await fetch(baseUrl + '/api/sessions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      // here we try to capture and associate as many aspects as we can with the new session
      ip: reqIp(req),
      agent: req.headers['user-agent']
    })
  })
    .then(res => {
      if (res.status !== 201) { // TODO: consolidate and normalize fetch error handling
        throw new Error('Unable to create session')
      }
      return res.json()
    })
  if (!req.session.id) {
    throw new Error('Illegal session id')
  }
  resCookie(req, res, cookieName, req.session.id, {
    // TODO: signed: true,
    httpOnly: true,
    secure: req.secure, // TODO: 'auto' flag using app.get('trust proxy')
    maxAge: refreshMaxAge // TODO: consider browser session only until user opts in to cookies
  })
}

/**
 * Express session middleware to attach session from cookie, create cookie if needed.
 * Attaches req.session.
 * Assumes cookie-parser already ran.
 */
function sessionHandler (req, res, next) {
  if (req.session) return next() // re-entrant protection
  validatePriorSession(req, res)
    .catch(e => {
      console.log('Recovering from', e.toString())
      return createNewSession(req, res)
    })
    .then(() => {
      console.log('Session is', req.session.id)
      next()
    })
    .catch(e => {
      console.log('session failed', e)
      next(e)
    })
}

module.exports = sessionHandler
