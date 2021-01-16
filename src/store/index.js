import mutations from './mutations'
import actions from './actions'

const state = {
    title: ''
};

const generateStateToGetters = (state) => {
    let result = {};
    for (let i in state) {
        if (Object.prototype.hasOwnProperty.call(state, i)) {
            result[i] = (state) => state[i];
        }
    }
    return result;
}

export default {
    state,
    mutations,
    actions,
    getters: generateStateToGetters(state)
}