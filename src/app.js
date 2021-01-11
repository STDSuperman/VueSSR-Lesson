import Vue from 'vue';
import App from './App'
import VueRouter from 'vue-router';
import routes from './router'

Vue.use(VueRouter);
const router = new VueRouter({
    routes,
    mode: 'history'
})

export default function createApp() {
    const app = new Vue({
        router,
        render: h => h(App)
    })
    return { app, router }
}