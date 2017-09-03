export const state = () => ({
  sidebar: false
})

export const mutations = {
  toggleSidebar (state) {
    state.sidebar = !state.sidebar
  }
}

export const actions = {
  async myAction (context) {
    let m = await Promise.resolve(true)
    this.commit('toggleSidebar', m)
  }
}
