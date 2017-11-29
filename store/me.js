// state data about the current session and user

export const state = () => ({
  cookies: false,
  userId: null,
  sessionName: '',
  name: ''
})

export const mutations = {
  reload (state, data) {
    state.cookies = !!(data.settings && data.settings.cookies)
    state.userId = data.user ? data.user.id : null
    state.sessionName = (data.session && data.session.name) || ''
    state.name =
      (data.user && data.user.name) ||
      (data.settings && data.settings.name) ||
      state.sessionName
  },
  acceptCookies (state) {
    state.cookies = true
  },
  setName (state, name) {
    state.name = name
  }
}

export const actions = {
  async reload ({ commit }) {
    // TODO: maybe a wait cursor here
    let r = await this.$api.meReload()
    if (!r.ok) {
      console.log('reload', r) // TODO: error handling and logging
    } else {
      commit('reload', await r.json())
    }
  },
  async acceptCookies ({ commit }) {
    commit('acceptCookies') // immediate UI feedback, no worries if async fails
    let r = await this.$api.meSaveSetting({ cookies: true })
    if (!r.ok) {
      console.log('saveSessionSetting', r) // TODO: error handling and logging
    }
  },
  async setName ({ commit }, name) {
    commit('setName', name)
    // TODO: debounce and call API either session/settings or user/private
  }
}
