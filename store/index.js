export const state = () => ({
  sidebar: false
})

export const mutations = {
  toggleSidebar (state) {
    state.sidebar = !state.sidebar
  }
}

export const actions = {
  /**
   * Manually delegate nuxtServerInit to interested modules
   */
  nuxtServerInit ({ dispatch }) {
    return dispatch('me/reload')
  }
}
