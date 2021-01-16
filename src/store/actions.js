import * as mutations from './mutations';

export const FETCH_TITLE = 'FETCH_TITLE'

export default {
    [FETCH_TITLE]({commit}) {
        return new Promise(resolve => {
            setTimeout(() => {
                commit(mutations.SET_TITLE, '这里是服务端渲染的title')
                resolve();
            }, 3000)
        })
    }
}