<template>
    <ul
        class="feature-list"
        :class="{ 'feature-list-row': direction === 'row' }"
        data-cy="highlighted-features"
    >
        <!-- eslint-disable vue/no-v-html-->
        <li
            v-for="(feature, index) in features"
            :key="generateFeatureIdForList(feature, index)"
            class="feature-list-item"
            data-infobox="height-reference"
            v-html="feature.htmlPopup"
        />
        <!-- eslint-enable vue/no-v-html-->
    </ul>
</template>

<script>
import { mapState } from 'vuex'

export default {
    props: {
        direction: {
            type: String,
            default: 'row',
            validator: (value) => ['row', 'column'].includes(value),
        },
    },
    computed: {
        ...mapState({
            features: (state) =>
                state.features.selectedFeatures.filter((feature) => !feature.isEditable),
        }),
    },
    methods: {
        generateFeatureIdForList(feature, indexInList) {
            let featureId = feature.id || indexInList
            if (feature.layer) {
                featureId = `${feature.layer.id}-${featureId}`
            }
            return featureId
        },
    },
}
</script>

<style lang="scss">
@import 'src/scss/media-query.mixin';

.feature-list {
    margin: 0;
    padding: 0;
    list-style: none;

    &-row {
        display: grid;
        // on mobile (default size) only one column
        // see media query under for other screen sizes
        grid-template-columns: 1fr;
        grid-gap: 8px;
    }
}

@include respond-above(md) {
    .feature-list-row {
        // with screen larger than 768px we can afford to have two tooltip side by side
        grid-template-columns: 1fr 1fr;
    }
}
@include respond-above(lg) {
    .feature-list-row {
        // with screen larger than 992px we can place 3 tooltips
        grid-template-columns: 1fr 1fr 1fr;
    }
}
@include respond-above(xl) {
    .feature-list-row {
        // anything above 1200px will have 4 tooltips in a row
        grid-template-columns: 1fr 1fr 1fr 1fr;
    }
}

// Styling for external HTML content
.htmlpopup-container {
    width: 100%;
    font-size: 11px;
    text-align: start;
}
.htmlpopup-header {
    background-color: #e9e9e9;
    padding: 7px;
    margin-bottom: 7px;
    font-weight: 700;
}
.htmlpopup-content table {
    width: 100%;
    border: 0;
    margin: 0 7px;
}
</style>
