<template>
  <div>
    <h3>My Account</h3>
    <p>
      Nothing here yet, but maybe in the near future you can: get notified about mentions
      and replies, build community trust, protect your identity on public computers, donate
      to maintain and grow this web site.
    </p>
<div class="row">
  <div class="col sm-4">
    <div class="form-group">
      <label for="name">Public Name</label>
      <input v-model="name" type="text" id="name">
    </div>
  </div>
  <div class="col sm-4">
    <div class="form-group">
      <label for="sessionName">Public ID</label>
      <input v-model="sessionName" type="text" id="sessionName" disabled readonly>
    </div>
  </div></div>
  </div>
</template>

<script>
export default {
  data () {
    return {}
  },
  computed: {
    sessionName () { return this.$store.state.me.sessionName },
    name: {
      get: function () { return this.$store.state.me.name },
      set: function (name) { this.$store.dispatch('me/setName', name) }
    }
  }
}
</script>
