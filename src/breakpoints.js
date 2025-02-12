
//export const DEFAULT_BREAKPOINTS = [781, 1024, 1366];


/**
 * Determines the current breakpoint based on the window width and the defined breakpoints.
 * 
 * @param {number[]} breakpoints - An array of breakpoints (e.g., `[600, 1024, 1366]`).
 * @param {number} width - The current window width.
 * 
 * @returns {string} - The current breakpoint as a string: 'phone', 'tablet', 'laptop', or 'desktop'.
 */
export function getCurrentBreakpoint(width, breakpoints) {
    if (width <= breakpoints[0]) return 'phone';
    if (width <= breakpoints[1]) return 'tablet';
    if (width <= breakpoints[2]) return 'laptop';
    return 'desktop';
}


// Validate user defined custom breakpoints
export function isValidBreakpoints(breakpoints = []) {
    if (breakpoints.length === 3 && Array.isArray(breakpoints)) {
        let isAscending = true;
        let isNumerical = true;
        let lastVal;

        breakpoints.forEach((i) => {
            if (typeof i !== 'number') isNumerical = false;
            if (lastVal !== null) {
                if (i < lastVal) isAscending = false;
            }
            lastVal = i;
        });
        if (isAscending && isNumerical) return true;
    }
    // Revert to default if set incorrectly
    console.warn("ScrollageJS: Breakpoints need to be an array of 3 values in ascending order.");
    return false;
}

