<template>
  <div>
    <div class="form-group">
      <label for="type">Goal for this profile</label>
      <select v-model="type" id="type">
        <option value="SINGLE">Find love and happiness</option>
        <option value="MATCHER">Help your friends find their happiness</option>
        <option value="MODERATOR">Moderate discussions and apply community standards</option>
      </select>
    </div>
    <div class="form-group">
      <label for="title">Name <small class="text-muted">non-unique alias used to identify this profile</small></label>
      <input v-model="title" id="title" type="text">
    </div>
    <div class="form-group">
      <label for="photo1">
        Photo URL
        <small class="text-muted"><a href="https://imghost.io/" target="_blank">IMGhost.io&trade;</a>
        or <a href="http://postimages.org/" target="_blank">postimage&trade;</a></small>
      </label>
      <input v-model="photo1" id="photo1" type="url">
    </div>
    <div class="form-group">
      <label for="video1"><a href="https://www.youtube.com/" target="_blank">YouTube&trade;</a> Video ID</label>
      <input v-model="video1" id="video1" type="text">
    </div>
    <div class="form-group">
      <label for="text">Description <small class="text-muted">this profiles desires, features, and benefits</small></label>
      <no-ssr>
        <medium-editor :text="text" @edit="textEdit" custom-tag="div" class="input-medium"></medium-editor>
      </no-ssr>
    </div>
    <div class="form-group">
      <button v-if="canCreate" @click="create">Create New Profile</button>
    </div>
  </div>
</template>

<script>
export default {
  data () {
    return {
      pending: false,
      type: 'MATCHER',
      title: '',
      text: '',
      photo1: null,
      video1: null
    }
  },
  computed: {
    canCreate () { return this.title && this.text }
  },
  methods: {
    create () {
      this.pending = true
      let profile = {}
      this.$api.profileCreate(profile)
        .then(r => {
          if (r.ok) return r.json()
          throw new Error('profileCreate')
        })
        .then(r => {
          this.pending = false
          console.log('created')
        })
        .catch(e => {
          console.log('profileCreate failed', e)
        })
    },
    textEdit (operation) {
      // TODO: here and in API sanitize HTML, especially embedded links. consider markdown conversion
      this.text = operation.api.origElements.innerHTML
    }
  }
}
</script>
