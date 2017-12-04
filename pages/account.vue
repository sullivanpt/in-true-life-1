<template>
  <div>
    <h3>My Account</h3>
    <p>
      Nothing here yet, but maybe in the near future you can: get notified about mentions
      and replies, build community trust, protect your identity on public computers, donate
      to maintain and grow this web site.
    </p>
    <hr>
    <itl-account-view v-if="userAuthorized"></itl-account-view>
    <itl-account-login v-else></itl-account-login>
  </div>
</template>

<script>
import ItlAccountLogin from '~/components/itl-account-login.vue'
import ItlAccountView from '~/components/itl-account-view.vue'

export default {
  components: {
    ItlAccountLogin,
    ItlAccountView
  },
  computed: {
    userAuthorized () { return this.$store.state.me.userAuthorized }
  }
}
</script>
