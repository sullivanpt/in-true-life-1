<template>
  <div>
    <div class="form-group">
      <label for="name">
        <span v-if="newName">Changing My User Name</span>
        <span v-else>My User Name <small class="text-muted">the name other people see you as</small></span>
      </label>
      <input @blur="changeName" v-model="name" type="text" id="name" :disabled="pending">
    </div>
    <div class="form-group">
      <label for="password">
        <span v-if="newPassword!==null">Changing My Password</span>
        <span v-else>My Password</span>
      </label>
      <input @blur="changePassword" v-model="password" type="password" id="password" :disabled="pending">
    </div>
    <div v-if="newPassword!==null" class="form-group">
      <label for="verify-password">Verify Password</label>
      <input @blur="changePassword" v-model="verifyPassword" type="password" id="verify-password" :disabled="pending">
    </div>
    <p v-if="newPassword&&newPassword!==verifyPassword">your new password and verify password entries must match</p>
    <div class="form-group">
      <label for="email">
        <span v-if="newEmail!==null">Changing My Email</span>
        <span v-else>My Email <small class="text-muted">we do not spam you, nor will we share your email with advertisers</small></span>
      </label>
      <input @blur="changeEmail" v-model="email" type="text" id="email" :disabled="pending">
    </div>
    <fieldset class="form-group" v-if="email">
      <label for="email-password-reset" class="paper-check">
        <input @click="changeEmailNotifications" v-model="emailNotifications" value="password" type="checkbox" id="email-password-reset"> <span>Use this email when I forget my password and need it reset</span>
      </label>
      <label for="email-support" class="paper-check">
        <input @click="changeEmailNotifications" v-model="emailNotifications" value="support" type="checkbox" id="email-support"> <span>Use this email when I request technical support</span>
      </label>
      <label for="email-mentions" class="paper-check">
        <input @click="changeEmailNotifications" v-model="emailNotifications" value="mentions" type="checkbox" id="email-mentions"> <span>Send me an email when someone replies to a message I posted here</span>
      </label>
    </fieldset>
    <hr>
    <div class="form-group">
      <p>For your protection you will be automatically logged out after 15 minutes.</p>
      <button @click="logout" :disabled="pending" class="btn-small">Logout of My Account</button>
    </div>
  </div>
</template>

<script>
export default {
  data () {
    return {
      pending: false,
      newName: null,
      newPassword: null,
      verifyPassword: null,
      newEmail: null,
      emailNotifications: ['password', 'support']
    }
  },
  computed: {
    /**
     * shows me.userName until the first keypress, then shows local newName and updates strategies based on it
     */
    name: {
      get () { return (this.newName !== null) ? this.newName : this.$store.state.me.userName },
      set (value) { this.newName = (value !== this.$store.state.me.userName) ? value : null }
    },
    password: {
      get () { return (this.newPassword !== null) ? this.newPassword : 'undisclosed' },
      set (value) { this.newPassword = value }
    },
    email: {
      get () { return (this.newEmail !== null) ? this.newEmail : this.$store.state.me.email },
      set (value) { this.newEmail = value }
    }
  },
  methods: {
    changeName () {
      // TODO: debounce lookup name available, then on blur if available update the name
      if (!this.newName) return
      console.log('change name', this.newName)
      this.newName = null
    },
    changePassword () {
      // TODO: on blur update the password
      if (!this.newPassword || this.newPassword !== this.verifyPassword) return
      console.log('change password', this.newPassword)
      this.newPassword = null
      this.verifyPassword = null
    },
    changeEmail () {
      // TODO: on blur if available update the email
      if (!this.newEmail) return
      console.log('change email', this.newEmail)
      // this.newEmail = null
    },
    changeEmailNotifications () {
      // TODO: on click update email notifications
      console.log('change email notifications', this.emailNotifications)
    },
    logout () {
      this.pending = true
      this.$store.dispatch('me/logout')
        .then(() => {
          console.log('logout successful')
          this.pending = false
          // note: no redirect needed, we are not changing pages
        })
        .catch(e => {
          this.pending = false
          console.log('logout failed', e)
        })
    }
  }
}
</script>
