let cookieParser = require('cookie-parser')

/**
 * Define this environment variable to set the session cookie secret
 */
const COOKIE_SECRET = process.env.COOKIE_SECRET || 'keyboard-catastrophe'

module.exports = {
  /*
  ** Headers of the page
  */
  head: {
    title: 'InTrue.Life',
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { hid: 'description', name: 'description', content: 'InTrue.Life for real friendships and nice people' }
    ],
    link: [
      { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
    ]
  },
  css: [
    '~/assets/style/app.less'
  ],
  serverMiddleware: [
    // Will register file from project api directory to handle /api/* requires
    { path: '/api', handler: '~/server-middleware/api/index.js' },
    // use cookies to attach a session object to every non API request
    // make recursive calls to API, so we exclude API to avoid infinite loop
    cookieParser(COOKIE_SECRET),
    '~/server-middleware/session/index.js'
  ],
  /*
  ** Customize the progress-bar color
  */
  loading: { color: '#3B8070' },
  /*
  ** Build configuration
  */
  build: {
    extractCSS: true,
    /*
    ** Run ESLINT on save
    */
    extend (config, ctx) {
      if (ctx.dev && ctx.isClient) {
        config.module.rules.push({
          enforce: 'pre',
          test: /\.(js|vue)$/,
          loader: 'eslint-loader',
          exclude: /(node_modules)/
        })
      }
    }
  }
}
