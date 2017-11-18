// nuxt seems to be lacking some express js request response methods
'use strict'

const cookie = require('cookie') // TODO: explicit in package.json

/**
 * TODO: req.ip seems broken in nuxt, so patch it, also X-Forwarded-For
 */
function reqIp (req) {
  function ips (req) {
    const trustProxy = true // TODO: make this a setting?
    const val = req.headers['x-forwarded-for']
    return trustProxy && val ? val.split(/ *, */) : []
  }

  return req.ip || ips(req)[0] || req.connection.remoteAddress
}
exports.reqIp = reqIp

/**
 * helper to mimic req.protocol
 */
function reqProtocol (req) {
  const trustProxy = true // TODO: make this a setting?
  var proto = req.connection.encrypted
    ? 'https'
    : 'http'

  if (!trustProxy) {
    return proto
  }

  // Note: X-Forwarded-Proto is normally only ever a
  //       single value, but this is to be safe.
  var header = req.header('x-forwarded-proto') || proto
  var index = header.indexOf(',')

  return index !== -1
    ? header.substring(0, index).trim()
    : header.trim()
}
exports.reqProtocol = reqProtocol

/**
 * helper to mimic req.secure
 */
function reqSecure (req) {
  return reqProtocol === 'https'
}
exports.reqSecure = reqSecure

/**
 * Helper to mimic the way express res.cookie prepares Set-Cookie header
 * Does not support signed cookie
 */
function cookieSerialize (name, value, options) {
  var opts = Object.assign({}, options)

  var val = typeof value === 'object'
    ? 'j:' + JSON.stringify(value)
    : String(value)

  if ('maxAge' in opts) {
    opts.expires = new Date(Date.now() + opts.maxAge)
    opts.maxAge /= 1000
  }

  if (opts.path == null) {
    opts.path = '/'
  }

  return cookie.serialize(name, String(val), opts)
}
exports.cookieSerialize = cookieSerialize

/**
 * Extracted from Express Response.merge
 * See https://github.com/expressjs/express/blob/master/lib/response.js
 */
function appendHeader (res, field, val) {
  var prev = res.getHeader(field)
  var value = val

  if (prev) {
    // concat the new and prev vals
    value = Array.isArray(prev) ? prev.concat(val)
      : Array.isArray(val) ? [prev].concat(val)
        : [prev, val]
  }

  return res.setHeader(field, value)
}
exports.appendHeader = appendHeader
