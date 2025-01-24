<template>
    <slot />
</template>

<script>
import { extractOpenLayersFeatureCoordinates } from '@/modules/drawing/lib/drawingUtils'
import { editingFeatureStyleFunction } from '@/modules/drawing/lib/style'
import { noModifierKeys, singleClick } from 'ol/events/condition'
import ModifyInteraction from 'ol/interaction/Modify'
import { DRAWING_HIT_TOLERANCE } from '@/config'

const cursorGrabbingClass = 'cursor-grabbing'

/**
 * Will enable the user to edit selected features by drag and dropping part of it on the map. Will
 * also enable point deletion with a right click.
 *
 * This component needs to have access to the selected features from the select interaction (it gets
 * them through a provide/inject coupling)
 *
 * It will emit those events :
 *
 * - `featureIsDragged`: whenever a feature has been dragged and is being moved by the user over the map
 * - `featureIsDropped`: when the dragged feature is released, will give both the feature and the
 *   coordinates of the drop location in args (as an object `{ feature: {}, coordinates: [] }`)
 *
 *   - `modifyEnd`: when an edit has finished (not necessarily a drag and drop, can also be a point deletion)
 */
export default {
    inject: ['getMap', 'getSelectInteraction'],
    props: {
        selectedFeatures: {
            type: Array,
            required: true,
        },
    },
    emits: ['featureIsDragged', 'featureIsDropped', 'modifyEnd'],
    mounted() {
        this.modifyInteraction = new ModifyInteraction({
            // here we can't have the whole drawing layers features (or source)
            // otherwise non-selected features will be editable anytime
            features: this.getSelectInteraction().getFeatures(),
            style: editingFeatureStyleFunction,
            deleteCondition: (event) => noModifierKeys(event) && singleClick(event),
            // This enables click on the shape of features (instead of pixel tolerance from their coordinates)
            hitDetection: true,
            // This seems to be calculated differently than the hitTolerance properties of SelectInteraction
            // and forEachFeatureAtPixel. That's why we have to manually correct the value here.
            pixelTolerance: DRAWING_HIT_TOLERANCE + 2,
        })
        this.modifyInteraction.on('modifystart', this.onModifyStart)
        this.modifyInteraction.on('modifyend', this.onModifyEnd)
        this.getMap().addInteraction(this.modifyInteraction)
    },
    unmounted() {
        this.getMap().removeInteraction(this.modifyInteraction)
        this.modifyInteraction.un('modifyend', this.onModifyEnd)
        this.modifyInteraction.un('modifystart', this.onModifyStart)
        this.modifyInteraction = null
    },
    methods: {
        getSelectedFeatureCorrespondingToOpenLayersFeature(openLayersFeature) {
            return this.selectedFeatures.find(
                (feature) => feature.id === `drawing_feature_${openLayersFeature.getId()}`
            )
        },
        onModifyStart(event) {
            const [feature] = event.features.getArray()

            if (feature) {
                const correspondingStoreFeature =
                    this.getSelectedFeatureCorrespondingToOpenLayersFeature(feature)
                if (correspondingStoreFeature) {
                    this.$emit('featureIsDragged', correspondingStoreFeature)
                }
                this.getMap().getTarget().classList.add(cursorGrabbingClass)
            }
        },
        onModifyEnd(event) {
            if (!event.features) {
                return
            }

            const [feature] = event.features.getArray()

            if (feature) {
                const correspondingStoreFeature =
                    this.getSelectedFeatureCorrespondingToOpenLayersFeature(feature)
                if (correspondingStoreFeature) {
                    this.$emit('featureIsDropped', {
                        feature: correspondingStoreFeature,
                        coordinates: extractOpenLayersFeatureCoordinates(feature),
                    })
                }
                this.getMap().getTarget().classList.remove(cursorGrabbingClass)
                this.$emit('modifyEnd', feature)
            }
        },
    },
}
</script>
