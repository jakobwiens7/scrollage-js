/**
 * Checks if the browser supports passive event listeners.
 *
 * This function attempts to define a passive property in an event listener options object.
 * If successful, it confirms support for passive event listeners.
 *
 * @returns {boolean} - `true` if passive event listeners are supported, otherwise `false`.
 */
export function supportsPassiveEvents() {
    let passiveSupported = false;
    try {
        const opts = Object.defineProperty({}, 'passive', {
            get: function() {
                passiveSupported = true;
            }
        });
        window.addEventListener("testPassive", null, opts);
        window.removeEventListener("testPassive", null, opts);
    } catch (e) {}
    return passiveSupported;
}


/**
 * Creates a debounced function that delays execution until after a set time.
 *
 * @param {Function} func - The function to debounce.
 * @param {number} [delay=100] - The delay time in milliseconds.
 * @returns {Function} - A debounced function.
 */
export function debounce(func, delay = 100) {
    let timer;
    return function(...args) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => func.apply(this, args), delay);
    };
}


/**
 * Splits a value (e.g., '50%' or '100px') into a numeric value and a unit.
 * 
 * @param {string} str - The value to split (e.g., '50%' or '100px').
 * 
 * @returns {Object} - An object containing the `value` (numeric value) and `unit` (unit).
 */
export function splitValueUnit(str) {
    if (typeof str === 'number') return { value: str };
    if (!str || typeof str !== 'string') return;

    let strSplit = str.match(/^([-.\d]+(?:\.\d+)?)(.*)$/);

    return { 
        value: Number(strSplit[1].trim()), 
        unit: strSplit[2].trim()
    };
}

/**
 * Converts a unit-based value (px, %, vw, vh) into an absolute pixel value.
 *
 * @param {string} unit - The unit type (e.g., "px", "%", "vw", "vh").
 * @param {number} value - The numeric value associated with the unit.
 * @param {number} totalSize - The total size of the container (used for percentage calculations).
 * @param {Object} winSizeObj - The viewport size with properties `{ x: width, y: height }`.
 * @param {number} [elSize=0] - The element's size (optional, used for percentage-based calculations).
 * 
 * @returns {number} - The computed pixel value.
 */
export function calculateUnitValue(unit, value, winSizes, totalSize, elSize = 0) {
    switch (unit) {
        case 'vw': return (winSizes.x * value) / 100;
        case 'vh': return (winSizes.y * value) / 100;
        case 'px': return value;
        default: return ((totalSize - elSize) * value) / 100; // Assume % by default
    }
}


/**
 * Rounds a given number to a specified number of decimal places.
 *
 * @param {number} value - The number to be rounded.
 * @param {number} [decimals=1] - The number of decimal places to round to (default: 1).
 * @returns {number} - The rounded number.
 */
export function roundValue(value, decimals = 1) {
    return Math.round(value * 10 ** decimals) / 10 ** decimals;
}


/**
 * Validates whether a given wrapper is a valid DOM element.
 *
 * - Allows both selector strings and direct element references.
 * - Checks if the element exists in the DOM.
 *
 * @param {string|HTMLElement|null} wrapper - The selector or element to validate.
 * @returns {HTMLElement|null} - The valid wrapper element or `null` if invalid.
 */
export function validateEl(el, context = 'element') {

    // If it's already an element, return it directly
    if (el instanceof HTMLElement) {
        return el;
    }

    // If it's a string, try to select the element
    if (typeof el === 'string') {
        const selectedEl = document.querySelector(el);

        if (selectedEl) return selectedEl;
    }
    
    // Revert to default if not found
    console.warn(`ScrollageJS: Your desired ${context} "${el}" is not a valid element or selector.`);
    return null;
}


/**
 * Safely parses a JSON string and returns an object.
 * If parsing fails, logs a warning and returns an empty object.
 *
 * @param {string} jsonString - The JSON string to parse.
 * @param {string} context - The name of the attribute for error logging.
 * @returns {Object} - The parsed object or an empty object if parsing fails.
 */
export function safeParseJSON(jsonString, context = 'JSON data') {
    try {
        return JSON.parse(jsonString);
    } catch (error) {
        console.warn(`ScrollageJS: Invalid JSON in ${context}.`, error);
        return {}; // Return empty object instead of undefined
    }
}