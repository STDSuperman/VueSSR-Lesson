import Vue from 'vue';
import App from './App'
import VueRouter from 'vue-router';
import routes from './router'
import Vuex from 'vuex';
import storeConfig from './store';

Vue.use(VueRouter);
Vue.use(Vuex);

const store = new Vuex.Store(storeConfig);
const router = new VueRouter({
    routes,
    mode: 'history'
})

export default function createApp() {
    const app = new Vue({
        router,
        store,
        render: h => h(App)
    })
    return { app, router, store }
}