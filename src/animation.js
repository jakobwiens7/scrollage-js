// Dependencies
import EasingFuncs from './easing.js';
import { splitValueUnit } from './utils.js';


// Animation default values
export const animationDefaults = {
    move: {
        axis: 'y', 		// string 'x', 'y', 'xy'
        startY: 0, 		// num || string '100%', '100px'
        endY: 100,		// num || string '100%', '100px'
        startX: 0, 		// num || string '100%', '100px'
        endX: 100, 		// num || string '100%', '100px'
        easing: false,
        responsive: false
    },
    rotate: {
        axis: 'z', 		// string 'x', 'y', 'z', 'xy', 'xz', 'yz', 'xyz'
        start: 0,		// num
        end: 360,		// num
        easing: false,
        responsive: false
    },
    scale: {
        axis: 'xy', 	// string 'x', 'y', 'xy'
        start: 0,		// num
        end: 100,		// num
        easing: false,
        responsive: false
    },
    fade: {
        start: 0,		// num 0 - 100
        end: 100,		// num 0 - 100
        easing: false,
        responsive: false
    },
    blur: {
        start: 0,		// num 0 - 100
        end: 100,		// num 0 - 100
        responsive: false
    }
}

/**
 * Extracts animation data attributes from an element and returns a structured animation configuration.
 *
 * @param {HTMLElement} el - The element from which animation data attributes are extracted.
 * 
 * @returns {Array<Object>} - An array of animation objects, each containing a specific animation type and its properties.
 */
export function setAnimationData(el) {
    var dataAnimationMove = el.getAttribute( 'data-scrollage-move' );
    var dataAnimationRotate = el.getAttribute( 'data-scrollage-rotate' );
    var dataAnimationScale = el.getAttribute( 'data-scrollage-scale' );
    var dataAnimationFade = el.getAttribute( 'data-scrollage-fade' );
    var dataAnimationBlur = el.getAttribute( 'data-scrollage-blur' );

    var animations = [];
    if (dataAnimationMove && dataAnimationMove !== 'false') {
        animations.push({
            move: {	...animationDefaults.move, ...JSON.parse(dataAnimationMove) }
        });
    }
    if (dataAnimationRotate && dataAnimationRotate !== 'false') {
        animations.push({
            rotate: { ...animationDefaults.rotate, ...JSON.parse(dataAnimationRotate)	},
        });
    }
    if (dataAnimationScale && dataAnimationScale !== 'false') {
        animations.push({
            scale: { ...animationDefaults.scale,	...JSON.parse(dataAnimationScale) }
        });
    }
    if (dataAnimationFade && dataAnimationFade !== 'false') {
        animations.push({
            fade: {	...animationDefaults.fade, ...JSON.parse(dataAnimationFade) }
        });
    }
    if (dataAnimationBlur && dataAnimationBlur !== 'false') {
        animations.push({
            blur: {	...animationDefaults.blur, ...JSON.parse(dataAnimationBlur) }
        });
    }
    return animations;
}


// Applies easing if enabled and returns calculated animation value
export function getAnimationProgress(start, end, progress = 0, easing = false ) {
    if (easing && typeof easing === 'string') {
        progress = EasingFuncs[easing](progress);
    }
    return Math.round( start + (end - start) * progress );
}


// Animation move
export function move(animationData, progress, targetSize, breakpoint) {
    let valueX = 0,
        valueY = 0;

    if (animationData.axis.toLowerCase().includes('x')) {
        let startX = 0,
            endX = 100;

        if (animationData.startX !== 0) {
            let startXValue = splitValueUnit(animationData.startX)?.value || 0;
            let startXUnit = splitValueUnit(animationData.startX)?.unit || '%';

            if (animationData.responsive[breakpoint]?.startX) {
                startXValue = splitValueUnit(animationData.responsive[breakpoint].startX)?.value || 0;
                startXUnit = splitValueUnit(animationData.responsive[breakpoint].startX)?.unit || '%';
            }
            startX = (startXUnit == 'px' ? startXValue*100 : targetSize * startXValue);
        }
        if (animationData.endX !== 0) {
            let endXValue = splitValueUnit(animationData.endX)?.value || 0;
            let endXUnit = splitValueUnit(animationData.endX)?.unit || '%';

            if (animationData.responsive[breakpoint]?.endX) {
                endXValue = splitValueUnit(animationData.responsive[breakpoint].endX)?.value || 0;
                endXUnit = splitValueUnit(animationData.responsive[breakpoint].endX)?.unit || '%';
            }
            endX = (endXUnit == 'px' ? endXValue*100 : targetSize * endXValue);
        }
        valueX = getAnimationProgress(startX, endX, progress, animationData.easing) / 100;
    }

    if (animationData.axis.toLowerCase().includes('y')) {
        let startY = 0,
            endY = 100;

        if (animationData.startY !== 0) {
            let startYValue = splitValueUnit(animationData.startY)?.value || 0;
            let startYUnit = splitValueUnit(animationData.startY)?.unit || '%';

            if (animationData.responsive[breakpoint]?.startY) {
                startYValue = splitValueUnit(animationData.responsive[breakpoint]?.startY)?.value || 0;
                startYUnit = splitValueUnit(animationData.responsive[breakpoint]?.startY)?.unit || '%';
            }
            startY = (startYUnit == 'px' ? startYValue*100 : targetSize * startYValue);
        }
        if (animationData.endY !== 0) {
            let endYValue = splitValueUnit(animationData.endY)?.value || 0;
            let endYUnit = splitValueUnit(animationData.endY)?.unit || '%';

            if (animationData.responsive[breakpoint]?.endY) {
                startYValue = splitValueUnit(animationData.responsive[breakpoint]?.endY)?.value || 0;
                startYUnit = splitValueUnit(animationData.responsive[breakpoint]?.endY)?.unit || '%';
            }
            endY = (endYUnit == 'px' ? endYValue*100 : targetSize * endYValue);
        }
        valueY = getAnimationProgress(startY, endY, progress, animationData.easing) / 100;
    }

    return 'translate:' + valueX + 'px ' + valueY + 'px';
}


// Animation rotate
export function rotate(animationData, progress) {
    let value = getAnimationProgress(animationData.start, animationData.end, progress, animationData.easing);

    if ('z' !== animationData.axis.toLowerCase()) {
        let axis = animationData.axis.toLowerCase().split('');
        return 'rotate:' + (axis.includes('x') ? 1 : 0) 
                + ' ' + (axis.includes('y') ? 1 : 0) 
                + ' ' + (axis.includes('z') ? 1 : 0) 
                + ' ' + (value + 'deg');
    } else {
        return 'rotate:' + value + 'deg';
    }
}

// Animation scale
export function scale(animationData, progress) {
    let value = getAnimationProgress(animationData.start, animationData.end,progress, animationData.easing) / 100;

    if ('xy' !== animationData.axis.toLowerCase()) {
        return 'scale:' + ('x' == animationData.axis.toLowerCase() ? value : 1) 
                + ' ' + ('y' == animationData.axis.toLowerCase() ? value : 1);
    } else {
        return 'scale:' + value;
    }
}

// Animation fade
export function fade(animationData, progress) {
    let value = getAnimationProgress(animationData.start, animationData.end, progress, animationData.easing) / 100;
    return 'opacity:' + value;
}

// Animation blur
export function blur(animationData, progress) {
    let value = getAnimationProgress(animationData.start, animationData.end, progress);
    return 'filter:blur(' + value + 'px)';
}
