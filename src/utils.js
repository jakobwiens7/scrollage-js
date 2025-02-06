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
    if (!str || typeof str !== 'string') return;
    let strSplit = str.match(/^([-.\d]+(?:\.\d+)?)(.*)$/);

    return { 
        'value': Number(strSplit[1].trim()), 
        'unit': strSplit[2].trim()
    };
}


/**
 * Determines the current breakpoint based on the window width and the defined breakpoints.
 * 
 * @param {number[]} breakpoints - An array of breakpoints (e.g., `[600, 1024, 1366]`).
 * @param {number} width - The current window width.
 * 
 * @returns {string} - The current breakpoint as a string: 'phone', 'tablet', 'laptop', or 'desktop'.
 */
export function getCurrentBreakpoint(breakpoints, width) {
    if (width <= breakpoints[0]) return 'phone';
    if (width <= breakpoints[1]) return 'tablet';
    if (width <= breakpoints[2]) return 'laptop';
    return 'desktop';
}

// Validate user defined custom breakpoints
export function validateCustomBreakpoints(breakpoints = []) {
    if (breakpoints.length === 3 && Array.isArray(breakpoints)) {
        var isAscending = true;
        var isNumerical = true;
        var lastVal;

        breakpoints.forEach(function(i) {
            if (typeof i !== 'number') isNumerical = false;
            if (lastVal !== null) {
                if (i < lastVal) isAscending = false;
            }
            lastVal = i;
        });
        if (isAscending && isNumerical) return breakpoints;
    }
    // Revert to default if set incorrectly
    console.warn("ScrollageJS: Breakpoints need to be an array of 3 values in ascending order.");
    return undefined;
}

// Validate user defined custom wrapper
export function validateCustomWrapper(wrapper = null) {
    if (wrapper) {
        if (wrapper instanceof HTMLElement) {
            return wrapper;
        } else if (typeof wrapper === 'string') {
            let validatedWrapper = document.querySelector(wrapper);

            if (validatedWrapper) return validatedWrapper;
        }
    }
    // Revert to default if not found
    console.warn(`ScrollageJS: Wrapper not found. Falling back to default.`);
    return undefined;
}

// Validate target elements
export function validateElements(el = null) {
    if (typeof el === 'string') {
        return document.querySelectorAll(el);
    } else if (el) {
        return [el];
    }
    return null;
}
