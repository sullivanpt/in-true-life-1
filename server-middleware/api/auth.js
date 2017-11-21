/**
 * attaches session object based on cookie or other tracker to each request
 *
 * Ideas I'm struggling to resolve here:
 * - cookie is primarily used as an imperfect device identifier
 * - cookie also used to establish user identity for a possibly shorter or longer period of time than cookie duration
 *
 * Authentication assumptions:
 * - API server holds all state, nuxt UI server is stateless
 * -- Currently for convenience nuxt UI hosts API as middleware
 * - All client requests include authentication by default by leveraging built in cookie behavior (no native app API support, but
 *   we could easily substitute in Bearer token via the UI proxy).
 * - Authentication will randomly expire or otherwise become invalid. Ideally we silently create new from scratch session
 *   when this occurs and associate it with subsequent requests, but easier to only keep new auth with full page refreshes.
 * - All API requests except for 'new session' will fail if not given an existing session.
 * -- New sessions use storage resources so we might need rate limiting or short retention policy.
 * -- Existing sessions can be brute forced so might need rate limiting on invalid requests.
 * -- session tokens are not encrypted at rest
 * --- difficult to steal without permission from session owner
 * --- session owner is a device (not a user), implies public device session tokens are publicly known
 * --- session owner can (maliciously?) copy session tokens to other owned devices; this is probably harmless
 * --- TBD session fixation, hijacking, etc? hopefully httpOnly alleviates some of these, use CSRF for others?
 * - Cookies must be set by nuxt UI server and only on full page refresh and can be httpOnly.
 *  -- The only allowed non authenticated request is full page refresh; although no harm if static requests aren't authenticated.
 *  -- The only opportunity to fix/replace an invalid/expired cookie is with full page refresh.
 * - All authenticated client requests including API are same-origin, proxied by nuxt UI server as needed
 * -- Client API calls (fetch, XMLHttpRequest) must include cookies (not default, but trivial)
 * -- API calls are made by client (fetch via nuxt proxy) or by nuxt UI server on behalf of client
 * -- Either API server needs to understand cookies (or proxy must convert cookie to header auth)
 * -- nuxt UI server must forward cookie header on all API calls
 *
 * Current design:
 * - cookies are httpOnly, secure and sent with every client request
 * - API calls (identified by '/api') are diverted to API module and never pass on
 * -- cookies are parsed in API server
 * -- 'new session API' returns existing session or creates new session and returns session token
 * -- for all other endpoints missing or invalid session returns unauthorized
 * -- other API endpoints evaluated based on current session token
 * -- any unknown endpoint returns 404 to prevent falling through to Nuxt UI
 * - Nuxt UI session middleware enforces a valid session exists before passing on request
 * -- if existing session missing or invalid call 'new session API' and create new cookie containing session token in queued response;
 *    can be wrapped into single API call 'validate or new' by passign cookie forward.
 * -- for convenience, attaches the valid cookie ready to be forwarded in req.apiCookie (or could overwrite req.cookies[cookieName])
 * - Nuxt UI serves content
 * -- static resources are served, and new cookie returned if needed
 * -- server API calls have client cookie (pre-existing or newly created) added to API call header (and recurse to design entry point)
 * -- server returns SSR content, and new cookie if needed
 *
 * Observations:
 * - if cookie expires all client action fails until client gets a new cookie (full page refresh -- can we do this with static image too?)
 * - if parallel non-authenticated UI requests hit the server its a race condition to see which new cookie the client ends with
 *
 * TODO: XSRF (CSRF) design:
 * - Use SOP JS custom header "X-Requested-With: ", combined with checking Origin and Referer headers.
 *   See https://www.owasp.org/index.php/Cross-Site_Request_Forgery_%28CSRF%29_Prevention_Cheat_Sheet#Protecting_REST_Services:_Use_of_Custom_Request_Headers
 *   And https://www.owasp.org/index.php/Cross-Site_Request_Forgery_%28CSRF%29_Prevention_Cheat_Sheet#Identifying_Source_Origin
 *
 * TODO: user authentication design:
 * - Existing session tracks devices, not users. Want a user behavior that limits sensitive operations to:
 * -- a short period of time
 * -- until browser closes, one browser usage session at a time
 * -- until explicit logout
 * -- until implicit logout by changing devices, one device at a time
 * Suggestion:
 * - use 'ek' browser cookie (session lifetime, no expiration) to detect browser close
 * - add 'ek' when saving evidence.
 *   Problem is what to do with old ek when invalid session rebuilt, should we save it in evidence, or at least warn if it isn't already in same session?
 * - "logout" user when evidence change (IP, agent, ek, etc.) or are "too old".
 */
'use strict'

const { cookieSerialize } = require('../helpers/express-patches')

let cookieMaxAge = 365 * 24 * 60 * 60 * 1000 // 1 year (i.e. forever, longer tracks the user agent longer)
let skCookieName = 'sk' // secret sessIon key
let ekCookieName = 'ek' // secret evidence key

let ekPrivateMaxElapsedMs = 15 * 60 * 60 * 1000 // 15 minutes until must login again to see private data

/**
 * Reformats the 'me' session response to so the caller (Nuxt UI) has easy access to the valid session cookie
 * Does not send most of the actual session data, since it isn't needed by caller here.
 * options:
 * - secure cookie should be SSL only
 * - newSk caller should save the new api/sk cookie on the client
 * - newEk caller should save the new ek cookie on the client
 * TODO: consider forcing a save based on session create and cookieMaxAge
 */
function formatMeRestore (session, options) {
  let skCookie = cookieSerialize(skCookieName, session.sk, {
    maxAge: cookieMaxAge,
    httpOnly: true,
    secure: options.secure
  })
  let cookie = [skCookie.split(';')[0]]
  let setCookie = options.newSk ? [skCookie] : []
  if (options.ek) {
    let ekCookie = cookieSerialize(ekCookieName, options.ek, {
      httpOnly: true,
      secure: options.secure
    })
    cookie.push(ekCookie.split(';')[0])
    if (options.newEk) setCookie.push(ekCookie)
  }
  cookie = cookie.join('; ')
  setCookie = (setCookie.length >= 2) ? setCookie : setCookie[0]
  return {
    id: session.id,
    name: session.name,
    cookie, // simulates 'Cookie' header value
    setCookie // suitable for setHeader('Set-Cookie', string|Array[string])
  }
}
exports.formatMeRestore = formatMeRestore

/**
 * Helper to extract the (secret) session sk from the request.
 * Typically this is in a cookie, and we require cookie-parser has already run.
 */
function reqSessionSk (req) {
  return req.cookies[skCookieName] || undefined
}
exports.reqSessionSk = reqSessionSk

/**
 * Helper to extract the (secret) evidence ek from the request.
 * Typically this is in a cookie, and we require cookie-parser has already run.
 */
function reqSessionEk (req) {
  return req.cookies[ekCookieName] || undefined
}
exports.reqSessionEk = reqSessionEk

/**
 * Helper to find the session that matches the supplied key
 * TODO: add rate limiting and what not
 * TODO: check session not expired, etc.
 */
function findAuthorizedSession (req, sessions) {
  const sk = reqSessionSk(req)
  return sessions.find(obj => obj.sk && obj.sk === sk)
}
exports.findAuthorizedSession = findAuthorizedSession

/**
 * Helper to test if session currently has full access to the user.
 * Specifically tests for valid and recent ek.
 * @param {*} req Assumes req.session attached via findAuthorizedSession
 * @param {*} user Assumes req.session.user is this and req.session.user is not null
 */
function hasAccessPrivate (req, user) {
  if (user.session !== req.session.id) return false // logged out or logged into a different session
  let evidence = req.session.evidence[req.session.evidence.lastIndexOf(obj => obj.ek)] // last issued ek
  if (!evidence) return false // ek was never issued
  if (evidence.user !== user.id) return false // no user authenticated when last ek was issued
  let now = Date.now()
  let elapsed = now - (evidence.ts || 0)
  if (elapsed > ekPrivateMaxElapsedMs) return false // ek has expired for use as private access
  if (reqSessionEk() !== evidence.ek) return false // the required ek was not supplied
  return true
}
exports.hasAccessPrivate = hasAccessPrivate
