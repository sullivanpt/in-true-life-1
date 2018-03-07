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
    '~/assets/style/app.scss'
  ],
  sassResources: [ // see 'nuxt-sass-resources-loader'
    '@/assets/style/_vars.scss'
  ],
  serverMiddleware: [
    // See API authentication design comments at top of sever-middleware/api/auth.js file
    // our API expects authorization to be in a cookie
    // if we enter the API handler the request will end here in all circumstances
    { path: '/api', handler: '~/server-middleware/api/index.js' },
    // from here onwards we make recursive calls to '/api'.
    // the following enforces a valid API session exists for the remainder of the request,
    // creating one if needed and returning an API token in a cookie.
    '~/server-middleware/session/index.js'
  ],
  plugins: [
    '~/plugins/api.js',
    { src: '~/plugins/medium-editor.js', ssr: false }
  ],
  modules: [
    'nuxt-sass-resources-loader'
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
    ** Reload on change. See https://github.com/nuxt/nuxt.js/issues/1819
     */
    watch: [
      'server-middleware' // TODO: broken, does something on change but doesn't reload api middleware
    ],
    /*
    ** Run ESLINT on save
    */
    extend (config, ctx) {
      if (ctx.isDev && ctx.isClient) {
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
