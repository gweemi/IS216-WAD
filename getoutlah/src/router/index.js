import { createRouter, createWebHistory } from 'vue-router'
import BadgesView from '../views/BadgesView.vue'                 
import MyFeaturesTestView from '../views/MyFeaturesTestView.vue' 

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [ 
    { path: '/badges', name: 'badges', component: BadgesView },                                     
    { path: '/test-my-features', name: 'test-my-features', component: MyFeaturesTestView },           
  ], 
})

export default router
