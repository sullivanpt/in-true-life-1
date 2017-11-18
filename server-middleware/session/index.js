// attaches session object based on cookie or other tracker to each request. For details see api/auth.js
'use strict'

const fetch = require('cross-fetch')
const { reqIp, reqSecure, appendHeader } = require('../helpers/express-patches')

// lifted from https://github.com/nuxt-community/axios-module/blob/master/lib/index.js
const port = process.env.PORT || process.env.npm_package_config_nuxt_port || 3000
let host = process.env.HOST || process.env.npm_package_config_nuxt_host || 'localhost'
if (host === '0.0.0.0') {
  host = 'localhost'
}
const baseUrl = `http://${host}:${port}`

/**
 * Here we try to capture and associate as much evidence as we can with the new or existing session
 */
function getEvidence (req) {
  return {
    secure: reqSecure(req), // false enables non-SSL cookie. TODO: 'auto' flag using app.get('trust proxy')
    ip: reqIp(req),
    agent: req.headers['user-agent']
  }
}

/**
 * Express session middleware to attach session from cookie, create cookie if needed.
 * Attaches req.apiCookie suitable for passing in Cookies header.
 * Attaches session name as req.logId for tracking sessions in logging
 */
async function restoreOrCreateSession (req, res) {
  if (req.apiCookie) return // re-entrant protection
  let restore = await fetch(baseUrl + '/api/me/restore', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': req.headers['cookie'], // pass the client cookies forward to the API
      // CSRF pass origin, X-Requested-With, (don't bother with referer)
      'Origin': req.headers['origin'],
      'X-Forwarded-Host': req.headers['host'], // TODO: if 'trust proxy' then use X-Forwarded-Host
      'X-Requested-With': 'XMLHttpRequest'
    },
    body: JSON.stringify(getEvidence(req))
  })
    .then(res => {
      if (!res.ok) throw new Error('Unable to create session')
      return res.json()
    })
  if (!restore.cookie) throw new Error('Invalid restore format')
  req.apiCookie = restore.cookie
  req.logId = restore.name
  if (restore.setCookie) appendHeader(res, 'Set-Cookie', restore.setCookie)
}

/**
 * Middleware wrapper for restoreOrCreateSession
 */
function sessionHandler (req, res, next) {
  restoreOrCreateSession(req, res)
    .then(() => {
      console.log('restoreOrCreateSession ok', req.logId)
      next()
    })
    .catch(e => {
      console.log('restoreOrCreateSession failed', e)
      next(e)
    })
}

module.exports = sessionHandler
