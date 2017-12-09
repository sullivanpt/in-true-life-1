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
      <label for="verify-password">Verify New Password</label>
      <input @blur="changePassword" v-model="verifyPassword" type="password" id="verify-password" :disabled="pending">
    </div>
    <p v-if="newPassword&&newPassword!==verifyPassword">your new password and verify password entries must match</p>
    <hr>
    <div class="form-group">
      <label for="email">
        <span v-if="newEmail!==null">Changing My Email</span>
        <span v-else-if="!originalEmail">My Account Recovery Email <small class="text-muted">we do not spam you, nor will we share your email with advertisers</small></span>
        <span v-else>My Email <small v-if="emailVerified" class="text-success">verified</small></span>
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
    <div v-if="emailVerified" class="form-group">
      <p>Verify your email now to ensure it will work for password recovery when you need it</p>
      <button @click="verifyEmail" :disabled="pending">Verify My Email</button>
    </div>
    <hr>
    <div class="form-group">
      <label for="forgetPassword" class="text-danger">Confirm My Password and Delete My Account</label>
      <input v-model="forgetPassword" type="password" id="forgetPassword" :disabled="pending">
    </div>
    <div v-if="forgetPassword" class="form-group">
      <button @click="forget" :disabled="pending" class="btn-small background-danger">Delete My Account</button>
       <p v-if="forgetError==='FORGET_CREDENTIALS'" class="text-danger">that password is not correct</p>
       <p v-else-if="forgetError==='FORGET_CREDENTIALS'" class="text-danger">an unexpected and unknown error, maybe the Internet is not connected?</p>
       <p class="text-danger">Press the delete button to disable your account.
         Your private data will be deleted from this website according to the schedule outlined in the policies.
         Your user name will be made available to other people.
         Data you have added to the public areas of this website will remain available as outlined in the policies and CC BY-SA license.
         For further details please read  the <nuxt-link to="policies">policies</nuxt-link> page.</p>
    </div>
    <div class="form-group">
      <p>Use the logout button to signal that someone other than yourself will be using this device in the future.</p>
      <button @click="logout" :disabled="pending" class="btn-small">Logout of My Account</button>
    </div>
    <hr>
    <div class="form-group">
      <p>Use the lock button to secure your private details from prying eyes that might have access to this device.
         For your protection your account will be automatically locked after 15 minutes.</p>
      <button @click="lock" :disabled="pending" class="btn-small">Lock My Account Now</button>
    </div>
  </div>
</template>

<script>
export default {
  data () {
    return {
      loading: true,
      pending: false,
      newName: null,
      newPassword: null,
      verifyPassword: null,
      forgetPassword: null,
      forgetError: null,
      originalEmail: null,
      newEmail: null,
      emailNotifications: [],
      emailVerified: false
    }
  },
  mounted () {
    this.$api.mePrivateGet()
      .then(r => {
        if (r.ok) return r.json()
        throw new Error('mePrivateGet') // TODO: should be routing back to itl-account-login
      })
      .then(r => {
        this.loading = false
        let emailOpt = r.channels.find(o => o.email)
        this.originalEmail = emailOpt && emailOpt.email
        this.emailVerified = !!(emailOpt && emailOpt.verified)
        this.emailNotifications = emailOpt ? emailOpt.events : ['password', 'support']
        // TODO: some indication password is enabled and can be changed or added?
        // TODO: secret or CSRF token especially for changing sensitive login fields: email address and password
      })
      .catch(e => {
        console.log('mePrivateGet failed', e)
      })
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
      get () { return (this.newEmail !== null) ? this.newEmail : this.originalEmail },
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
      // note: existing password probably not needed since it was supplied recently, but only if we have sufficient CSRF protection
      if (!this.newPassword || this.newPassword !== this.verifyPassword) return
      console.log('change password', this.newPassword)
      this.newPassword = null
      this.verifyPassword = null
    },
    changeEmail () {
      // TODO: on blur if available update the email
      if (!this.newEmail) return
      console.log('change email', this.newEmail, this.emailNotifications)
      // this.newEmail = null
    },
    changeEmailNotifications () {
      // TODO: on click update email notifications
      console.log('change email notifications', this.emailNotifications)
    },
    verifyEmail () {}, // TODO: implement me
    lock () {
      this.pending = true
      this.$store.dispatch('me/lock')
        .then(() => {
          console.log('lock successful')
          this.pending = false
          // note: no redirect needed, we are not changing pages
        })
        .catch(e => {
          this.pending = false
          console.log('lock failed', e)
        })
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
    },
    forget () {
      this.pending = true
      this.forgetError = null
      this.$store.dispatch('me/forget', { password: this.forgetPassword })
        .then(r => {
          this.pending = false
          this.forgetError = r ? 'FORGET_CREDENTIALS' : null // TODO: pass error codes from API
          // note: no redirect needed, we are not changing pages
        })
        .catch(e => {
          this.pending = false
          this.forgetError = 'FORGET_CONNECTION'
          console.log('forget failed', e)
        })
    }
  }
}
</script>
