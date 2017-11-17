// attaches session object based on cookie or other tracker to each request. For details see api/auth.js
'use strict'

const fetch = require('cross-fetch')
const { reqIp, appendHeader } = require('../helpers/express-patches')

// lifted from https://github.com/nuxt-community/axios-module/blob/master/lib/index.js
const port = process.env.PORT || process.env.npm_package_config_nuxt_port || 3000
let host = process.env.HOST || process.env.npm_package_config_nuxt_host || 'localhost'
if (host === '0.0.0.0') {
  host = 'localhost'
}
const baseUrl = `http://${host}:${port}`

/**
 * Here we try to capture and associate as many aspects as we can with the new or existing session
 */
function getAspects (req) {
  return {
    secure: req.secure, // TODO: 'auto' flag using app.get('trust proxy')
    ip: reqIp(req),
    agent: req.headers['user-agent']
  }
}

/**
 * Express session middleware to attach session from cookie, create cookie if needed.
 * Attaches req.apiCookie suitable for passing in Cookies header.
 */
async function restoreOrCreateSession (req, res) {
  if (req.apiCookie) return // re-entrant protection
  let session = await fetch(baseUrl + '/api/me/restore', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': req.headers['cookie'] // pass the client cookies forward to the API
    },
    body: JSON.stringify(getAspects(req))
  })
    .then(res => {
      if (!res.ok) throw new Error('Unable to create session')
      return res.json()
    })
  if (!session.cookie) throw new Error('Invalid session format')
  if (session.refresh) appendHeader(res, 'Set-Cookie', session.cookie)
  req.apiCookie = session.cookie
}

/**
 * Middleware wrapper for restoreOrCreateSession
 */
function sessionHandler (req, res, next) {
  restoreOrCreateSession(req, res)
    .then(() => {
      console.log('restoreOrCreateSession ok', req.apiCookie)
      next()
    })
    .catch(e => {
      console.log('restoreOrCreateSession failed', e)
      next(e)
    })
}

module.exports = sessionHandler
