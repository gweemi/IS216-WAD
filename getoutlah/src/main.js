import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import './assets/gol-theme.css'
import './assets/main.css'

import { createApp, watch } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'
import { startFriends } from './services/friends'

const app = createApp(App)

app.use(createPinia())
app.use(router)

// Keep friends, requests and notifications live for whoever is logged in.
const auth = useAuthStore()
watch(() => auth.user?.uid ?? null, (uid) => startFriends(uid), { immediate: true })

app.mount('#app')
