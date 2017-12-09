<template>
  <div>
    <div class="form-group">
      <label for="name">User Name <small class="text-muted">the name other people see you as</small></label>
      <input v-model="name" type="text" id="name" required :disabled="pending">
    </div>
    <div v-if="!loading&&passwordToken" class="form-group">
      <label for="password">Password</label>
      <input @input="clearError" v-model="password" type="password" id="password" required :disabled="pending">
    </div>
    <div v-if="!loading&&!exists&&passwordToken" class="form-group">
      <label for="verify-password">Verify Password</label>
      <input v-model="verifyPassword" type="password" id="verify-password" :disabled="pending">
    </div>
    <div v-if="!loading&&!exists&&passwordToken&&password&&password===verifyPassword" class="form-group">
      <button @click="create" :disabled="pending">Create My Account</button>
    </div>
    <div v-if="!loading&&exists&&passwordToken&&password" class="form-group">
      <button @click="login" :disabled="pending">Login to My Account</button>
    </div>
    <p v-if="error==='LOGIN_CREDENTIALS'" class="text-danger">this user name exists, but that password is not correct</p>
    <p v-else-if="error==='CREATE_INVALID'" class="text-danger">this user name is reserved, please choose another</p>
    <p v-else-if="error" class="text-danger">an unexpected and unknown error, maybe the Internet is not connected?</p>
    <p v-else-if="pending">checking your credentials, please wait.</p>
    <p v-else-if="!name">enter your unique user name for this website</p>
    <p v-else-if="loading">checking if this user name is available, please wait.</p>
    <p v-else-if="exists&&!passwordToken">this user name exists, but login is disabled.</p>
    <p v-else-if="exists&&!password">this user name exists, please enter your password</p>
    <p v-else-if="exists">this user name exists, press login button to see the account</p>
    <p v-else-if="!passwordToken">this user name is reserved, please choose another</p>
    <p v-else-if="!password">this user name is available, supply a password to protect your new account</p>
    <p v-else-if="password!==verifyPassword">this user name is available, your new password and verify password entries must match</p>
    <p v-else>this user name is available, please write down your new user name and password for future reference, then press the create account button</p>
  </div>
</template>

<script>
import debounce from 'lodash/debounce'

export default {
  data () {
    return {
      loading: true, // loading indicator during data entry
      pending: false, // loading indicator after data entry
      error: null, // if truthy error after data entry ajax
      newName: null,
      exists: false, // truthy indicates user pre-existing
      password: '', // new or existing user password
      verifyPassword: '', // new user verify password entered correctly
      passwordToken: null // truthy indicates existing user can login with password strategy
    }
  },
  created () {
    this.lookupName = debounce(this.lookupName, 500) // https://forum.vuejs.org/t/issues-with-vuejs-component-and-debounce/7224/11
  },
  mounted () {
    this.lookupName() // TODO: consider this.lookupName.flush()
  },
  computed: {
    /**
     * shows me.userName until the first keypress, then shows local newName and updates strategies based on it
     */
    name: {
      get () { return (this.newName !== null) ? this.newName : this.$store.state.me.userName },
      set (value) {
        this.error = null
        this.newName = value
        this.loading = true
        this.lookupName()
      }
    }
  },
  methods: {
    clearError () { this.error = null },
    /**
     * debunced query /me/user/strategies to see if user name exists and if so what auth strategies are enabled
     */
    lookupName: function lookupName () {
      if (!this.name) return // skip ajax on blank
      this.$api.meStrategies(this.name)
        .then(r => {
          if (r.ok) return r.json()
          throw new Error('lookupName status')
        })
        .then(j => {
          if (this.name && j && j.user.name === this.name) {
            this.exists = j.exists
            this.passwordToken = this.exists ? (j.password && j.password.token) : (j.newPassword && j.newPassword.token)
            this.loading = false
            this.error = j.reason ? 'CREATE_INVALID' : null // TODO: use checkNewUserName codes here
          } // this response doesn't match our current name, or current name blank ignore it, leave loading true
        })
        .catch(e => {
          console.log('lookupName failed', e)
        })
    },
    create () {
      this.pending = true
      this.error = null
      this.$store.dispatch('me/create', {
        token: this.passwordToken, password: this.password
      })
        .then(r => {
          this.pending = false
          this.error = r ? 'CREATE_INVALID' : null // TODO: pass error codes from API
          // note: no redirect needed, we are not changing pages
        })
        .catch(e => {
          this.pending = false
          this.error = 'CREATE_CONNECTION'
          console.log('create failed', e)
        })
    },
    login () {
      this.pending = true
      this.error = null
      this.$store.dispatch('me/login', {
        token: this.passwordToken, password: this.password
      })
        .then(r => {
          this.pending = false
          this.error = r ? 'LOGIN_CREDENTIALS' : null // TODO: pass error codes from API
          // note: no redirect needed, we are not changing pages
        })
        .catch(e => {
          this.pending = false
          this.error = 'LOGIN_CONNECTION'
          console.log('login failed', e)
        })
    }
  }
}
</script>
