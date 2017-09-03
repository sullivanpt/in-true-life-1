module.exports = {
  /*
  ** Headers of the page
  */
  head: {
    title: 'true-vuetify-1',
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { hid: 'description', name: 'description', content: 'Nuxt.js + Vuetify.js project' }
    ],
    link: [
      { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
      { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css?family=Roboto:300,400,500,700|Material+Icons' }
    ]
  },
  plugins: ['~/plugins/vuetify.js'],
  css: [
    '~/assets/style/app.styl'
  ],
  /*
  ** Customize the progress-bar color
  */
  loading: { color: '#3B8070' },
  /*
  ** Build configuration
  */
  build: {
    vendor: ['vuetify'],
    extractCSS: true,
    // turn off babel async transforms, they make debugging difficult
    babel: {
      presets: [['vue-app', {
        envTargets: { // unsupported. See https://github.com/vuejs/babel-preset-vue-app/pull/9
          node: 'current'
          // uglify: true -- required for uglifyjs, but see https://github.com/mishoo/UglifyJS2/tree/harmony
        }
      }]]
    },
    /*
    ** Run ESLINT on save
    */
    extend (config, ctx) {
      // uglifyjs is ES5 only. See https://github.com/nuxt/nuxt.js/issues/250
      config.plugins = config.plugins.filter((plugin) => plugin.constructor.name !== 'UglifyJsPlugin')

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
