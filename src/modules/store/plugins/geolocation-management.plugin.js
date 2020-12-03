import proj4 from "proj4";
import i18n from "@/modules/i18n";

let geolocationWatcher = null;
let firstTimeActivatingGeolocation = true;

const readPositionEpsg3857 = position => {
    const { coords } = position;
    return proj4(proj4.WGS84, 'EPSG:3857', [coords.longitude, coords.latitude]);
};

const handlePositionAndDispatchToStore = (position, store) => {
    const positionEpsg3857 = readPositionEpsg3857(position);
    store.dispatch('setGeolocationPosition', positionEpsg3857);
    store.dispatch('setGeolocationAccuracy', position.coords.accuracy);
    // if tracking is active, we center the view of the map on the position received
    if (store.state.geolocation.tracking) {
        store.dispatch('setCenter', positionEpsg3857);
    }
}

/**
 * Handles Geolocation API errors
 * @param {PositionError} error
 * @param {Vuex.Store} store
 */
const handlePositionError = (error, store) => {
    switch (error.code) {
        case error.PERMISSION_DENIED:
            store.dispatch('setGeolocationDenied', true);
            alert(i18n.t('geoloc_permission_denied'));
            break;
        default:
            alert(i18n.t('geoloc_unknown'));
    }
}

const geolocationManagementPlugin = store => {
    store.subscribe((mutation, state) => {
        // we listen to the mutation that is triggered when the map is starting being dragged in order to stop
        // tracking the user geolocation to the center of the view
        if (state.geolocation.active && mutation.type === 'mapStartBeingDragged') {
            store.dispatch('setGeolocationTracking', false);
        }
        // listening to the start/stop of geolocation
        if (mutation.type === 'setGeolocationActive') {
            if (state.geolocation.active) {
                navigator.geolocation.getCurrentPosition(
                    position => {
                        // if geoloc was previously denied, we clear the flag
                        if (state.geolocation.denied) {
                            store.dispatch('setGeolocationDenied', false);
                        }
                        handlePositionAndDispatchToStore(position, store)
                        if (firstTimeActivatingGeolocation) {
                            firstTimeActivatingGeolocation = false;
                            // going to zoom level 15.5 corresponding to map 1:25'000 (or zoom level 8 in the old viewer)
                            store.dispatch('setZoom', 15.5);
                        }
                        geolocationWatcher = navigator.geolocation.watchPosition(position => handlePositionAndDispatchToStore(position, store),
                                                                                   error => handlePositionError(error, store));
                    },
                    error => handlePositionError(error, store)
                )
            } else if (geolocationWatcher) {
                navigator.geolocation.clearWatch(geolocationWatcher);
                geolocationWatcher = null;
            }
        }
    })
};

export default geolocationManagementPlugin;