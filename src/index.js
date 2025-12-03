// External Dependencies
import ResizeObserver from 'resize-observer-polyfill';

// Internal Dependencies
import { supportsPassiveEvents, debounce, splitValueUnit, calculateUnitValue } from './utils.js';
import { getAnimationData, move, rotate, scale, fade, blur, saturate } from './animation.js';
import { getCurrentBreakpoint, isValidBreakpoints } from './breakpoints.js';


import './scrollage.scss';


/**
 * ScrollageJS - A lightweight library for animating elements based on scroll position.
 *
 * @version 1.0.1
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

	static DEBUG_MODE = false;
    static VERSION = '1.0.0';

	// Default configuration settings for Scrollage.
    static DEFAULT_OPTIONS = {
        direction: 'vertical',
        source: null,
		breakpoints: [781, 1024, 1366],
        triggers: [],
        initialize: true
        // TO-DO: callback: function()
    };

	// Determines if the browser supports passive event listeners.
	static supportsPassive = supportsPassiveEvents();

	// Static handler for all instances
	static handleResizeEvent() {
		Scrollage.instances.forEach( instance => instance.init() );
	}

	static instances = [];
	static isInitialized = false;


	/**
     * Creates an instance of Scrollage.
     *
     * @param {string|HTMLElement} [el] - The selector or element to animate.
     * @param {Object} [options={}] - Configuration options for customization.
     *
     * @throws {Warning} Logs a warning if initialized before the DOM is fully loaded.
     */
    constructor( el, options = {} ) {
		// Add instance to the static list
		Scrollage.instances.push(this);

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

        if (this.options.initialize) this.init();
    }


	/**
	 * Initializes the scrollage system and caches all necessary element values.
	 */
	init() {
		this.destroy();

		// Warn when 'prefers-reduced-motion' is enabled
		this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (this.reducedMotion) console.warn('ScrollageJS: "prefers-reduced-motion" is enabled. Animations will be disabled.');

		// Validate elements (and DON'T return early otherwise!)
		this.elems = (typeof this.el === 'string') 
			? document.querySelectorAll(this.el) 
			: this.el instanceof NodeList ? this.el : [this.el];
		//if (!this.elems || !this.elems.length) return;

		this.isVertical = this.options.direction !== 'horizontal';

		// Validate scroll-container source and set to default otherwise
		if (this.options.source) {
			this.source = this.validateEl(this.options.source, 'source');
			this.isDocumentSource = false;
		}
		if (!this.options.source || !this.source) {
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
		

		// Setup Listeners & observers initially
		this.setupListeners();

		// Update initially
		this.update();

		Scrollage.isInitialized = true;

		// DEBUGGING
		if (Scrollage.DEBUG_MODE) {
			console.log( this );
		}
	}


	setupListeners() {
		// Add resize & orientationchange listeners at class level
		if (!Scrollage.isInitialized) {
			Scrollage.debouncedInit = debounce(Scrollage.handleResizeEvent, 300);
			
			window.addEventListener('resize', Scrollage.debouncedInit);
			window.addEventListener('orientationchange', Scrollage.debouncedInit);
		}

		// Add scroll & touchmove listeners at instance level
		(this.options.source ? this.source : window)?.addEventListener(
			'scroll', 
			this.update, 
			Scrollage.supportsPassive ? { passive: true } : false
		);
		(this.options.source ? this.source : window)?.addEventListener(
			'touchmove',
			this.update,
			Scrollage.supportsPassive ? { passive: true } : false
		);

		// Add resize observer at instance level
		if (!this.resizeObserver) {
			this.resizeObserver = new ResizeObserver(debounce(() => this.init()));
			this.resizeObserver.observe(this.source);
		}

		this.isActive = true;
	}

	
	/**
	 * Validates whether an element / selector is a valid DOM element.
	 *
	 * - Allows both selector strings and direct element references.
	 * - Checks if the element exists in the DOM.
	 *
	 * @param {string|HTMLElement|null} el - The selector or element to validate.
	 * @param {string} context - A string that describes the context of the validated element
	 * 
	 * @returns {HTMLElement|null} - The valid element or `null` if invalid.
	 */
	validateEl(el, context = 'element') {

		// If it's already an element, return it directly
		if (el instanceof HTMLElement) {
			return el;
		}

		// If it's a string, try to select the element
		if (typeof el === 'string') {
			try {
				document.querySelector(el); // Test if selector is valid
				const selectedEl = document.querySelector(el);
				if (selectedEl) return selectedEl;
			} catch (e) {
				console.warn(`ScrollageJS: Invalid selector "${el}" in ${context}.`);
				return null;
			}
		}

		return null;
	}


	/**
	 * Caches and initializes scroll blocks for Scrollage.
	 *
	 * This function iterates over the scrollage elements (`this.elems`), extracts necessary 
	 * data attributes, stores their original styles, determines their scroll-timeline range, 
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
			const dataRangeSelector = el.getAttribute( 'data-timeline-range' );
			const dataRangeOffset = el.getAttribute( 'data-timeline-offset' );
			let dataRangeStart = 0;
			let dataRangeEnd = 0;

			if (dataRangeOffset) {
				const rangeOffsetValues = dataRangeOffset.split(/\s+/); // Split by space (supports "20% -100px")

				dataRangeStart = rangeOffsetValues[0] || 0;
				dataRangeEnd = rangeOffsetValues[1] || 0;
			}

			// Store original element styles
			const originalStyles = el.style.cssText;

			// Retrieve animation data for the element
			const animations = getAnimationData(el);

			// Validate and assign the scroll-timeline range element
			const rangeEl = dataRangeSelector ? this.validateEl(dataRangeSelector, 'timeline range') : null;

			// Get range dimensions
			const rangeSizes = { 
				x: rangeEl?.clientWidth || this.source.scrollWidth, 
				y: rangeEl?.clientHeight || this.source.scrollHeight
			};

			// Get element dimensions
			const elSizes = {
				x: el.clientWidth, 
				y: el.clientHeight
			};

			// Compute scroll-timeline range and initial progress
			const timelineRangeData = this.getTimelineRange(
				rangeEl, 
				dataRangeStart,
				dataRangeEnd
			);

			const progress = this.getScrollProgress(rangeEl, timelineRangeData);

			// Store the processed block
			this.blocks.push({
				progress,
				rangeEl,
				rangeSizes,
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

			// Validate range element and skip trigger if it does not exist
			const rangeEl = trigger.range ? this.validateEl(trigger.range, 'trigger range') : null;
			if (trigger.range && !rangeEl) continue;

			// Validate target element and skip trigger if it does not exist
			const targetEl = ('_self' === trigger.target)
				? rangeEl
				: trigger.target ? this.validateEl(trigger.target, 'trigger target') : null;
			if (trigger.target && !targetEl) continue;
			
			const positionData = splitValueUnit(trigger.position) || { value: 0 };

			let position;
			let elPos = 0;

			// If no timeline range specified, determine position in `source`...
			if (!trigger.range) {
				const contextSourceSize = this.sourceSizes[this.isVertical ? 'y' : 'x'];

				position = calculateUnitValue(positionData.unit, positionData.value, this.winSizes, contextSourceSize);

			// ...otherwise determine position in `timeline range`
			} else {
				const contextRangeSize = this.isVertical ? rangeEl.scrollHeight : rangeEl.scrollWidth;
				const rect = rangeEl.getBoundingClientRect();
				elPos = (this.isVertical ? rect.top : rect.left) + this.getScrollPos();

				position = calculateUnitValue(positionData.unit, positionData.value, this.winSizes, contextRangeSize);
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
	 * Calculates the scroll-timeline range (start, end, and offsets) for a given element or the source.
	 *
	 * - If no range element is provided, it calculates based on the source’s scrollable dimensions.
	 * - Converts `px` and `%` range offsets into absolute values.
	 * - Uses `getBoundingClientRect()` to determine the exact position of the range element.
	 * - Outputs the computed start and end positions, including range offsets, in an object.
	 *
	 * @param {HTMLElement|null} [rangeEl=null] - The element defining the scroll-timeline range. Defaults to `source`.
	 * @param {string|number} [rangeStart=0] - The range start offset (e.g. `10`, `'10%'`, `'33vh'` or `'50px'`). Defaults to 0.
	 * @param {string|number} [rangeEnd=0] - The range end offset (e.g. `10`, `'10%'`, `'33vh'` or `'50px'`). Defaults to 0.
	 * 
	 * @returns {Object} An object containing:
	 *   @property {number} start - The initial start position of the scroll-timeline range.
	 *   @property {number} end - The initial end position of the scroll-timeline range.
	 *   @property {number} startRange - The computed range start position of the scroll-timeline range.
	 *   @property {number} endRange - The computed range end position of the scroll-timeline range.
	 *   @property {number} size - The total size of the scroll-timeline range (end - start).
	 */
	getTimelineRange = (rangeEl = null, rangeStart = 0, rangeEnd = 0) => {
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

		let contextRangeSize;
		let contextRangeStart;
		let contextRangeEnd;

		const scrollFrameSize = this.isDocumentSource ? contextWinSize : contextWrapperSize;

		// If no range specified, determine `source` range...
		if (!rangeEl || rangeEl == this.source) {
			rangeOffsetStart = calculateUnitValue(rangeStartUnit, rangeStartValue, this.winSizes, contextSourceSize);
			rangeOffsetEnd = calculateUnitValue(rangeEndUnit, rangeEndValue, this.winSizes, contextSourceSize);

			timelineRangeStart = Math.max( 
				0, 
				rangeOffsetStart - (this.isDocumentSource ? 0 : scrollFrameSize)
			);

			timelineRangeEnd = Math.max(
				timelineRangeStart,
				Math.min( contextSourceSize + rangeOffsetEnd - (this.isDocumentSource ? contextWinSize : 0), contextSourceSize - scrollFrameSize )
			);

		// ...otherwise determine provided timeline range
		} else {
			contextRangeSize = this.isVertical ? rangeEl.offsetHeight : rangeEl.offsetWidth;

			const sourceRectStart = this.isVertical 
				? this.source.getBoundingClientRect().top 
				: this.source.getBoundingClientRect().left;

			const rangeRectStart = this.isVertical 
				? rangeEl.getBoundingClientRect().top 
				: rangeEl.getBoundingClientRect().left;

			contextRangeStart = rangeRectStart - sourceRectStart;
			contextRangeEnd = contextRangeStart + contextRangeSize;

			rangeOffsetStart = calculateUnitValue(rangeStartUnit, rangeStartValue, this.winSizes, contextRangeSize);
			rangeOffsetEnd = calculateUnitValue(rangeEndUnit, rangeEndValue, this.winSizes, contextRangeSize);

			timelineRangeStart =  Math.max(
				0, 
				contextRangeStart + rangeOffsetStart - scrollFrameSize
			);

			timelineRangeEnd = Math.max(
				timelineRangeStart,
				Math.min( contextRangeEnd + rangeOffsetEnd, contextSourceSize - scrollFrameSize )
			);
		}

		// Debugging
		if (Scrollage.DEBUG_MODE) {
			console.log(`contextRangeStart: ${contextRangeStart}  ||  contextRangeEnd: ${contextRangeEnd}`);
			console.log(`rangeOffsetStart: ${rangeOffsetStart}  ||  rangeOffsetEnd: ${rangeOffsetEnd}`);
			console.log(`timelineRangeStart*: ${timelineRangeStart}  ||  timelineRangeEnd*: ${timelineRangeEnd}`);
			console.log(`cntxtWinSize: ${contextWinSize}  ||  cntxtWrapperSize: ${contextWrapperSize}`);
			console.log(`cntxtSourceSize: ${contextSourceSize}  ||  cntxtRangeSize: ${contextRangeSize}`);
		}

		return {
			start: timelineRangeStart,
			end: timelineRangeEnd
		}
	}


	/**
	 * Calculates the scroll progression as a percentage (0 to 1) within a specified scroll-timeline range.
	 *
	 * - Determines how far the user has scrolled relative to a given range.
	 * - Can use a custom range element or default to the main source.
	 * - Clamps the result between 0 (not scrolled) and 1 (fully scrolled).
	 *
	 * @param {HTMLElement|string|null} [range=null] - The target element or selector defining the scroll-timeline range. Defaults to the source.
	 * @param {Object|null} [timelineRangeData=null] - Precomputed scroll-timeline range data to avoid redundant calculations.
	 * 
	 * @returns {number} - The normalized scroll progression (0 to 1).
	 */
	getScrollProgress = (range = null, timelineRangeData = null) => {
		const scrollPos = this.getScrollPos();
		const rangeEl = range ? this.validateEl(range, 'range') : this.source;
		if (!timelineRangeData) timelineRangeData = this.getTimelineRange(rangeEl);
			
		// Determine start and end scroll positions
		const scrollStart = timelineRangeData.start - scrollPos;
		const scrollEnd = timelineRangeData.end - scrollPos;
		
		// Calculate scroll progression percentage
		let scrollPercentage = scrollStart / (scrollEnd - scrollStart) * -100;
		
		// Clamp value between 0 and 100
		scrollPercentage = Math.min(100, Math.max(0, scrollPercentage));
		
		// Debugging
		if (Scrollage.DEBUG_MODE) {
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
				this.blocks[i].rangeEl,
				this.blocks[i].timelineRangeData
			);
		}

		this.triggerClasses();

		if (!this.reducedMotion) requestAnimationFrame(this.animate);
	}


	/**
	 * Applies animations to all blocks based on their progress within the scroll-timeline range.
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

			if (!el) continue;

			let curAnimationData;
			let transforms = [];
			let filters = [];
			let opacityValue = null;
	
			for (let j = 0; j < block.animations.length; j++) {
				const animation = block.animations[j];

				if (animation.move) {
					curAnimationData = animation.move.responsive?.[breakpoint] || animation.move;
					transforms.push( move(curAnimationData, block.progress, block.rangeSizes, block.elSizes, this.winSizes) );
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
		(this.options.source ? this.source : window)?.removeEventListener('scroll', this.update);
		(this.options.source ? this.source : window)?.removeEventListener('touchmove', this.update);

		/*
		window.removeEventListener('resize', this.debouncedSetup);
		window.removeEventListener('orientationchange', this.debouncedSetup)
		*/

		// Remove resize observer
		this.resizeObserver?.disconnect();

		//this.isActive = false;
	}

}

export default Scrollage;

// Expose Scrollage globally for browsers
if (typeof window !== 'undefined') {
    window.Scrollage = Scrollage; // Optional global exposure
}