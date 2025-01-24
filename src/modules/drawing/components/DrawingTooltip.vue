<template>
    <!-- eslint-disable vue/no-v-html-->
    <div ref="drawingTooltip" class="drawing-tooltip" v-html="tooltipText" />
    <!-- eslint-enable vue/no-v-html-->
</template>

<script>
import Overlay from 'ol/Overlay'
import { pointWithinTolerance, getVertexCoordinates } from '@/modules/drawing/lib/drawingUtils'
import { DRAWING_HIT_TOLERANCE } from '@/config'
import { EditableFeatureTypes } from '@/api/features.api'

const cssPointer = 'cursor-pointer'
const cssGrab = 'cursor-grab'
const cssGrabbing = 'cursor-grabbing'

export default {
    inject: ['getMap', 'getDrawingLayer'],
    props: {
        currentDrawingMode: {
            type: String,
            default: null,
        },
        selectedFeatures: {
            type: Array,
            default: () => [],
        },
        currentlySketchedFeature: {
            type: Object,
            default: null,
        },
    },
    data() {
        return {
            tooltipText: '',
        }
    },
    created() {
        this.tooltipOverlay = new Overlay({
            offset: [15, 15],
            positioning: 'top-left',
            // so that the tooltip is not on top of the style popup (and its children popup)
            stopEvent: false,
            insertFirst: true,
        })
    },
    mounted() {
        this.tooltipOverlay.setElement(this.$refs.drawingTooltip)

        const map = this.getMap()
        map.addOverlay(this.tooltipOverlay)
        map.on('pointermove', this.onPointerMove)
    },
    beforeUnmount() {
        this.tooltipOverlay.setElement(null)

        const map = this.getMap()
        map.removeOverlay(this.tooltipOverlay)
        map.un('pointermove', this.onPointerMove)
    },
    methods: {
        updateTooltipText(translationKeys) {
            if (!Array.isArray(translationKeys)) {
                translationKeys = [translationKeys]
            }

            this.tooltipText = translationKeys
                .map((key) => key.toLowerCase())
                .map((key) => this.$i18n.t(key))
                .join('<br>')
        },
        onPointerMove(event) {
            // moving the tooltip with the mouse cursor
            this.tooltipOverlay.setPosition(event.coordinate)

            const map = this.getMap()
            const mapElement = map.getTarget()

            if (mapElement.classList.contains(cssGrabbing)) {
                mapElement.classList.remove(cssGrab)
                return
            }

            const drawingLayer = this.getDrawingLayer()

            // detecting features under the mouse cursor
            let hoveringSelectableFeature = false
            let hoveringSelectedFeature = false

            const hasFeatureSelected = this.selectedFeatures.length > 0
            // we only keep track of the first feature's info (the one on top of the stack)
            const selectedFeatureId = hasFeatureSelected
                ? this.selectedFeatures[0]?.id.replace('drawing_feature_', '')
                : null
            let featureUnderCursor

            map.forEachFeatureAtPixel(
                event.pixel,
                (feature) => {
                    // Keeping track that features are being hovered (even if not selected)
                    hoveringSelectableFeature = true

                    const isSelectedFeature =
                        hasFeatureSelected && selectedFeatureId === feature.getId()

                    hoveringSelectedFeature = hoveringSelectedFeature || isSelectedFeature
                    // subsequent features will be ignored as featureUnderCursor will already be set
                    if (!featureUnderCursor || isSelectedFeature) {
                        featureUnderCursor = feature
                    }
                },
                {
                    layerFilter: (layer) => layer === drawingLayer,
                    hitTolerance: DRAWING_HIT_TOLERANCE,
                }
            )

            const pointFeatureTypes = [EditableFeatureTypes.MARKER, EditableFeatureTypes.ANNOTATION]
            let drawingMode = featureUnderCursor?.get('drawingMode')
            let translationKeys

            if (hoveringSelectedFeature) {
                mapElement.classList.add(cssGrab)
                mapElement.classList.remove(cssPointer)

                let hoveringVertex = getVertexCoordinates(featureUnderCursor).some((coordinate) => {
                    let pixel = map.getPixelFromCoordinate(coordinate)
                    return pointWithinTolerance(pixel, event.pixel, DRAWING_HIT_TOLERANCE)
                })

                // Display a help tooltip when modifying
                if (hoveringVertex || pointFeatureTypes.includes(drawingMode)) {
                    translationKeys = `modify_existing_vertex_${drawingMode}`
                } else {
                    translationKeys = `modify_new_vertex_${drawingMode}`
                }
            } else if (hoveringSelectableFeature) {
                mapElement.classList.add(cssPointer)
                mapElement.classList.remove(cssGrab)

                // Display a help tooltip when selecting
                if (drawingMode) {
                    translationKeys = `select_feature_${drawingMode}`
                } else {
                    translationKeys = 'select_no_feature'
                }
            } else {
                mapElement.classList.remove(cssPointer)
                mapElement.classList.remove(cssGrab)

                drawingMode = this.currentDrawingMode

                // Display a help tooltip when drawing
                if (drawingMode) {
                    if (this.currentlySketchedFeature && !pointFeatureTypes.includes(drawingMode)) {
                        let hoveringFirstVertex = false
                        let hoveringLastVertex = false
                        // The last two coordinates seem to be some OL internal points we don't need.
                        let coordinates = getVertexCoordinates(this.currentlySketchedFeature).slice(
                            0,
                            -2
                        )

                        coordinates.some((coordinate, index) => {
                            let pixel = map.getPixelFromCoordinate(coordinate)
                            if (pointWithinTolerance(pixel, event.pixel, DRAWING_HIT_TOLERANCE)) {
                                hoveringFirstVertex = index === 0
                                hoveringLastVertex = index === coordinates.length - 1
                                // Abort loop. We have what we need.
                                return true
                            }
                        })

                        if (hoveringFirstVertex && coordinates.length > 2) {
                            translationKeys = `draw_snap_first_point_${drawingMode}`
                        } else if (hoveringLastVertex && coordinates.length > 1) {
                            translationKeys = `draw_snap_last_point_${drawingMode}`
                        } else {
                            translationKeys = `draw_next_${drawingMode}`
                        }

                        if (coordinates.length > 1) {
                            translationKeys = [translationKeys, 'draw_delete_last_point']
                        }
                    } else {
                        translationKeys = `draw_start_${drawingMode}`
                    }
                } else {
                    translationKeys = 'select_no_feature'
                }
            }

            this.updateTooltipText(translationKeys)
        },
    },
}
</script>

<style lang="scss" scoped>
.drawing-tooltip {
    background-color: rgba(140, 140, 140, 0.9);
    border-radius: 4px;
    color: white;
    padding: 2px 8px;
    font-size: 12px;
    pointer-events: none;
}
</style>