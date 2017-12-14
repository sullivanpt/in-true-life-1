<template>
  <div>
     <h3>Alerts</h3>
     <p class="text-muted">
       Nothing to see at this time, but in the future any service notifications
       or direct messages sent to you will be appear here.
     </p>
    <p v-if="loading">checking for messages, please wait.</p>
    <div class="alert" :key="i" v-for="(item, i) in messages">
      <p>{{ item.text }}</p>
      <div class="text-muted">
        &mdash; <b>{{ item.name }}</b> on
        {{ new Date(item.ts).toLocaleString() }}
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data () {
    return {
      loading: true,
      messages: []
    }
  },
  mounted () {
    this.$api.meAlertsGet()
      .then(r => {
        if (r.ok) return r.json()
        throw new Error('meAlertsGet status')
      })
      .then(j => {
        this.loading = false
        this.messages = j.messages
        this.$store.commit('me/clearAlerted')
      })
      .catch(e => {
        console.log('meAlertsGet failed', e)
      })
  }
}
</script>
