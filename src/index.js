// External Dependencies
import ResizeObserver from 'resize-observer-polyfill';

// Internal Dependencies
import { supportsPassiveEvents, debounce, splitValueUnit, calculateUnitValue, validateEl } from './utils.js';
import { getAnimationData, move, rotate, scale, fade, blur, saturate } from './animation.js';
import { getCurrentBreakpoint, isValidBreakpoints } from './breakpoints.js';


import './scrollage.scss';


/**
 * ScrollageJS - A lightweight library for animating elements based on scroll position.
 *
 * @version 1.0.0
 * @author Jakob Wiens
 * @see {@link https://github.com/jakobwiens7/scrollage-js} Project Repository
 * @see {@link https://scrollage.de} Official Website
 *
 * @class Scrollage
 *
 * @license MIT
 * Copyright (c) 2025 Jakob Wiens
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
class Scrollage {

	// Current Scrollage version
    static version = '1.0.0';

	// Determines if the browser supports passive event listeners.
	static supportsPassive = supportsPassiveEvents();

	// Default configuration settings for Scrollage.
    static DEFAULT_OPTIONS = {
        direction: 'vertical',
        source: null,
		breakpoints: [781, 1024, 1366],
        triggers: [],
        // TO-DO: callback: function()
    };


	/**
     * Creates an instance of Scrollage.
     *
     * @param {string|HTMLElement} [el] - The selector or element to animate.
     * @param {Object} [options={}] - Configuration options for customization.
     *
     * @throws {Warning} Logs a warning if initialized before the DOM is fully loaded.
     */
    constructor( el, options = {} ) {
		// Warn when DOM is not ready
        if (document.readyState === 'loading') {
            console.warn('ScrollageJS: DOM is not fully loaded. Ensure initialization happens after `DOMContentLoaded`.');
        }

		this.el = el || '.scrollage';
		this.options = { ...Scrollage.DEFAULT_OPTIONS, ...options };

		this.source = null;
		this.isDocumentSource = true;

		this.sourceSizes = {};
		this.winSizes = {};
		this.wrapperSizes = {};

		this.currentBreakpoint = null;
		this.reducedMotion = false;
		this.breakpoints = [];
		this.elems = [];
		this.blocks = [];
		this.triggers = [];

		this.init();
    }


	/**
	 * Initializes the scrollage system and caches all necessary element values.
	 */
	init() {
		// Warn when 'prefers-reduced-motion' is enabled
		this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (this.reducedMotion) {
			console.warn('ScrollageJS: "prefers-reduced-motion" is enabled. Animations will be disabled.');
		}

		// Validate elements and return early otherwise
		this.elems = (typeof this.el === 'string') 
			? document.querySelectorAll(this.el) 
			: this.el instanceof NodeList ? this.el : [this.el];
		if (!this.elems || !this.elems.length) return;

		this.isVertical = this.options.direction !== 'horizontal';

		// Validate scroll-container source and set to default otherwise
		if (this.options.source) {
			this.source = validateEl(this.options.source, 'source');
			this.isDocumentSource = false;
		} else if (!this.options.source || !this.source) {
			this.source = document.documentElement || document.body;
			this.isDocumentSource = true;
		}
		this.sourceSizes = { x: this.source.scrollWidth, y: this.source.scrollHeight };
		this.wrapperSizes = { x: this.source.offsetWidth, y: this.source.offsetHeight };
		this.winSizes = { x: window.innerWidth, y: window.innerHeight };

		this.breakpoints = isValidBreakpoints(this.options.breakpoints) 
			? this.options.breakpoints 
			: Scrollage.DEFAULT_OPTIONS.breakpoints;

		this.currentBreakpoint = getCurrentBreakpoint(this.winSizes.x, this.breakpoints);

		// Reset potential element styles
		if (this.blocks?.length) {
			for (let i = 0; i < this.blocks.length; i++) {
				this.elems[i].style.cssText = this.blocks[i].originalStyles || '';
			}
		}

		// Setup and cache
		this.cacheBlocks();
		this.cacheTriggers();

		// Window resize & orientation change listeners
		window.addEventListener(
			"resize", 
			debounce(this.init.bind(this))
		);
		window.addEventListener(
			'orientationchange', 
			debounce(this.init.bind(this))
		);

		// Scroll & touch listeners
		(this.options.source ? this.source : window).addEventListener(
			'scroll', 
			this.update, 
			Scrollage.supportsPassive ? { passive: true } : false
		);
		(this.options.source ? this.source : window).addEventListener(
			'touchmove',
			this.update,
			Scrollage.supportsPassive ? { passive: true } : false
		);

		// Source resize observer
		if (!this.resizeObserver) {
			this.resizeObserver = new ResizeObserver(debounce(() => this.init(), 100));
			this.resizeObserver.observe(this.source);
		}

		// Update initially
		this.update();

		// WIP >>>
		console.log(this);
	}


	/**
	 * Caches and initializes scroll blocks for Scrollage.
	 *
	 * This function iterates over the scrollage elements (`this.elems`), extracts necessary 
	 * data attributes, stores their original styles, determines their scroll-timeline scope, 
	 * calculates their initial progress, and stores animation data.
	 * 
	 * @returns {void}
	 */
	cacheBlocks = () => {
		// Reset previously cached blocks
		this.blocks = [];

		for (let i = 0; i < this.elems.length; i++) {
			const el = this.elems[i];

			// Extract scroll-related data attributes
			const dataScopeSelector = el.getAttribute( 'data-timeline-scope' );
			const dataRange = el.getAttribute( 'data-animation-range' );
			let dataRangeStart = 0;
			let dataRangeEnd = 0;

			if (dataRange) {
				const rangeValues = dataRange.split(/\s+/); // Split by space (supports "20% -100px")

				dataRangeStart = rangeValues[0] || 0;
				dataRangeEnd = rangeValues[1] || 0;
			}

			// Store original element styles
			const originalStyles = el.style.cssText;

			// Retrieve animation data for the element
			const animations = getAnimationData(el);

			// Validate and assign the scroll-timeline scope element
			const scopeEl = dataScopeSelector ? validateEl(dataScopeSelector, 'timeline scope') : null;

			// Get scope dimensions
			const scopeSizes = { 
				x: scopeEl?.clientWidth || this.source.scrollWidth, 
				y: scopeEl?.clientHeight || this.source.scrollHeight
			};

			// Get element dimensions
			const elSizes = {
				x: el.clientWidth, 
				y: el.clientHeight
			};

			// Compute scroll-timeline scope and initial progress
			const timelineRangeData = this.getTimelineRange(
				scopeEl, 
				dataRangeStart,
				dataRangeEnd
			);

			const progress = this.getScrollProgress(scopeEl, timelineRangeData);

			// Store the processed block
			this.blocks.push({
				progress,
				scopeEl,
				scopeSizes,
				elSizes,
				timelineRangeData,
				animations,
				originalStyles
			});
		}
	}


	/**
	 * Sets up and caches custom triggers in order to toggle css classes on specific scroll positions.
	 *
	 * This function iterates over the configured triggers, validates their properties, 
	 * calculates their positions relative to the viewport, and stores them for later use.
	 *
	 * @returns {void}
	 */
	cacheTriggers = () => {
		this.triggers = [];

		if (!this.options.triggers || !Array.isArray(this.options.triggers)) return;

		for (let i = 0; i < this.options.triggers.length; i++) {
			const trigger = this.options.triggers[i];

			// Skip trigger if no valid class was specified
			if (!trigger.class || typeof trigger.class !== 'string') continue;

			// Validate scope element and skip trigger if it does not exist
			const scopeEl = trigger.scope ? validateEl(trigger.scope, 'trigger scope') : null;
			if (trigger.scope && !scopeEl) continue;

			// Validate target element and skip trigger if it does not exist
			const targetEl = ('_self' === trigger.target)
				? scopeEl
				: trigger.target ? validateEl(trigger.target, 'trigger target') : null;
			if (trigger.target && !targetEl) continue;
			
			const positionData = splitValueUnit(trigger.position) || { value: 0 };

			let position;
			let elPos = 0;

			// If no scope specified, determine source offsets...
			if (!trigger.scope) {
				const contextSourceSize = this.sourceSizes[this.isVertical ? 'y' : 'x'];

				position = calculateUnitValue(positionData.unit, positionData.value, this.winSizes, contextSourceSize);

			// ...otherwise calculate scroll-timeline scope and determine scope offsets
			} else {
				const contextScopeSize = this.isVertical ? scopeEl.scrollHeight : scopeEl.scrollWidth;
				const rect = scopeEl.getBoundingClientRect();
				elPos = (this.isVertical ? rect.top : rect.left) + this.getScrollPos();

				position = calculateUnitValue(positionData.unit, positionData.value, this.winSizes, contextScopeSize);
			}

			this.triggers.push({
				position: elPos + position,
				class: trigger.class,
				targetEl: targetEl || this.source
			});
		}
	};


	/**
	 * Triggers CSS classes on elements based on scroll position.
	 *
	 * This function iterates through all defined triggers and applies/removes their classes based on scroll position.
	 *
	 * @returns {void}
	 */
	triggerClasses = () => {
		const scrollPos = this.getScrollPos();

		for (const trigger of this.triggers) {
			scrollPos > trigger.position 
				? trigger.targetEl.classList.add(trigger.class) 
				: trigger.targetEl.classList.remove(trigger.class);
		}
	}


	/**
	 * Retrieves the current scroll position.
	 *
	 * This function returns the current scroll position of the source element, 
	 * based on the scroll direction (vertical or horizontal).
	 *
	 * @returns {number} - The current scroll position in pixels.
	 */
	getScrollPos = () => {
		return this.isVertical ? this.source.scrollTop : this.source.scrollLeft;
	};


	/**
	 * Calculates the scroll-timeline scope (start, end, and range offsets) for a given element or the source.
	 *
	 * - If no scope element is provided, it calculates based on the source’s scrollable dimensions.
	 * - Converts `px` and `%` range offsets into absolute values.
	 * - Uses `getBoundingClientRect()` to determine the exact position of the scope element.
	 * - Outputs the computed start and end positions, including range offsets, in an object.
	 *
	 * @param {HTMLElement|null} [scopeEl=null] - The element defining the scroll-timeline scope. Defaults to `source`.
	 * @param {string|number} [rangeStart=0] - The range start offset (e.g. `10`, `'10%'`, `'33vh'` or `'50px'`). Defaults to 0.
	 * @param {string|number} [rangeEnd=0] - The range end offset (e.g. `10`, `'10%'`, `'33vh'` or `'50px'`). Defaults to 0.
	 * 
	 * @returns {Object} An object containing:
	 *   @property {number} start - The initial start position of the scroll-timeline scope.
	 *   @property {number} end - The initial end position of the scroll-timeline scope.
	 *   @property {number} startRange - The computed range start position of the scroll-timeline scope.
	 *   @property {number} endRange - The computed range end position of the scroll-timeline scope.
	 *   @property {number} size - The total size of the scroll-timeline scope (end - start).
	 */
	getTimelineRange = (scopeEl = null, rangeStart = 0, rangeEnd = 0) => {
		const contextWinSize = this.winSizes[this.isVertical ? 'y' : 'x'];
		const contextWrapperSize = this.wrapperSizes[this.isVertical ? 'y' : 'x'];

		const rangeStartData = splitValueUnit(rangeStart);
		const rangeEndData = splitValueUnit(rangeEnd);
		const rangeStartValue = rangeStartData?.value || 0;
		const rangeStartUnit = rangeStartData?.unit || '%';
		const rangeEndValue = rangeEndData?.value || 0;
		const rangeEndUnit = rangeEndData?.unit || '%';

		let timelineRangeStart = 0;
		let timelineRangeEnd = 0;
		let rangeOffsetStart = 0;
		let rangeOffsetEnd = 0;

		let contextSourceSize = this.sourceSizes[this.isVertical ? 'y' : 'x'];

		let contextScopeSize;
		let contextScopeStart;
		let contextScopeEnd;

		const scrollFrameSize = this.isDocumentSource ? contextWinSize : contextWrapperSize;

		// If no scope specified, determine source range...
		if (!scopeEl || scopeEl == this.source) {
			rangeOffsetStart = calculateUnitValue(rangeStartUnit, rangeStartValue, this.winSizes, contextSourceSize);
			rangeOffsetEnd = calculateUnitValue(rangeEndUnit, rangeEndValue, this.winSizes, contextSourceSize);

			timelineRangeStart = Math.max( 
				0, 
				rangeOffsetStart - scrollFrameSize
			);

			timelineRangeEnd = Math.max(
				timelineRangeStart,
				Math.min( contextSourceSize + rangeOffsetEnd, contextSourceSize - scrollFrameSize )
				 
			);

		// ...otherwise determine scope range
		} else {
			contextScopeSize = this.isVertical ? scopeEl.offsetHeight : scopeEl.offsetWidth;

			const sourceRectStart = this.isVertical 
				? this.source.getBoundingClientRect().top 
				: this.source.getBoundingClientRect().left;

			const scopeRectStart = this.isVertical 
				? scopeEl.getBoundingClientRect().top 
				: scopeEl.getBoundingClientRect().left;

			contextScopeStart = scopeRectStart - sourceRectStart;
			contextScopeEnd = contextScopeStart + contextScopeSize;

			rangeOffsetStart = calculateUnitValue(rangeStartUnit, rangeStartValue, this.winSizes, contextScopeSize);
			rangeOffsetEnd = calculateUnitValue(rangeEndUnit, rangeEndValue, this.winSizes, contextScopeSize);

			timelineRangeStart =  Math.max(
				0, 
				contextScopeStart + rangeOffsetStart - scrollFrameSize
			);

			timelineRangeEnd = Math.max(
				timelineRangeStart,
				Math.min( contextScopeEnd + rangeOffsetEnd, contextSourceSize - scrollFrameSize )
			);
		}

		// Debugging
		if (false) {
			console.log(`contextScopeStart: ${contextScopeStart}  ||  contextScopeEnd: ${contextScopeEnd}`);
			console.log(`rangeOffsetStart: ${rangeOffsetStart}  ||  rangeOffsetEnd: ${rangeOffsetEnd}`);
			console.log(`timelineRangeStart*: ${timelineRangeStart}  ||  timelineRangeEnd*: ${timelineRangeEnd}`); // *subtracted by scrollFrameSize
			console.log(`cntxtWinSize: ${contextWinSize}  ||  cntxtWrapperSize: ${contextWrapperSize}`);
			console.log(`cntxtSourceSize: ${contextSourceSize}  ||  cntxtScopeSize: ${contextScopeSize}`);
		}

		return {
			start: timelineRangeStart,
			end: timelineRangeEnd
		}
	}


	/**
	 * Calculates the scroll progression as a percentage (0 to 1) within a specified scroll-timeline scope.
	 *
	 * - Determines how far the user has scrolled relative to a given scope.
	 * - Can use a custom scope element or default to the main source.
	 * - Clamps the result between 0 (not scrolled) and 1 (fully scrolled).
	 *
	 * @param {HTMLElement|string|null} [scope=null] - The target element or selector defining the scroll-timeline scope. Defaults to the source.
	 * @param {Object|null} [timelineRangeData=null] - Precomputed scroll-timeline scope data to avoid redundant calculations.
	 * 
	 * @returns {number} - The normalized scroll progression (0 to 1).
	 */
	getScrollProgress = (scope = null, timelineRangeData = null) => {
		const scrollPos = this.getScrollPos();
		const scopeEl = scope ? validateEl(scope, 'scope') : this.source;
		if (!timelineRangeData) timelineRangeData = this.getTimelineRange(scopeEl);
			
		// Determine start and end scroll positions
		const scrollStart = timelineRangeData.start - scrollPos;
		const scrollEnd = timelineRangeData.end - scrollPos;
		
		// Calculate scroll progression percentage
		let scrollPercentage = scrollStart / (scrollEnd - scrollStart) * -100;
		
		// Clamp value between 0 and 100
		scrollPercentage = Math.min(100, Math.max(0, scrollPercentage));
		
		// Debugging
		if (false) {
			console.log(`scrollPos: ${scrollPos}  ||  scrollPercentage: ${scrollPercentage}`);
			console.log(`scrollStartPos: ${scrollStart}  ||  scrollEndPos: ${scrollEnd}`);
		}

		return scrollPercentage / 100;
	}


	/**
	 * Updates the scroll progress for each cached block and triggers classes.
	 * 
	 * @returns {void} - This function does not return a value.
	 */
	update = () => {
		for (let i = 0; i < this.blocks.length; i++) {
			this.blocks[i].progress = this.getScrollProgress(
				this.blocks[i].scopeEl,
				this.blocks[i].timelineRangeData
			);
		}

		this.triggerClasses();

		if (!this.reducedMotion) requestAnimationFrame(this.animate);
	}


	/**
	 * Applies animations to all blocks based on their progress within the scroll-timeline scope.
	 * [Formula: newValue = targetMin + (targetMax - targetMin) * (sourceValue - sourceMin) / (sourceMax - sourceMin)]
	 *
	 * @returns {void} - This function does not return a value.
	 */
	animate = () => {
		for (let i = 0; i < this.blocks.length; i++) {
			const block = this.blocks[i];

			// Skip blocks without animations
			if (!block.animations.length) continue; 

			const breakpoint = this.currentBreakpoint;
			const el = this.elems[i];

			let curAnimationData;
			let transforms = [];
			let filters = [];
			let opacityValue = null;
	
			for (let j = 0; j < block.animations.length; j++) {
				const animation = block.animations[j];

				if (animation.move) {
					curAnimationData = animation.move.responsive?.[breakpoint] || animation.move;
					transforms.push( move(curAnimationData, block.progress, block.scopeSizes, block.elSizes, this.winSizes) );
				}
				if (animation.rotate) {
					curAnimationData = animation.rotate.responsive?.[breakpoint] || animation.rotate;
					transforms.push( rotate(curAnimationData, block.progress) );
				}
				if (animation.scale) {
					curAnimationData = animation.scale.responsive?.[breakpoint] || animation.scale;
					transforms.push( scale(curAnimationData, block.progress) );
				}
				if (animation.saturate) {
					curAnimationData = animation.saturate.responsive?.[breakpoint] || animation.saturate;
					if (curAnimationData.start && curAnimationData.end) {
						filters.push( saturate(curAnimationData, block.progress) );
					}
				}
				if (animation.blur) {
					curAnimationData = animation.blur.responsive?.[breakpoint] || animation.blur;
					if (curAnimationData.start && curAnimationData.end) {
						filters.push( blur(curAnimationData, block.progress) );
					}
				}
				if (animation.fade) {
					curAnimationData = animation.fade.responsive?.[breakpoint] || animation.fade;
					if (curAnimationData.start && curAnimationData.end) {
						opacityValue = fade(curAnimationData, block.progress);
					}
				}
			}

			if (transforms.length) el.style.transform = transforms.join(' ');
			if (filters.length) el.style.filter = filters.join(' ');
			if (opacityValue != null) el.style.opacity = opacityValue;
		}
	}


	/**
	 * Cleans up and resets all ScrollageJS elements, event listeners, and animations.
	 *
	 * - Restores original element styles.
	 * - Removes trigger classes from target elements.
	 * - Detaches all event listeners.
	 */
	destroy = () => {
		// Reset element styles
		for (let i = 0; i < this.elems.length; i++) {
			this.elems[i].style.cssText = this.blocks[i]?.originalStyles || '';
		}
		this.elems = [];
		this.blocks = [];
		
		// Reset trigger classes
		for (let i = 0; i < this.triggers.length; i++) {
			this.triggers[i].targetEl.classList.remove(this.triggers[i]?.class);
		}
		this.triggers = [];
		
		// Remove event listeners
		(this.options.source ? this.source : window).removeEventListener('scroll', this.update);
		(this.options.source ? this.source : window).removeEventListener('touchmove', this.update);
		window.removeEventListener('resize', debounce(this.init.bind(this)));
		window.removeEventListener('orientationchange', debounce(this.init.bind(this)));

		// Remove resize observer
		this.resizeObserver.disconnect();
	}

}

// Expose Scrollage globally for browsers
if (typeof window !== 'undefined') {
    window.Scrollage = Scrollage;
}