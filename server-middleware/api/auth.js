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
 */
'use strict'

const { cookieSerialize } = require('../helpers/express-patches')

let cookieMaxAge = 365 * 24 * 60 * 60 * 1000 // 1 year (i.e. forever, longer tracks the user agent longer)
let cookieName = 'session'

/**
 * Reformats the 'me' session response to so the caller (Nuxt UI) has easy access to the valid session cookie
 * options:
 * - secure cookie should be SSL only
 * - refresh caller should save the new cookie on the client
 * TODO: consider forcing a refresh based on session create and cookieMaxAge
 */
function formatMeResponse (session, options) {
  return Object.assign({
    refresh: options.refresh,
    cookie: cookieSerialize(cookieName, session.secret, {
      maxAge: cookieMaxAge,
      httpOnly: true,
      secure: options.secure
    })
  }, session)
}
exports.formatMeResponse = formatMeResponse

/**
 * Helper to extract the session secret from the request.
 * Typically this is in a cookie, and we require cookie-parser has already run.
 */
function reqSessionSecret (req) {
  return req.cookies[cookieName] || undefined
}
exports.reqSessionSecret = reqSessionSecret

/**
 * Helper to find the session that matches the supplied key
 * TODO: add rate limiting and what not
 * TODO: check session not expired, etc.
 */
function findAuthorizedSession (req, sessions) {
  const secret = reqSessionSecret(req)
  return sessions.find(obj => obj.secret && obj.secret === secret)
}
exports.findAuthorizedSession = findAuthorizedSession
