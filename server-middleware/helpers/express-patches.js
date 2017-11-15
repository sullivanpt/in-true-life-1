// nuxt seems to be lacking some express js request response methods
'use strict'

const sign = require('cookie-signature').sign // TODO: explicit in package.json
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
 * TODO: res.cookie is broken in nuxt
 * See https://github.com/expressjs/express/blob/master/lib/response.js
 */
function resCookie (req, res, name, value, options) {
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

  if (res.cookie) return res.cookie(name, value, options)

  var opts = Object.assign({}, options)
  var secret = req.secret
  var signed = opts.signed

  if (signed && !secret) {
    throw new Error('cookieParser("secret") required for signed cookies')
  }

  var val = typeof value === 'object'
    ? 'j:' + JSON.stringify(value)
    : String(value)

  if (signed) {
    val = 's:' + sign(val, secret)
  }

  if ('maxAge' in opts) {
    opts.expires = new Date(Date.now() + opts.maxAge)
    opts.maxAge /= 1000
  }

  if (opts.path == null) {
    opts.path = '/'
  }
  appendHeader(res, 'Set-Cookie', cookie.serialize(name, String(val), opts))
}
exports.resCookie = resCookie
