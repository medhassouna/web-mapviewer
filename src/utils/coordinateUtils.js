import proj4 from 'proj4'

import { formatThousand, round } from './numberUtils'
import { forward as LLtoMGRS, LLtoUTM, toPoint as mgrsToWGS84 } from './militaryGridProjection'
import log from './logging'
import { toStringHDMS, format } from 'ol/coordinate'

// 47.5 7.5
const REGEX_WEB_MERCATOR = /^\s*([\d]{1,3}[.\d]+)\s*[ ,/]+\s*([\d]{1,3}[.\d]+)\s*$/i
// 47°31.8' 7°31.8'
const REGEX_MERCATOR_WITH_DEGREES =
    /^\s*([\d]{1,3})[° ]+([\d]+[.,]?[\d]*)[']?\s*[,/]?\s*([\d]{1,3})[° ]+([\d.,]+)[']?\s*$/i
// 47°38'48'' 7°38'48'' or 47°38'48" 7°38'48"
const REGEX_MERCATOR_WITH_DEGREES_MINUTES =
    /^\s*([\d]{1,3})[° ]+([\d]{1,2})[' ]+([\d.]+)['"]{0,2}\s*[,/]?\s*([\d]{1,3})[° ]+([\d.]+)[' ]+([\d.]+)['"]{0,2}\s*$/i
// 47°38'48''N 7°38'48''E or 47°38'48"N 7°38'48"E
const REGEX_MERCATOR_WITH_DEGREES_MINUTES_AND_CARDINAL_POINT =
    /^\s*([\d]{1,3})[° ]+\s*([\d]{1,2})[' ]+\s*([\d.]+)['"]*([NSEW]?)\s*[,/]?\s*([\d]{1,3})[° ]+\s*([\d.]+)[' ]+\s*([\d.]+)['"]*([NSEW]?)\s*$/i

// LV95, LV03, metric WebMercator (EPSG:3857)
const REGEX_METRIC_COORDINATES =
    /^\s*([\d]{1,3}[ ']?[\d]{1,3}[ ']?[\d.]{3,})[\t ,./]+([\d]{1,3}[ ']?[\d]{1,3}[ ']?[\d.]{3,})/i

// Military Grid Reference System (MGRS)
const REGEX_MILITARY_GRID = /^3[123][\sa-z]{3}[\s\d]*/i

const WGS84_BOUNDS = {
    x: {
        // lon
        lower: -180.0,
        upper: 180.0,
    },
    y: {
        // lat
        lower: -89.0,
        upper: 89.0,
    },
}
const LV95_BOUNDS = {
    x: {
        lower: 2485071.58,
        upper: 2828515.82,
    },
    y: {
        lower: 1075346.31,
        upper: 1299941.79,
    },
}
const LV03_BOUNDS = {
    x: {
        lower: 485071.54,
        upper: 828515.78,
    },
    y: {
        lower: 75346.36,
        upper: 299941.84,
    },
}
const isInBounds = (x, y, bounds) =>
    x > bounds.x.lower && x < bounds.x.upper && y > bounds.y.lower && y < bounds.y.upper

/**
 * Attempts to re-project given coordinates to WebMercator (WGS84). Will return a tuple containing
 * [lat, lon] even if input is given as [lon, lat] (as this is what OpenLayers wants to be fed.
 *
 * This function supports input from LV95, LV03 or WebMercator input (no other projection supported)
 *
 * @param x {Number} X part of the coordinate (Easting/Longitude)
 * @param y {Number} Y part of the coordinate (Northing/Latitude)
 * @returns {Number[]} Re-projected coordinate as [lat, lon], or undefined if the input was not
 *   convertible to WebMercator
 */
export const reprojectUnknownSrsCoordsToWebMercator = (x, y) => {
    // guessing if this is already WGS84 or a Swiss projection (if so we need to reproject it to WGS84)
    // checking LV95 bounds
    if (isInBounds(x, y, LV95_BOUNDS)) {
        return proj4('EPSG:2056', proj4.WGS84, [x, y])
        // checking LV95 backward
    } else if (isInBounds(y, x, LV95_BOUNDS)) {
        return proj4('EPSG:2056', proj4.WGS84, [y, x])
        // checking LV03 bounds
    } else if (isInBounds(x, y, LV03_BOUNDS)) {
        return proj4('EPSG:21781', proj4.WGS84, [x, y])
        // checking LV03 backward
    } else if (isInBounds(y, x, LV03_BOUNDS)) {
        return proj4('EPSG:21781', proj4.WGS84, [y, x])
        // checking for WGS84 bounds
    } else if (isInBounds(x, y, WGS84_BOUNDS)) {
        // we inverse lat/lon to lon/lat as user inputs support lat/lon but the app behind function with lon/lat
        // coordinates, especially proj4js
        return [y, x]
    } else if (isInBounds(y, x, WGS84_BOUNDS)) {
        // if it's already a lat/lon we return it as is
        return [x, y]
    } else {
        log.debug(`Unknown coordinate type [${x}, ${y}]`)
        return undefined
    }
}

const numericalExtractor = (regexMatches) => {
    // removing thousand separators
    const x = Number(regexMatches[1].replace(/[' ]/g, ''))
    const y = Number(regexMatches[2].replace(/[' ]/g, ''))
    if (Number.isNaN(x) || Number.isNaN(y)) {
        return undefined
    }
    return reprojectUnknownSrsCoordsToWebMercator(x, y)
}

const webmercatorExtractor = (regexMatches) => {
    if (regexMatches.length === 3) {
        // 2 matches + global match i.e. : (45.12), (7.12)
        return numericalExtractor(regexMatches)
    }
    let lon, lat
    if (regexMatches.length === 5) {
        // 4 matches + global match, i.e. : (47)°(5.123)', (8)°(4.154)' (we inverse lat/lon to lon/lat in the process)
        lon = Number(regexMatches[3]) + Number(regexMatches[4]) / 60.0
        lat = Number(regexMatches[1]) + Number(regexMatches[2]) / 60.0
    }
    if (regexMatches.length === 7) {
        // 6 matches + global match, i.e. : (47)°(5)'(41.61)", (8)°(4)'(6.32)" (we inverse lat/lon to lon/lat in the process)
        lon =
            Number(regexMatches[4]) +
            Number(regexMatches[5]) / 60.0 +
            Number(regexMatches[6]) / 3600.0
        lat =
            Number(regexMatches[1]) +
            Number(regexMatches[2]) / 60.0 +
            Number(regexMatches[3]) / 3600.0
    }
    if (regexMatches.length === 9) {
        // 8 matches + global match, i.e. (47)°(5)'(41.61)"(N), (8)°(4)'(6.32)"(E)
        const firstNumber =
            Number(regexMatches[1]) +
            Number(regexMatches[2]) / 60.0 +
            Number(regexMatches[3]) / 3600.0
        const firstCardinal = regexMatches[4]
        const secondNumber =
            Number(regexMatches[5]) +
            Number(regexMatches[6]) / 60.0 +
            Number(regexMatches[7]) / 3600.0
        const secondCardinal = regexMatches[8]
        switch (firstCardinal.toUpperCase()) {
            case 'N':
                lat = firstNumber
                break
            case 'S':
                lat = -firstNumber
                break
            case 'E':
                lon = firstNumber
                break
            case 'W':
                lon = -firstNumber
                break
        }
        switch (secondCardinal.toUpperCase()) {
            case 'N':
                lat = secondNumber
                break
            case 'S':
                lat = -secondNumber
                break
            case 'E':
                lon = secondNumber
                break
            case 'W':
                lon = -secondNumber
                break
        }
    }
    if (lon && lat && isInBounds(lon, lat, WGS84_BOUNDS)) {
        return [lon, lat]
    }
    return null
}

// copied from https://github.com/geoadmin/mf-geoadmin3/blob/f421edcbb216d6a7e27e483b504616d99a475d0b/src/components/search/SearchService.js#L122
// Grid zone designation for Switzerland + two 100km letters + two digits
// It's a limitation of proj4 and a sensible default (precision is 10km)
const MGRSMinimalPrecision = 7
const mgrsExtractor = (regexMatches) => {
    const mgrsString = regexMatches[0].split(' ').join('')
    if ((mgrsString.length - MGRSMinimalPrecision) % 2 === 0) {
        return mgrsToWGS84(mgrsString)
    }
    return null
}

const executeAndReturn = (
    regex,
    text,
    extractor = numericalExtractor,
    outputProjection,
    decimals
) => {
    if (typeof text !== 'string') {
        return undefined
    }

    const matches = regex.exec(text)
    if (matches) {
        const extractedCoordinates = extractor(matches)
        if (!extractedCoordinates) {
            return undefined
        }
        const projectedResult = proj4(proj4.WGS84, outputProjection, extractedCoordinates)
        return [round(projectedResult[0], decimals), round(projectedResult[1], decimals)]
    }
    return undefined
}

/**
 * Extracts (if possible) a set of coordinates from the text as an array. The text must contains
 * only a coordinates and nothing else, otherwise undefined will be returned.
 *
 * E.G. `'47.1, 7.5'` is valid and will return `[47.1, 7.5]` but `'lat:47.1, lon:7.5'` will fail and
 * return `undefined`.
 *
 * Separators ------------------------------------------------ To separates the two numerical
 * values, a combination of slashes, spaces (tabs included) or a coma can be used.
 *
 * Accepted formats ------------------------------------------------ **CH1903+ / LV95**
 *
 * - With or without thousand separator (`2'600'000 1'200'000` or `2600000 1200000`)
 * - *CH1903 / LV03**
 * - With or without thousand separator (`600'000 200'000` or `600000 200000`)
 * - *WGS84 (Web Mercator)**
 * - Numerical (`46.97984 6.60757`)
 * - DegreesMinutes (`46°58.7904' 6°36.4542'`)
 * - DegreesMinutesSeconds, double single quote for seconds (`46°58'47.424'' 6°36'27.252''`)
 * - DegreesMinutesSeconds, double quote for seconds (`46°58'47.424" 6°36'27.252"`)
 * - Google style is also supported (any format above without degrees, minutes and seconds symbol)
 * - *Military Grid Reference System (MGRS)**
 * - I.e. `32TLT 98757 23913`
 * - *what3words**
 * - I.e. `zufall.anders.blaumeise`
 *
 * @param {String} text The text in which we want to find coordinates
 * @param {String} toProjection Projection wanted for the output coordinates (default: EPSG:3857)
 * @param {Number} roundingToDecimal How many decimals should stay in the final coordinates (default: 1)
 * @returns {Number[]} Coordinates in the given order in text in the wanted projection, or
 *   `undefined` if nothing was found
 */
export const coordinateFromString = (text, toProjection = 'EPSG:3857', roundingToDecimal = 1) => {
    if (typeof text !== 'string') {
        return undefined
    }
    // creating a config array with each entry being an object with a regex attribute
    // and the corresponding extractor when this regex matches the input
    return [
        { regex: REGEX_WEB_MERCATOR, extractor: webmercatorExtractor },
        { regex: REGEX_METRIC_COORDINATES, extractor: numericalExtractor },
        { regex: REGEX_MERCATOR_WITH_DEGREES, extractor: webmercatorExtractor },
        {
            regex: REGEX_MERCATOR_WITH_DEGREES_MINUTES,
            extractor: webmercatorExtractor,
        },
        {
            regex: REGEX_MERCATOR_WITH_DEGREES_MINUTES_AND_CARDINAL_POINT,
            extractor: webmercatorExtractor,
        },
        { regex: REGEX_MILITARY_GRID, extractor: mgrsExtractor },
    ]
        .map((config) => {
            // going through each config and extracting the result (can be undefined if not a match)
            return executeAndReturn(
                config.regex,
                text.replace(/\t/, ' '),
                config.extractor,
                toProjection,
                roundingToDecimal
            )
        })
        .find((result) => Array.isArray(result)) // returning the first value that is a coordinate array (will return undefined if nothing is found)
}

/** @enum */
export const getCentroid = function (...coordinates) {
    const points = [...coordinates]
    if (points.length < 2) {
        return null
    }
    // adaptation of formula from https://en.wikipedia.org/wiki/Centroid#Of_a_polygon
    const first = points[0]
    const last = points[points.length - 1]
    if (first[0] !== last[0] || first[1] !== last[1]) {
        points.push(first)
    }
    let twiceArea = 0
    let x = 0
    let y = 0
    let nPts = points.length
    let p1
    let p2
    let f
    for (let i = 0, j = nPts - 1; i < nPts; j = i++) {
        p1 = points[i]
        p2 = points[j]
        f = p1[0] * p2[1] - p2[0] * p1[1]
        twiceArea += f
        x += (p1[0] + p2[0]) * f
        y += (p1[1] + p2[1]) * f
    }
    f = twiceArea * 3
    return [x / f, y / f]
}

/**
 * Returns rounded coordinate with thousand separator and comma.
 *
 * @param {[Number, Number]} coordinate The raw coordinate as array.
 * @param {Number} digit Decimal digits to round to.
 * @returns {String} Formatted coordinate.
 * @see {@link https://stackoverflow.com/a/2901298/4840446}
 */
export function toStringCH(coordinate, digits) {
    return coordinate
        .map((value) => value.toFixed(digits))
        .map((value) => formatThousand(value))
        .join(', ')
        .replace(/\B(?=(\d{3})+(?!\d))/g, "'")
}

/**
 * Representation of many different (available in this app) projection systems
 *
 * @enum
 */
export const CoordinateSystems = {
    LV95: {
        id: 'LV95',
        epsg: 'EPSG:2056',
        label: 'CH1903+ / LV95',
        format(coordinate) {
            return toStringCH(coordinate, 1)
        },
    },
    LV03: {
        id: 'LV03',
        epsg: 'EPSG:21781',
        label: 'CH1903 / LV03',
        format(coordinate) {
            return toStringCH(coordinate, 1)
        },
    },
    WGS84: {
        id: 'WGS84',
        epsg: 'EPSG:4326',
        label: 'WGS84',
        format(coordinate) {
            return `${toStringHDMS(coordinate, 2)} (${format(coordinate, '{y}, {x}', 5)})`
        },
    },
    UTM: {
        id: 'UTM',
        epsg: 'EPSG:4326',
        label: 'UTM',
        format(coordinate) {
            let c = LLtoUTM({ lat: coordinate[1], lon: coordinate[0] })
            return [
                formatThousand(c.easting),
                formatThousand(c.northing),
                `(${c.zoneNumber}${c.zoneLetter})`,
            ].join(' ')
        },
    },
    MGRS: {
        id: 'MGRS',
        epsg: 'EPSG:4326',
        label: 'MGRS',
        format(coordinate) {
            // The replace is used to have a space between the numbers
            return LLtoMGRS(coordinate, 5)
                .replace(/(.{5})/g, '$1 ')
                .trim()
        },
    },
}

/**
 * @param coordinates {Number[]}
 * @param coordinateSystem {CoordinateSystems}
 * @returns {string}
 */
export const printHumanReadableCoordinates = (
    coordinates,
    coordinateSystem = CoordinateSystems.LV95
) => {
    return coordinateSystem.format(coordinates)
}
