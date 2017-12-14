<template>
  <div>
    <header>
      <div class="card">
        <div class="card-body">
          <div class="float-right">
            <nuxt-link
              class="nav-link"
              :class="[item.animate]"
              :title="item.tip"
              :key="i"
              v-for="(item, i) in helpItems"
              :to="item.to"
              :exact="true">{{item.emoji}}</nuxt-link>
          </div>
          <nuxt-link
            class="nav-link"
            :title="item.tip"
            :key="i"
            v-for="(item, i) in items"
            :to="item.to"
            :exact="true">{{item.emoji}}<span class="hide-xsmall">{{item.title}}</span></nuxt-link>
        </div>
      </div>
    </header>
    <div class="container paper">
      <main>
        <nuxt/>
      </main>
      <footer>
        <hr>
        <div class="text-center small">
          <div class="float-right"><nuxt-link to="policies">(policies)</nuxt-link></div>
          <span>CC BY-SA &copy; 2017 Creava Inc.</span>
        </div>
      </footer>
    </div>
    <div v-if="!cookies" class="toast">
      <div class="row child-shadows">
        <div class="alert alert-primary">
          <button @click="acceptCookies()" class="btn-small float-right" title="close">&times;</button>
          <b>Cookies</b> this site uses cookies and other techniques to enforce accountability
          and encourage positive citizenship. <nuxt-link to="policies">Learn more...</nuxt-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data () {
    return {
      items: [
        { emoji: '💛', title: 'InTrue.Life', tip: 'Home', to: '/' },
        { emoji: '🔥', title: 'Inspire', tip: 'Match Making', to: '/inspire' },
        { emoji: '🚀', title: 'Optimistic', tip: 'Join the Hopeful', to: '/optimistic' }
      ]
    }
  },
  computed: {
    helpItems () {
      return (this.$store.state.me.alerts ? [
        { emoji: '🔔', animate: this.$store.state.me.alerted ? 'anim-shake' : '', tip: 'Alerts', to: '/alerts' }
      ] : []).concat([
        { emoji: '❓', tip: 'Help', to: '/help' },
        { emoji: this.$store.state.me.userId ? '🔓' : '🔐', tip: 'My Account', to: '/account' }
      ])
    },
    cookies () { return this.$store.state.me.cookies }
  },
  methods: {
    acceptCookies () { this.$store.dispatch('me/acceptCookies') }
  }
}
</script>

<style>
.toast {
  position: fixed;
  bottom: 30px;
  right: 3%;
  left: 50%;
}
.small {
  font-size: 80%;
}
.float-right {
  float: right;
}
a.nav-link {
  color: #007de0;
}
a.nuxt-link-active {
  color: black;
}
@media screen and (max-width: 480px) {
  .hide-xsmall {
    display: none;
  }
}
@keyframes shake {
  30% { transform: rotate(0deg); }
  40% { transform: rotate(20deg); }
  50% { transform: rotate(-20deg); }
  60% { transform: rotate(20deg); }
  70% { transform: rotate(-20deg); }
  80% { transform: rotate(0deg); }
}
.anim-shake {
  display: inline-block;
  animation-name: shake;
  animation-duration: 10s;
  animation-iteration-count: infinite;
}
</style>
