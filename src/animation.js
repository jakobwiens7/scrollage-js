// Dependencies
import EasingFuncs from './easing.js';
import { splitValueUnit, calculateUnitValue, roundValue, safeParseJSON } from './utils.js';


// Animation default values
// TO-DO: skew, box-shadow, text-shadow, color, bgColor/bgGradient?
const ANIMATION_DEFAULTS = {
    move: {
        x: {
            start: { unit: '%', value: 0 },
            end: { unit: '%', value: 0 }
        },
        y: {
            start: { unit: '%', value: 0 },
            end: { unit: '%', value: 0 }
        },
        easing: false,
        responsive: null
    },
    rotate: {
        start: { value: 0 },
        end: { value: 0 },
        x: {
            start: { value: 0 },
            end: { value: 0 }
        },
        y: {
            start: { value: 0 },
            end: { value: 0 }
        },
        z: {
            start: { value: 0 },
            end: { value: 0 }
        },
        easing: false,
        responsive: null
    },
    scale: {
        start: { value: 100 },
        end: { value: 100 },
        x: {
            start: { value: 100 },
            end: { value: 100 }
        },
        y: {
            start: { value: 100 },
            end: { value: 100 }
        },
        z: {
            start: { value: 100 },
            end: { value: 100 }
        },
        easing: false,
        responsive: null
    },
    fade: {
        start: { value: 100 },
        end: { value: 100 },
        easing: false,
        responsive: null
    },
    saturate: {
        start: { value: 100 },
        end: { value: 100 },	
        responsive: null
    },
    blur: {
        start: { value: 0 },
        end: { value: 0 },	
        responsive: null
    }
}


/**
 * Extracts and structures start and end values for animation properties.
 *
 * This function processes an object containing movement values (startX, endX, startY, endY, etc.)
 * and returns a structured format containing extracted values with proper defaults.
 *
 * @param {Object} obj - The object containing animation data.
 * @param {Object} defaultObj - The object containing default values for fallback.
 * 
 * @returns {Object} - A structured object with extracted start and end values.
 */
function extractStartEndData(obj, defaultObj) {
    
    // Normalize object keys: Convert all keys to lowercase
    const normalizedObj = Object.keys(obj).reduce((acc, key) => {
        acc[key.toLowerCase()] = obj[key];
        return acc;
    }, {});

    // Process top-level 'start' or 'end' properties and return immediately
    if ('start' in normalizedObj || 'end' in normalizedObj) {
        return {
            start: 'start' in normalizedObj ? splitValueUnit(normalizedObj.start) : defaultObj.start,
            end: 'end' in normalizedObj ? splitValueUnit(normalizedObj.end) : defaultObj.end
        };
    }

    // Process axis-based values (x, y, z)
    const axes = ['x', 'y', 'z'];
    const newObj = {}

    for (const axis of axes) {
        if (defaultObj[axis] && (normalizedObj[`start${axis}`] || normalizedObj[`end${axis}`])) {
            newObj[axis] = {
                start: normalizedObj[`start${axis}`]
                    ? splitValueUnit(normalizedObj[`start${axis}`]) 
                    : defaultObj[axis].start,

                end: normalizedObj[`end${axis}`]
                    ? splitValueUnit(normalizedObj[`end${axis}`]) 
                    : defaultObj[axis].end
            };
        }
    }
    return newObj;
}


/**
 * Extracts animation data attributes from an element and returns a structured animation configuration.
 *
 * @param {HTMLElement} el - The element from which animation data attributes are extracted.
 * 
 * @returns {Array<Object>} - An array of animation objects, each containing a specific animation type and its properties.
 */
export function getAnimationData(el) {
    const animations = [];
    const animationTypes = Object.keys(ANIMATION_DEFAULTS);

    for (const type of animationTypes) {
        const attrName = `data-scrollage-${type}`;
        const data = el.getAttribute(attrName);

        if (data) {
            const parsedData = safeParseJSON(data, attrName);
            const responsiveData = parsedData.responsive || {};

            // Extract responsive animation settings
            const responsiveConfig = Object.keys(responsiveData).reduce((acc, breakpoint) => {
                acc[breakpoint] = extractStartEndData(responsiveData[breakpoint], ANIMATION_DEFAULTS[type]);
                return acc;
            }, {});

            animations.push({
                [type]: {
                    ...extractStartEndData(parsedData, ANIMATION_DEFAULTS[type]),
                    responsive: Object.keys(responsiveData).length ? responsiveConfig : undefined,
                    easing: parsedData.easing || undefined
                }
            });
        }
    }

    return animations;
}


/**
 * Calculates the interpolated animation progress between a start and end value.
 *
 * - If an easing function is provided, it applies the easing to the progress.
 * - Ensures progress is clamped between `0` and `1` to prevent unexpected results.
 * - Uses `EasingFuncs` to retrieve the easing function safely.
 *
 * @param {number} start - The starting value of the animation.
 * @param {number} end - The ending value of the animation.
 * @param {number} [progress=0] - The current progress (between 0 and 1).
 * @param {string|false} [easing=false] - The easing function name (case-insensitive) or `false` for linear animation.
 * 
 * @returns {number} - The calculated interpolated value.
 */
function getAnimationProgress(start, end, progress = 0, easing = false ) {

    // Clamp progress between 0 and 1
    progress = Math.max(0, Math.min(1, progress));

    // Apply easing if provided and valid
    if (easing && EasingFuncs[easing.toLowerCase()]) {
        progress = EasingFuncs[easing.toLowerCase()](progress);
    }

    return start + (end - start) * progress;
}


/**
 * Calculates the transform `translate` values for an element.
 *
 * - Converts percentage-based movement values to pixel values relative to `rangeSize`.
 * - Uses `getAnimationProgress()` to interpolate movement based on scroll progress.
 *
 * @param {Object} animationData - The movement animation configuration.
 * @param {number} progress - The current animation progress (0 to 1).
 * @param {Object} rangeSize - The range dimensions used for percentage calculations.
 * @param {Object} elSize - The target element dimensions.
 * @param {Object} winSize - The window dimensions for vw/vh unit calculation.
 * 
 * @returns {string} - The computed `translate` CSS transformation string.
 */
export function move(animationData, progress, rangeSize, elSize, winSize) {

    const calculateMovement = (axis) => {
        if (!animationData[axis]) return 0;

        const { start, end } = animationData[axis];

        const startValue = calculateUnitValue(start.unit, start.value, winSize, rangeSize[axis], elSize[axis]);
        const endValue = calculateUnitValue(end.unit, end.value, winSize, rangeSize[axis], elSize[axis]);

        return getAnimationProgress(startValue, endValue, progress, animationData.easing);
    };

    const valueX = roundValue(calculateMovement('x'));
    const valueY = roundValue(calculateMovement('y'));

    return `translate(${valueX}px, ${valueY}px)`;
}


/**
 * Calculates the transform `rotate` values for an element.
 *
 * - Supports independent rotation on the X, Y, and Z axes.
 * - Uses `getAnimationProgress()` to interpolate rotation values based on scroll progress.
 *
 * @param {Object} animationData - The rotation animation configuration.
 * @param {number} progress - The current animation progress (0 to 1).
 * 
 * @returns {string} - The computed `transform` CSS property with rotations.
 */
export function rotate(animationData, progress) {
    const calculateRotation = (axis) => {
        if (!animationData[axis]) return null;
        
        return getAnimationProgress(
            animationData[axis].start.value,
            animationData[axis].end.value,
            progress,
            animationData.easing
        );
    };

    // Prioritize 'start' and 'end' values, if defined
    if (animationData.start && animationData.end) {
        const value = getAnimationProgress(animationData.start.value, animationData.end.value, progress, animationData.easing);
        return `rotate(${roundValue(value)}deg)`;
    }

    const rotations = [];
    if (animationData.x) rotations.push(`rotateX(${roundValue(calculateRotation('x'))}deg)`);
    if (animationData.y) rotations.push(`rotateY(${roundValue(calculateRotation('y'))}deg)`);
    if (animationData.z) rotations.push(`rotateZ(${roundValue(calculateRotation('z'))}deg)`);

    return rotations.join(' ');
}


/**
 * Calculates the CSS scale transform values for an element.
 *
 * - Supports independent scaling on the X, Y, and Z axes.
 * - Uses `getAnimationProgress()` to interpolate scale values based on scroll progress.
 * 
 * @param {Object} animationData - The scale animation configuration.
 * @param {number} progress - The current animation progress (0 to 1).
 * 
 * @returns {string} - The computed `transform` CSS property with scaling.
 */
export function scale(animationData, progress) {
    const calculateScale = (axis) => {
        if (!animationData[axis]) return null;
        
        return getAnimationProgress(
            animationData[axis].start.value/100,
            animationData[axis].end.value/100,
            progress,
            animationData.easing
        );
    };

    // Prioritize 'start' and 'end' values, if defined
    if (animationData.start && animationData.end) {
        const value = getAnimationProgress(animationData.start.value/100, animationData.end.value/100, progress, animationData.easing);
        return `scale(${ roundValue(value, 2) })`;
    }

    const scales = [];
    if (animationData.x) scales.push(`scaleX(${calculateScale('x')})`);
    if (animationData.y) scales.push(`scaleY(${calculateScale('y')})`);

    return scales.join(' ');
}


/**
 * Calculates the CSS opacity value for a fade animation.
 *
 * - Uses `getAnimationProgress()` to interpolate opacity based on scroll progress.
 *
 * @param {Object} animationData - The fade animation configuration.
 * @param {number} progress - The current animation progress (0 to 1).
 * 
 * @returns {string} - The computed `opacity` CSS property.
 */
export function fade(animationData, progress) {
    const value = getAnimationProgress(animationData.start.value, animationData.end.value, progress, animationData.easing);
    return roundValue(value / 100, 2);
}


/**
 * Calculates the CSS saturate filter value for a saturate animation.
 *
 * - Uses `getAnimationProgress()` to interpolate saturation based on scroll progress.
 *
 * @param {Object} animationData - The saturate animation configuration.
 * @param {number} progress - The current animation progress (0 to 1).
 * 
 * @returns {string} - The computed `filter: saturate(%)` CSS property.
 */
export function saturate(animationData, progress) {
    const value = getAnimationProgress(animationData.start.value, animationData.end.value, progress);
    return `saturate(${roundValue(value, 0)}%)`;
}


/**
 * Calculates the CSS blur filter value for a blur animation.
 *
 * - Uses `getAnimationProgress()` to interpolate blur intensity based on scroll progress.
 *
 * @param {Object} animationData - The blur animation configuration.
 * @param {number} progress - The current animation progress (0 to 1).
 * 
 * @returns {string} - The computed `filter: blur(px)` CSS property.
 */
export function blur(animationData, progress) {
    const value = getAnimationProgress(animationData.start.value, animationData.end.value, progress);
    return `blur(${roundValue(value, 0)}px)`;
}
