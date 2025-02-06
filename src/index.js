// Dependencies
import {
	supportsPassiveEvents,
	debounce,
	splitValueUnit,
	getCurrentBreakpoint, 
	validateCustomBreakpoints,
	validateCustomWrapper,
	validateElements
} from './utils.js';

import { setAnimationData, move, rotate, scale, fade, blur } from './animation.js';


// Determines if the browser supports passive event listeners.
const supportsPassive = supportsPassiveEvents();


// Default configuration settings for Scrollage.
const DEFAULT_OPTIONS = {
	direction: 'vertical',
	breakpoints: [781, 1024, 1366],
	wrapper: null,
	hasScrolledEnabled: true,
	hasScrolledClass: 'has-scrolled',
	hasScrolledOffset: 0,
	hasTriggeredClassPrefix: 'has-triggered-',
	triggers: [],
	trackers: [],
	// TO-DO: callback: function()
};


/**
 * ScrollageJS v0.9.0
 * Animate elements by scrolling
 * Copyright (c) 2024 Jakob Wiens - TezmoMedia
 */
class Scrollage {

    constructor( el = '.scrollage', options = {} ) {
		// Warn when DOM is not ready
        if (document.readyState === 'loading') {
            console.warn('ScrollageJS: DOM is not fully loaded. Ensure initialization happens after DOMContentLoaded.');
        }
		
		// Validate and merge custom options
		if (options.breakpoints) {
			options.breakpoints = validateCustomBreakpoints(options.breakpoints);
		}
		if (options.wrapper) {
			options.wrapper = validateCustomWrapper(options.wrapper);
		}
		this.options = { ...DEFAULT_OPTIONS, ...options };

		this.el = el;
		this.wrapper = this.options.wrapper || document.documentElement || document.body.parentNode || document.body;
		this.wrapperHeight = null;
		this.wrapperWidth = null;
		this.winHeight = null;
		this.winWidth = null;
		this.currentBreakpoint = null;
		this.isVertical = null;

		this.triggers = [];
		this.trackers =[];

		this.init();
    }


	/**
	 * Initializes the scrollage system and caches all necessary element values.
	 */
	init() {
		// Validate elements and return early otherwise
		this.elems = validateElements(this.el);
		if (!this.elems || !this.elems.length) return;
		
		this.isVertical = this.options.direction === 'vertical';
		this.wrapperHeight = this.wrapper.scrollHeight;
		this.wrapperWidth = this.wrapper.scrollWidth;
		this.winHeight = window.innerHeight;
		this.winWidth = window.innerWidth;

		this.currentBreakpoint = getCurrentBreakpoint(this.options.breakpoints, this.winWidth);

		// WIP: Store styles before resetting blocks (DO WE NEED THIS???)
		if (this.blocks && this.blocks.length) {
			for (let i = 0; i < this.blocks.length; i++) {
				this.elems[i].style.cssText = this.blocks[i].style;
			}
		}

		// Setup and cache
		this.cacheBlocks();
		this.cacheTriggers();
		this.cacheTrackers();

		// Update initially
		this.update();

		// Window resize & orientation change listeners
		window.addEventListener("resize", debounce(this.init.bind(this)));
		window.addEventListener('orientationchange', debounce(this.init.bind(this)));

		// Scroll & touch listeners
		(this.options.wrapper ? this.wrapper : document).addEventListener(
			'scroll', 
			this.update, 
			supportsPassive ? { passive: true } : false
		);
		(this.options.wrapper ? this.wrapper : document).addEventListener(
			'touchmove',
			this.update,
			supportsPassive ? { passive: true } : false
		);

		// WIP >>>
		console.log(this);
	}


	/**
	 * Caches and initializes scroll blocks for Scrollage.
	 *
	 * This function iterates over the target elements (`this.elems`), extracts necessary 
	 * scroll-related data attributes, determines their scroll range, calculates their 
	 * initial progress, and stores animation data.
	 * 
	 * @returns {void}
	 */
	cacheBlocks = () => {
		// Reset previously cached blocks
		this.blocks = [];

		for (let i = 0; i < this.elems.length; i++) {
			const el = this.elems[i];

			// Extract scroll-related data attributes
			const dataRangeSelector = el.getAttribute( 'data-scrollage-selector' );
			const dataRangeType = el.getAttribute( 'data-scrollage-type' );
			const dataOffsetStart = el.getAttribute( 'data-scrollage-offset-start' );
			const dataOffsetEnd = el.getAttribute( 'data-scrollage-offset-end' );

			// Retrieve animation data for the element
			const animations = setAnimationData(el);

			// Validate and assign the scroll range target
			let rangeTarget = null;
			if (dataRangeSelector) {
				if (typeof dataRangeSelector === 'string') {
					rangeTarget = document.querySelector(dataRangeSelector)
				}
				
				if (!rangeTarget || !rangeTarget.nodeType) {
					console.warn("Scrollage: Your desired scroll range target doesn't exist.");
					rangeTarget = null;
				}
			}
			
			// Compute scroll range and initial progress
			const scrollRange = this.getScrollRange(rangeTarget, dataRangeType, dataOffsetStart, dataOffsetEnd);
			const progress = this.getProgress(this.getScrollPos(), scrollRange);

			// Store the processed block
			this.blocks.push({
				progress,
				scrollRange,
				animations
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
		// Reset previously set triggers
		this.triggers = [];

		if (!this.options.triggers || !Array.isArray(this.options.triggers)) return;

		for (let i = 0; i < this.options.triggers.length; i++) {
			const trigger = this.options.triggers[i];

			if (trigger.hasOwnProperty('selector') && trigger.hasOwnProperty('identifier')) {
				let el = null;

				if (typeof trigger.selector === 'string') {
					el = document.querySelector(trigger.selector);
				} else if (trigger.selector?.nodeType) {
					el = trigger.selector;
				}

				if (!el) {
					console.warn("ScrollageJS: Your desired trigger element does not exist.");
					continue;
				}
				if (typeof trigger.identifier !== 'string') {
					console.warn("ScrollageJS: The trigger identifier needs to be a string.");
					continue;
				}

				const rect = el.getBoundingClientRect();
				const elPos = (isVertical ? rect.top : rect.left) + this.getScrollPos();
				let elOffset = 0,
					offsetValue = 0,
					offsetUnit = '%';

				if (trigger.hasOwnProperty('position')) {
					if (typeof trigger.position === 'string') {

						const positionData = splitValueUnit(trigger.position);
						offsetValue = positionData?.value || 0;
						offsetUnit = positionData?.unit || '%';
					} else {
						offsetValue = trigger.position || 0;
					}
					elOffset = offsetUnit === 'px' 
						? offsetValue 
						: el.clientHeight * (offsetValue / 100)
				} 

				let targetEl = null;
				if (trigger.hasOwnProperty('target')) {
					if (typeof trigger.target === 'string') {
						targetEl = trigger.target === '_self' 
							? el 
							: document.querySelector(trigger.target);
					} else {
						targetEl = trigger.target;
					}
				}
				if (!targetEl || !targetEl.nodeType) {
					targetEl = this.wrapper;
				}

				this.triggers.push({
					position: elPos + elOffset,
					class: this.options.hasTriggeredClassPrefix + trigger.identifier,
					targetEl
				});
			}	
		}
	};


	/**
	 * Sets up and caches tracker elements for Scrollage.
	 *
	 * This function iterates over the configured trackers, validates their properties, 
	 * and stores them for later use. Trackers allow the tracking of specific elements 
	 * and their properties (e.g., CSS custom properties) based on scroll progress.
	 *
	 * @returns {void}
	 */
	cacheTrackers = () => {
		// Reset previously set trackers
		this.trackers = [];

		if (!this.options.trackers || !Array.isArray(this.options.trackers)) return;

		for (let i = 0; i < this.options.trackers.length; i++) {
			const tracker = this.options.trackers[i];

			if (tracker.hasOwnProperty('selector') && tracker.hasOwnProperty('identifier')) {
				let el = null;

				if (typeof tracker.selector === 'string') {
					el = document.querySelector(tracker.selector);
				} else if (tracker.selector?.nodeType) {
					el = tracker.selector;
				}

				if (!el) {
					console.warn("ScrollageJS: Your desired tracker element does not exist.");
					continue;
				}

				if (typeof tracker.identifier !== 'string') {
					console.warn("ScrollageJS: The tracker identifier needs to be a string.");
					continue;
				}

				let targetEl = null;
				if (tracker.hasOwnProperty('target')) {
					if (typeof tracker.target === 'string') {
						targetEl = tracker.target === '_self' 
							? el 
							: document.querySelector(tracker.target);
					} else {
						targetEl = tracker.target;
					}
				}
				if (!targetEl || !targetEl.nodeType) {
					targetEl = this.wrapper;
				}

				this.trackers.push({
					el,
					property: '--' + tracker.identifier,
					targetEl
				});
			}
		}
	}


	/**
	 * Triggers CSS classes on elements based on scroll position.
	 *
	 * This function:
	 * - Adds or removes a "has-scrolled" class on the wrapper when scrolled past a threshold.
	 * - Iterates through all defined triggers and applies/removes their classes based on scroll position.
	 *
	 * @returns {void}
	 */
	triggerClasses = () => {
		const scrollPos = this.getScrollPos();

		// Handle the 'has-scrolled' class
		if (this.options.hasScrolledEnabled) {
			const hasScrolledThreshold = this.options.hasScrolledOffset || 0;
			this.wrapper.classList.toggle(this.options.hasScrolledClass, scrollPos > hasScrolledThreshold);
		}

		// Add 'has-triggered' classes
		for (const trigger of this.triggers) {
			trigger.targetEl.classList.toggle(trigger.class, scrollPos >= trigger.position);
		}
	}


	/**
	 * Updates tracked CSS properties based on element dimensions.
	 *
	 * This function:
	 * - Iterates through all defined trackers.
	 * - Sets a CSS custom property (`--identifier`) for each tracker, based on the element's width or height.
	 *
	 * @returns {void}
	 */
	trackProperties = () => {
		for (const tracker of this.trackers) {
			const size = this.isVertical ? tracker.el.clientHeight : tracker.el.clientWidth;
			tracker.targetEl.style.setProperty(tracker.property, `${size}px`);
		}
	}


	/**
	 * Retrieves the current scroll position.
	 *
	 * This function returns the current scroll position of the wrapper element, 
	 * based on the scroll direction (vertical or horizontal).
	 *
	 * @returns {number} - The current scroll position in pixels.
	 */
	getScrollPos = () => {
		return this.isVertical ? this.wrapper.scrollTop : this.wrapper.scrollLeft;
	};


	/**
	 * Calculates and returns the scroll range for progress calculation.
	 *
	 * This function determines the start and end points of a scrollable area,
	 * optionally relative to a target element, and adjusts for specified offsets.
	 *
	 * @param {HTMLElement|null} [target=null] - The target element for which the scroll range should be calculated. 
	 *                                            If null, the range is based on the wrapper.
	 * @param {string} [type='default'] - The type of scroll calculation (e.g., 'default' or other custom types).
	 * @param {number|string} [offsetStart=0] - The starting offset (can be a number in pixels or a percentage string).
	 * @param {number|string} [offsetEnd=0] - The ending offset (can be a number in pixels or a percentage string).
	 *
	 * @returns {Object} An object representing the scroll range with the following properties:
	 * - `start` {number}: The starting scroll position.
	 * - `end` {number}: The ending scroll position.
	 * - `startOffset` {number}: The calculated offset at the start of the range.
	 * - `endOffset` {number}: The calculated offset at the end of the range.
	 * - `size` {number}: The total scrollable size, accounting for offsets.
	 * - `type` {string}: The provided type parameter.
	 */
	getScrollRange = (target = null, type = 'default', offsetStart = 0, offsetEnd = 0) => {
		const wrapperSize = this.isVertical ? this.wrapperHeight : this.wrapperWidth;

		let el = this.wrapper;
		let scrollRangeStart = 0;
		let scrollRangeEnd = wrapperSize;

		const offsetStartData = splitValueUnit(offsetStart);
		const offsetEndData = splitValueUnit(offsetEnd);
		const offsetStartValue = offsetStartData?.value || 0;
		const offsetStartUnit = offsetStartData?.unit || '%';
		const offsetEndValue = offsetEndData?.value || 0;
		const offsetEndUnit = offsetEndData?.unit || '%';

		// Determine scroll offsets relative to wrapper
		let scrollRangeStartOffset = offsetStartUnit == 'px' ? offsetStartValue : wrapperSize * (offsetStartValue / 100);
		let scrollRangeEndOffset = offsetEndUnit == 'px' ? offsetEndValue : wrapperSize * (offsetEndValue / 100);
		
		// If a target element is specified, calculate its scroll range
		if ( target ) {
			el = target;

			const rect = el.getBoundingClientRect();
        	const scrollPos = this.getScrollPos();

			scrollRangeStart = Math.round(((this.isVertical ? rect.top : rect.left) + scrollPos ) * 100) / 100;
			scrollRangeEnd = Math.round(((this.isVertical ? rect.bottom : rect.right) + scrollPos ) * 100) / 100;

			// Convert offsets relative to target element's size
			scrollRangeStartOffset = offsetStartUnit == 'px' 
				? offsetStartValue 
				: el.scrollHeight * (offsetStartValue / 100);

			scrollRangeEndOffset = offsetEndUnit == 'px' 
				? offsetEndValue 
				: el.scrollHeight * (offsetEndValue / 100);
		}

		return {
			start: scrollRangeStart,
			end: scrollRangeEnd,
			startOffset: scrollRangeStartOffset,
			endOffset: scrollRangeEndOffset,
			size: (scrollRangeEnd + scrollRangeEndOffset) - (scrollRangeStart + scrollRangeStartOffset),
			type
		}
	}


	/**
	 * Calculates the scroll progress as a percentage based on the given scroll position and range.
	 *
	 * This function determines how far the user has scrolled within a specified range,
	 * considering the viewport size, target element offsets, and different range types.
	 *
	 * @param {number} scrollPos - The current scroll position.
	 * @param {Object} scrollRange - The scroll range object containing start, end, offsets, and type.
	 *
	 * @returns {number} - The calculated scroll progress, clamped between 0 and 1.
	 */
	getProgress = (scrollPos, scrollRange) => {
		const wrapperSize = this.isVertical ? this.wrapperHeight : this.wrapperWidth;
		const winSize = this.isVertical ? this.winHeight : this.winWidth;

    	// Calculate scroll start and end offsets
		let scrollStart = Math.max(0, scrollRange.startOffset) - scrollPos;
		let scrollEnd = wrapperSize + Math.min(0, scrollRange.endOffset) - winSize - scrollPos;
	
		let rangeTypeModifierStart = 0,
			rangeTypeModifierEnd = 0;

		// Adjust modifiers based on scrollRange type
		if (scrollRange.start != 0 || scrollRange.end != wrapperSize) {
			switch(scrollRange.type) {
				case 'targetInView':
					rangeTypeModifierStart = winSize;
					break;
				case 'targetInViewCenter':
					rangeTypeModifierStart = winSize/2;
					rangeTypeModifierEnd = winSize/2;
					break;
			}

			// Adjust scrollStart and scrollEnd based on modifiers
			scrollStart = (scrollRange.start + scrollRange.startOffset + rangeTypeModifierStart > winSize) 
				? (scrollRange.start + scrollRange.startOffset - rangeTypeModifierStart - scrollPos) 
				: (0 - scrollPos);

			scrollEnd = (wrapperSize - scrollRange.end - scrollRange.endOffset + rangeTypeModifierEnd > winSize) 
				? (scrollRange.end + scrollRange.endOffset - rangeTypeModifierEnd - scrollPos) 
				: (wrapperSize - winSize - scrollPos);
		}
		
		// Calculate scroll progression percentage
		let scrollPercentage = scrollStart / (scrollEnd - scrollStart) * -100;
		
		// Clamp value between 0 and 100
		scrollPercentage = Math.min(100, Math.max(0, scrollPercentage));
		
		/*console.log('scrollPos: ' + scrollPos + '  ||  scrollPercentage: ' + Math.round(scrollPercentage * 100) / 100);
		console.log('scrollStart: ' + scrollStart + '  ||  scrollEnd: ' + scrollEnd);
		console.log('scrollRangeStart: ' + scrollRange.start + '  ||  scrollRangeEnd: ' + scrollRange.end);
		console.log('scrollRangeStartOffset: ' + scrollRange.startOffset + '  ||  scrollRangeEndOffset: ' + scrollRange.endOffset);
		console.log('rangeTypeModifierStart: ' + rangeTypeModifierStart + '  ||  rangeTypeModifierEnd: ' + rangeTypeModifierEnd);*/

		//console.log(scrollPercentage);

		return Math.round(scrollPercentage) / 100;
	}


	/**
	 * Updates the scroll progress for each cached block along with triggers and trackers.
	 * 
	 * @returns {void} - This function does not return a value.
	 */
	update = () => {
		for (let i = 0; i < this.blocks.length; i++) {
			this.blocks[i].progress = this.getProgress(
				this.getScrollPos(),
				this.blocks[i].scrollRange
			);
		}
		requestAnimationFrame(this.animate);

		this.triggerClasses();
		this.trackProperties();
	}


	/**
	 * Applies animations to all blocks based on their progress within the scroll range.
	 *
	 * @returns {void} - This function does not return a value.
	 */
	animate = () => {
		for (let i = 0; i < this.blocks.length; i++) {
			const block = this.blocks[i];

			// Skip blocks without animations
			if (!block.animations.length) continue; 

			const targetSize = block.scrollRange.end - block.scrollRange.start;
			const progress = block.progress;
			const breakpoint = this.currentBreakpoint;
			const styles = [];
	
			for (let j = 0; j < block.animations.length; j++) {
				const animation = block.animations[j];
	
				if (animation.move && (!animation.move.responsive || animation.move.responsive[breakpoint])) {
					styles.push( move(animation.move, progress, targetSize, breakpoint) );
				}
				if (animation.rotate && (!animation.rotate.responsive || animation.rotate.responsive[breakpoint])) {
					styles.push( rotate(animation.rotate, progress) );
				}
				if (animation.scale && (!animation.scale.responsive || animation.scale.responsive[breakpoint])) {
					styles.push( scale(animation.scale, progress) );
				}
				if (animation.fade && (!animation.fade.responsive || animation.fade.responsive[breakpoint])) {
					styles.push( fade(animation.fade, progress) );
				}
				if (animation.blur && (!animation.blur.responsive || animation.blur.responsive[breakpoint])) {
					styles.push( blur(animation.blur, progress) );
				}
			}
		
			// Apply styles if any animations were processed
			if (styles.length) {
				this.elems[i].style.cssText = styles.join('; ');
			}
			// Scaling formula: targetValue = targetMin + (targetMax - targetMin) * (sourceValue - sourceMin) / (sourceMax - sourceMin)
		}
	}


	/**
	 * Destroys the current Scrollage instance, resetting styles and removing event listeners.
	 *
	 * This function:
	 * - Resets all elements to their original styles.
	 * - Clears the cached `blocks` array.
	 * - Removes scroll and touch event listeners from the wrapper or document.
	 * - Removes resize and orientation change listeners from the window.
	 */
	destroy = () => {
		// Reset all elements styles
		for (let i = 0; i < this.elems.length; i++) {
			this.elems[i].style.cssText = this.blocks[i].style;
		}
		// Remove cached elements
		this.blocks = [];
		this.triggers = [];
		this.trackers = [];

		// Remove event listeners
		(this.options.wrapper ? this.wrapper : document).removeEventListener('scroll', this.update);
		(this.options.wrapper ? this.wrapper : document).removeEventListener('touchmove', this.update);
		window.removeEventListener('resize', debounce(this.init.bind(this)));
		window.removeEventListener('orientationchange', debounce(this.init.bind(this)));
	}
}

// Expose Scrollage globally for browsers
if (typeof window !== 'undefined') {
    window.Scrollage = Scrollage;
}