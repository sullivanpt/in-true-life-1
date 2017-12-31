// nuxt plug in to access server-middleware/api from client or ssr
import * as fetch from 'cross-fetch'

// lifted from https://github.com/nuxt-community/axios-module/blob/master/lib/index.js
const port = process.env.PORT || process.env.npm_package_config_nuxt_port || 3000
let host = process.env.HOST || process.env.npm_package_config_nuxt_host || 'localhost'
if (host === '0.0.0.0') {
  host = 'localhost'
}
const baseUrl = `http://${host}:${port}`

export default ({ req, isServer }, inject) => {
  /**
   * Build an authorized fetch to our local API
   * @param {*} resource the API end point
   * @param {*} method optional HTTP method, defaults to GET
   * @param {*} body optional POST/PUT body as JS object, defaults to undefinedd
   * @param {*} init optional additional fetch parameters
   */
  function buildFetch (resource, method, body, init) {
    return fetch(baseUrl + resource, Object.assign({
      method: method || 'GET',
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'same-origin', // is default? https://github.com/whatwg/fetch/pull/585
      headers: Object.assign({
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest' // for CSRF
      }, (req && req.headers) ? {
        'Cookie': req.apiCookie, // pass the updated client cookies forward to the API
        // CSRF pass origin, X-Requested-With, (don't bother with referer)
        'Origin': req.headers['origin'],
        'X-Forwarded-Host': req.headers['host'] // TODO: if 'trust proxy' then use X-Forwarded-Host
      } : null)
    }, init))
  }

  // This makes available 'store.$api.getSessionSettings' etc.
  inject('api', {
    meReload () {
      return buildFetch('/api/me/reload')
    },
    meForget (credentials) {
      return buildFetch('/api/me/user/forget', 'POST', credentials)
    },
    meLogout () {
      return buildFetch('/api/me/user/logout', 'POST')
    },
    meLock () {
      return buildFetch('/api/me/user/lock', 'POST')
    },
    meCreate (credentials) {
      return buildFetch('/api/me/user/create', 'POST', credentials)
    },
    meStrategies (name) {
      return buildFetch('/api/me/user/strategies', 'POST', { name })
    },
    mePassword (credentials) {
      return buildFetch('/api/me/user/password', 'POST', credentials)
    },
    mePrivateGet () {
      return buildFetch('/api/me/private', 'GET')
    },
    meAlertsGet () {
      return buildFetch('/api/me/alerts', 'GET')
    },
    meSaveSetting (settings) {
      return buildFetch('/api/me/settings', 'POST', settings)
    },
    profileCreate (profile) {
      return buildFetch('/api/profiles', 'POST', profile)
    }
  })
}
