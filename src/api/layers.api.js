import {API_BASE_URL, WMTS_BASE_URL} from "../config";
import axios from "axios";

/**
 * @readonly
 * @enum {String}
 */
export const LayerTypes = {
    WMTS: 'wmts',
    WMS: 'wms',
    GEOJSON: 'geojson'
};

export class TimeSeriesConfig {

    /**
     *
     * @param {String} behaviour how the default time series is chosen
     * @param {Array<String>} series list of series identifier (that can be placed in the WMTS URL)
     */
    constructor(behaviour = "last", series = []) {
        this.behaviour = behaviour;
        this.series = series;
        this.currentTimestamp = null;
        if (this.series.length > 0) {
            switch (this.behaviour) {
                case 'last':
                    this.currentTimestamp = this.series[0];
            }
        }
    }
}

/**
 * @class
 * @name layers:Layer
 * Base class for Layer config description, must be extended to a more specific flavor of Layer
 * (e.g. {@link WMTSLayer}, {@link WMSLayer} or {@link GeoJsonLayer})
 */
export class Layer {
    /**
     * @param {String} name
     * @param {LayerTypes} type
     * @param {String} id
     * @param {Number} opacity
     * @param {Boolean} isBackground
     */
    constructor(name= '',
                type= null,
                id= '',
                opacity = 1.0,
                isBackground = false) {
        this.name = name;
        this.type = type;
        this.id = id;
        this.opacity = opacity;
        this.isBackground = isBackground;
        this.isSpecificFor3D = id.toLowerCase().endsWith('_3d');
        this.visible = false;
        this.projection = 'EPSG:3857';
    }

    /**
     * @abstract
     * @return {String}
     */
    getURL() {
        throw new Error('You have to implement the method getURL!');
    }
}

export class WMTSLayer extends Layer {
    /**
     * @param {String} name layer name (internationalized)
     * @param {String} id layer ID in the BOD
     * @param {Number} opacity opacity value between 0.0 (transparent) and 1.0 (visible)
     * @param {String} format image format for this WMTS layer (jpeg or png)
     * @param {TimeSeriesConfig} timeSeriesConfig config for layer that are time enabled
     * @param {Boolean} isBackground if this layer should be treated as a background layer
     */
    constructor(name= '',
                id= '',
                opacity= 1.0,
                format = 'png',
                timeSeriesConfig = null,
                isBackground = false) {
        super(name, LayerTypes.WMTS, id, opacity, isBackground);
        this.format = format;
        this.timeSeriesConfig = timeSeriesConfig;
    }

    getURL() {
        let timestamp = 'current';
        if (this.timeSeriesConfig) {
            timestamp = this.timeSeriesConfig.currentTimestamp
        }
        return `${WMTS_BASE_URL}1.0.0/${this.id}/default/${timestamp}/3857/{z}/{x}/{y}.${this.format}`;
    }
}

export class WMSLayer extends Layer {
    constructor(name, id, opacity, baseUrl, format) {
        super(name, LayerTypes.WMS, id, opacity);
        this.format = format;
        this.baseUrl = baseUrl;
    }

    getURL() {
        return `${this.baseUrl}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&FORMAT=image%2F${this.format}&TRANSPARENT=true&LAYERS=${this.id}&LANG=en`;
    }
}

export class GeoJsonLayer extends Layer {
    constructor(name, id, opacity) {
        super(name, LayerTypes.GEOJSON, id, opacity);
        this.data = null;
        this.style = null;
        this.fetching = false;
    }
}

const generateClassForLayerConfig = (layerConfig) => {
    let layer = undefined;
    if (layerConfig) {
        const { serverLayerName: id, label: name, type, opacity, format, background } = layerConfig;
        let timeEnableConfig = null;
        if (layerConfig.timeEnabled) {
            timeEnableConfig = new TimeSeriesConfig(layerConfig.timeBehaviour, layerConfig.timestamps);
        }
        switch(type.toLowerCase()) {
            case 'wmts':
                layer = new WMTSLayer(name, id, opacity, format, timeEnableConfig, background);
                break;
            case 'wms':
                layer = new WMSLayer(name, id, opacity, layerConfig.wmsUrl, format);
                break;
            default:
                layer = new GeoJsonLayer(name, id, opacity);
        }
    }
    return layer;
}

/**
 * Loads the layers config from the backend and transforms it in classes defined in this API file
 * @param {String} lang the ISO code for the lang in which the config should be loaded (required)
 * @returns {Promise<Layer[]>}
 */
const loadLayersConfigFromBackend = (lang) => {
    return new Promise((resolve, reject) => {
        const layersConfig = [];
        axios.get(`${API_BASE_URL}rest/services/all/MapServer/layersConfig?lang=${lang}`)
            .then(({data: rawLayersConfig}) => {
                if (Object.keys(rawLayersConfig).length > 0) {
                    Object.keys(rawLayersConfig).forEach(rawLayerId => {
                        const rawLayer = rawLayersConfig[rawLayerId];
                        layersConfig.push(generateClassForLayerConfig(rawLayer))
                    })
                    resolve(layersConfig);
                } else {
                    reject('LayersConfig loaded from backend is not an defined or is empty');
                }
            }).catch((error) => {
                const message = 'Error while loading layers config from backend';
                console.error(message, error);
                reject(message);
        })
    })
}

export default loadLayersConfigFromBackend;
