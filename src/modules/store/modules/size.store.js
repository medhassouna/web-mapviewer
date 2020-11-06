export default {
    state: {
        height: 0,
        width: 0,
    },
    getters: {
        screenDensity: (state) => {
            if (state.height === 0) return 0;
            return state.width / state.height
        }
    },
    mutations: {
        setSize: (state, {height, width}) => {
            state.height = height;
            state.width = width;
        }
    },
    actions: {
        setSize: ({commit}, {width, height}) => {
            commit('setSize', {
                height,
                width,
            })
        }
    }
}
