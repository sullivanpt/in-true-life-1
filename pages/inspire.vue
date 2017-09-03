<template>
  <v-layout column align-center>
    <img src="/v.png" alt="Vuetify.js" class="mb-5">
    <!-- test code -->
    <br>
    <div>name {{form.username}}</div>
    <!-- end test code -->
    <blockquote>
      &#8220;First, solve the problem. Then, write the code.&#8221;
      <footer>
        <small>
          <em>&mdash;John Johnson</em>
        </small>
      </footer>
    </blockquote>
  </v-layout>
</template>

<script>
export default {
  async asyncData () {
    let name = await Promise.resolve('my name')
    return {
      form: {
        username: name
      }
    }
  }
}
</script>
