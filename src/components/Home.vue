<template>
    <div class=''>
        <h1>{{title}}</h1>
        这里是Home
    </div>
</template>

<script>

import { mapGetters } from 'vuex';
import * as actions from '@/store/actions';

export default {
    name: 'Home',
    computed: {
        ...mapGetters([
            'title'
        ])
    },
    asyncData({store}) {
        return store.dispatch({
            type: actions.FETCH_TITLE
        })
    },
    mounted() {
        this.$store.dispatch({
            type: actions.FETCH_TITLE
        });
    }
}
</script>

<style lang='less' scoped>
</style>