<template>
    <button
        class="geoloc-button"
        type="button"
        :class="{ active: isActive, disabled: isDenied }"
        :title="isActive ? $t('geoloc_stop_tracking') : $t('geoloc_start_tracking')"
        data-cy="geolocation-button"
    >
        <svg xmlns="http://www.w3.org/2000/svg" y="0" x="0">
            <ellipse class="geoloc-button-inner-circle" />
        </svg>
    </button>
</template>

<script>
export default {
    props: {
        isActive: {
            type: Boolean,
            required: true,
        },
        isDenied: {
            type: Boolean,
            required: true,
        },
    },
}
</script>

<style lang="scss" scoped>
@import 'src/scss/webmapviewer-bootstrap-theme';

$normal-color: $map-button-border-color;
$active-color: $primary;
$disabled-color: $gray-300;
$stroke-width: 9px;
$radius-circle: calc(($map-button-inner-icon-diameter / 2) - ($stroke-width / 2));
.geoloc-button {
    padding: 0;
    border: none;
    height: $map-button-diameter;
    width: $map-button-diameter;
    border-radius: $map-button-diameter * 0.5;
    background-color: $normal-color;
    overflow: hidden;
    cursor: pointer;
    svg {
        overflow: initial;
        position: relative;
        top: $map-button-diameter * 0.5;
        left: $map-button-diameter * 0.5;
        height: $map-button-diameter;
    }
    .geoloc-button-inner-circle {
        stroke: $white;
        fill: $normal-color;
        stroke-width: $stroke-width;
        rx: $radius-circle;
        ry: $radius-circle;
    }
    &:hover {
        background-color: $map-button-hover-border-color;
    }
    &.active {
        background-color: $active-color;
        .geoloc-button-inner-circle {
            fill: $active-color;
        }
    }
    &.disabled {
        opacity: 0.8;
        .geoloc-button-inner-circle {
            stroke: $disabled-color;
        }
    }
}
</style>
