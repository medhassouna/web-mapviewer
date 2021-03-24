import SimpleUrlParamConfig from '@/router/store-sync/simpleParamConfig.class'
import LayerParamConfig from '@/router/store-sync/layersParamConfig.class'

/**
 * Configuration for all URL parameters of this app that need syncing with the store (and vice-versa)
 *
 * @type Array<AbstractParamConfig>
 */
const storeSyncConfig = [
    new SimpleUrlParamConfig(
        'lat',
        'setCenter',
        'setLatitude',
        (store) => store.getters.centerEpsg4326[1],
        Number
    ),
    new SimpleUrlParamConfig(
        'lon',
        'setCenter',
        'setLongitude',
        (store) => store.getters.centerEpsg4326[0],
        Number
    ),
    new SimpleUrlParamConfig(
        'z',
        'setZoom',
        'setZoom',
        (store) => store.state.position.zoom,
        Number
    ),
    new SimpleUrlParamConfig(
        'geolocation',
        'setGeolocationActive',
        'toggleGeolocation',
        (store) => store.state.geolocation.active,
        Boolean
    ),
    new LayerParamConfig(),
]

export default storeSyncConfig
