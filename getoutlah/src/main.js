import 'bootstrap/dist/css/bootstrap.min.css'
import '@phosphor-icons/web/regular'
import './assets/gol-theme.css'
import './assets/phosphor-icons.css'
import './assets/main.css'

import { createApp, watch } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'
import { startFriends } from './services/friends'
import { startUserDataSync } from './services/userDataSync'

const app = createApp(App)

app.use(createPinia())
app.use(router)

// Keep friends, requests and notifications live for whoever is logged in.
const auth = useAuthStore()
watch(
  () => auth.user?.uid ?? null,
  (uid) => {
    startFriends(uid)
    startUserDataSync(uid) // each account's own wellbeing + reflections, on every device
  },
  { immediate: true },
)

app.mount('#app')
