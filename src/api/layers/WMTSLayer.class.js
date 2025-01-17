import GeoAdminLayer from '@/api/layers/GeoAdminLayer.class'
import LayerTypes from '@/api/layers/LayerTypes.enum'

/** Metadata for a tiled image layers (WMTS stands for Web Map Tile Service) */
export default class WMTSLayer extends GeoAdminLayer {
    /**
     * @param {String} name Layer name (internationalized)
     * @param {String} id Unique layer ID used in our backend
     * @param {Number} opacity Opacity value between 0.0 (transparent) and 1.0 (visible)
     * @param {String} attributionName Name of the data owner of this layer (can be displayed as is in the UI)
     * @param {String} attributionUrl Link to the data owner website (if there is one)
     * @param {String} format Image format for this WMTS layer (jpeg or png)
     * @param {LayerTimeConfig} timeConfig Settings telling which timestamp has to be used when
     *   request tiles to the backend
     * @param {Boolean} isBackground If this layer should be treated as a background layer
     * @param {String} baseURL The base URL to be used to request tiles (can use the {0-9} notation
     *   to describe many available backends)
     * @param {Boolean} isHighlightable Tells if this layer possess features that should be
     *   highlighted on the map after a click (and if the backend will provide valuable information
     *   on the {@link http://api3.geo.admin.ch/services/sdiservices.html#identify-features} endpoint)
     * @param {Boolean} hasTooltip Define if this layer shows tooltip when clicked on
     * @param {String[]} topics All the topics in which belongs this layer
     */
    constructor(
        name = '',
        id = '',
        opacity = 1.0,
        attributionName,
        attributionUrl,
        format = 'png',
        timeConfig = null,
        isBackground = false,
        baseURL = null,
        isHighlightable = false,
        hasTooltip = false,
        topics = []
    ) {
        super(
            name,
            LayerTypes.WMTS,
            id,
            opacity,
            attributionName,
            attributionUrl,
            isBackground,
            baseURL,
            isHighlightable,
            hasTooltip,
            topics
        )
        this.format = format
        this.timeConfig = timeConfig
    }

    /** @returns {String} A XYZ type URL to request this WMTS layer's tiles */
    getURL() {
        return `${this.baseURL}1.0.0/${this.getID()}/default/${
            this.timeConfig.currentTimestamp
        }/3857/{z}/{x}/{y}.${this.format}`
    }
}
