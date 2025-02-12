// Dependencies
import { supportsPassiveEvents, debounce, splitValueUnit, calculateUnitValue, validateEl } from './utils.js';
import { getAnimationData, move, rotate, scale, fade, blur, saturate } from './animation.js';
import { getCurrentBreakpoint, isValidBreakpoints } from './breakpoints.js';

// 
import './scrollage.scss';


/**
 * ScrollageJS - A lightweight library for animating elements based on scroll position.
 *
 * @version 0.9.3
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
    static version = '0.9.3';

	// Determines if the browser supports passive event listeners.
	static supportsPassive = supportsPassiveEvents();

	// Default configuration settings for Scrollage.
    static DEFAULT_OPTIONS = {
        direction: 'vertical',
        breakpoints: [781, 1024, 1366],
        wrapper: null,
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

		this.wrapper = null;
		this.winSize = {};
		this.currentBreakpoint = null;
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
		// Validate elements and return early otherwise
		this.elems = (typeof this.el === 'string') 
			? document.querySelectorAll(this.el) 
			: NodeList.prototype.isPrototypeOf(this.el) ? this.el : [this.el];
		if (!this.elems || !this.elems.length) return;

		this.isVertical = this.options.direction !== 'horizontal';

		// Validate wrapper and set to default otherwise
		this.wrapper = this.options.wrapper 
			? validateEl(this.options.wrapper, 'wrapper') 
			: document.documentElement || document.body;

		this.wrapperSize = { x: this.wrapper.scrollWidth, y: this.wrapper.scrollHeight };

		this.winSize = { x: window.innerWidth, y: window.innerHeight };

		this.breakpoints = isValidBreakpoints(this.options.breakpoints) 
			? this.options.breakpoints 
			: Scrollage.DEFAULT_OPTIONS.breakpoints;

		this.currentBreakpoint = getCurrentBreakpoint(this.winWidth, this.breakpoints);

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
		(this.options.wrapper ? this.wrapper : window).addEventListener(
			'scroll', 
			this.update, 
			Scrollage.supportsPassive ? { passive: true } : false
		);
		(this.options.wrapper ? this.wrapper : window).addEventListener(
			'touchmove',
			this.update,
			Scrollage.supportsPassive ? { passive: true } : false
		);

		// Wrapper resize observer
		if (!this.resizeObserver) {
			this.resizeObserver = new ResizeObserver(debounce(() => this.init(), 100));
			this.resizeObserver.observe(this.wrapper);
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
	 * data attributes, stores their original styles, determines their scroll range, 
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
			const dataRangeSelector = el.getAttribute( 'data-scrollage-range' );
			const dataOffset = el.getAttribute( 'data-scrollage-offset' );

			let dataOffsetStart = el.getAttribute( 'data-scrollage-offset-start' );
			let dataOffsetEnd = el.getAttribute( 'data-scrollage-offset-end' );

			// Override dataOffsetStart and dataOffsetEnd with dataOffset is specified
			if (dataOffset) {
				// We need to negate dataOffset before using in dataOffsetEnd
				dataOffsetStart = dataOffset;
				dataOffsetEnd = dataOffset.startsWith('-') ? dataOffset.replace('-', '') : `-${dataOffset}`;
			}

			// Store original element styles
			const originalStyles = el.style.cssText;

			// Retrieve animation data for the element
			const animations = getAnimationData(el);

			// Validate and assign the scroll range element
			const rangeEl = dataRangeSelector ? validateEl(dataRangeSelector, 'range') : null;

			// Get range dimensions
			const rangeSize = { 
				x: rangeEl?.clientWidth || this.wrapper.scrollWidth, 
				y: rangeEl?.clientHeight || this.wrapper.scrollHeight
			};

			// Get element dimensions
			const elSize = {
				x: el.clientWidth, 
				y: el.clientHeight
			};

			// Compute scroll range and initial progress
			const scrollRangeData = this.getScrollRange(
				rangeEl, 
				dataOffsetStart,
				dataOffsetEnd
			);

			const progress = this.getScrollProgress(rangeEl, scrollRangeData);

			// Store the processed block
			this.blocks.push({
				progress,
				rangeEl,
				rangeSize,
				elSize,
				scrollRangeData,
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
			const rangeEl = trigger.range ? validateEl(trigger.range, 'trigger range') : null;
			if (trigger.range && !rangeEl) continue;

			// Validate target element and skip trigger if it does not exist
			const targetEl = ('_self' === trigger.target)
				? rangeEl
				: trigger.target ? validateEl(trigger.target, 'trigger target') : null;
			if (trigger.target && !targetEl) continue;
			
			const positionData = splitValueUnit(trigger.position) || { value: 0 };

			let position;
			let elPos = 0;

			// If no range specified, determine wrapper offsets...
			if (!trigger.range) {
				const contextWrapperSize = this.wrapperSize[this.isVertical ? 'y' : 'x'];

				position = calculateUnitValue(positionData.unit, positionData.value, this.winSize, contextWrapperSize);

			// ...otherwise calculate scroll range and determine range offsets
			} else {
				const contextRangeSize = this.isVertical ? rangeEl.scrollHeight : rangeEl.scrollWidth;
				const rect = rangeEl.getBoundingClientRect();
				elPos = (this.isVertical ? rect.top : rect.left) + this.getScrollPos();

				position = calculateUnitValue(positionData.unit, positionData.value, this.winSize, contextRangeSize);
			}

			this.triggers.push({
				position: elPos + position,
				class: trigger.class,
				targetEl: targetEl || this.wrapper
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
			trigger.targetEl.classList.toggle(trigger.class, scrollPos > trigger.position);
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
	 * Calculates the scroll range (start, end, and offsets) for a given element or the wrapper.
	 *
	 * - If no range element is provided, it calculates based on the wrapper’s scrollable dimensions.
	 * - Converts `px` and `%` offsets into absolute values.
	 * - Uses `getBoundingClientRect()` to determine the exact position of the range element.
	 * - Outputs the computed start and end positions, including offsets, in an object.
	 *
	 * @param {HTMLElement|null} [rangeEl=null] - The target element defining the scroll range. Defaults to the wrapper.
	 * @param {string|number} [offsetStart=0] - The start offset (e.g. `100`,`'50px'` or `'10%'`). Defaults to 0.
	 * @param {string|number} [offsetEnd=0] - The end offset (e.g. `100`,`'50px'` or `'10%'`). Defaults to 0.
	 * 
	 * @returns {Object} An object containing:
	 *   @property {number} start - The start position of the scroll range.
	 *   @property {number} end - The end position of the scroll range.
	 *   @property {number} startOffset - The computed offset for the start position.
	 *   @property {number} endOffset - The computed offset for the end position.
	 *   @property {number} size - The total size of the scroll range (end - start).
	 */
	getScrollRange = (rangeEl = null, offsetStart = 0, offsetEnd = 0) => {
		const offsetStartData = splitValueUnit(offsetStart);
		const offsetEndData = splitValueUnit(offsetEnd);
		const offsetStartValue = -offsetStartData?.value || 0;
		const offsetStartUnit = offsetStartData?.unit || '%';
		const offsetEndValue = offsetEndData?.value || 0;
		const offsetEndUnit = offsetEndData?.unit || '%';

		let scrollRangeStart = 0;
		let scrollRangeEnd = 0;
		let scrollRangeStartOffset = 0;
		let scrollRangeEndOffset = 0;

		// If no range specified, determine wrapper offsets...
		if (!rangeEl || rangeEl == this.wrapper) {
			const contextWrapperSize = this.wrapperSize[this.isVertical ? 'y' : 'x'];

			scrollRangeEnd = contextWrapperSize;

			scrollRangeStartOffset = calculateUnitValue(offsetStartUnit, offsetStartValue, this.winSize, contextWrapperSize);
			scrollRangeEndOffset = calculateUnitValue(offsetEndUnit, offsetEndValue, this.winSize, contextWrapperSize);

		// ...otherwise calculate scroll range and determine range offsets
		} else {
			const contextRangeSize = this.isVertical ? rangeEl.scrollHeight : rangeEl.scrollWidth;
			const rect = rangeEl.getBoundingClientRect();
        	const scrollPos = this.getScrollPos();

			scrollRangeStart = Math.round( ((this.isVertical ? rect.top : rect.left) + scrollPos ) * 100 ) / 100;
			scrollRangeEnd = Math.round( ((this.isVertical ? rect.bottom : rect.right) + scrollPos ) * 100 ) / 100;

			scrollRangeStartOffset = calculateUnitValue(offsetStartUnit, offsetStartValue, this.winSize, contextRangeSize);
			scrollRangeEndOffset = calculateUnitValue(offsetEndUnit, offsetEndValue, this.winSize, contextRangeSize);
		}

		const scrollRangeSize = (scrollRangeEnd + scrollRangeEndOffset) - (scrollRangeStart + scrollRangeStartOffset);

		return {
			start: scrollRangeStart,
			end: scrollRangeEnd,
			startOffset: scrollRangeStartOffset,
			endOffset: scrollRangeEndOffset,
			size: scrollRangeSize
		}
	}


	/**
	 * Calculates the scroll progression as a percentage (0 to 1) within a specified scroll range.
	 *
	 * - Determines how far the user has scrolled relative to a given range.
	 * - Can use a custom range element or default to the main wrapper.
	 * - Applies offsets only when a specific range is provided.
	 * - Clamps the result between 0 (not scrolled) and 1 (fully scrolled).
	 *
	 * @param {HTMLElement|string|null} [range=null] - The target element or selector defining the scroll range. Defaults to the wrapper.
	 * @param {Object|null} [scrollRangeData=null] - Precomputed scroll range data to avoid redundant calculations.
	 * 
	 * @returns {number} - The normalized scroll progression (0 to 1).
	 */
	getScrollProgress = (range = null, scrollRangeData = null) => {
		const scrollPos = this.getScrollPos();
		const contextWinSize = this.isVertical ? this.winSize.y : this.winSize.x;
		const contextWrapperSize = this.isVertical ? this.wrapperSize.y : this.wrapperSize.x;

		const rangeEl = range ? validateEl(range, 'range') : this.wrapper;
		if (!scrollRangeData) scrollRangeData = this.getScrollRange(rangeEl);

		// Apply range offsets
		const adjustedStart = scrollRangeData.start + scrollRangeData.startOffset;
		const adjustedEnd = scrollRangeData.end + scrollRangeData.endOffset;
			
		// Determine start and end scroll positions
		const scrollStart = range 
			? Math.max(0, adjustedStart - contextWinSize) - scrollPos
			: Math.max(0, adjustedStart) - scrollPos;

		const scrollEnd = range 
			? Math.min(contextWrapperSize - contextWinSize, adjustedEnd) - scrollPos
			: Math.min(scrollRangeData.end - contextWinSize, adjustedEnd - contextWinSize) - scrollPos;
		
		// Calculate scroll progression percentage
		let scrollPercentage = scrollStart / (scrollEnd - scrollStart) * -100;
		
		// Clamp value between 0 and 100
		scrollPercentage = Math.min(100, Math.max(0, scrollPercentage));
		
		// Debug toggle
		if (false) {
			console.log(`scrollPos: ${scrollPos}  ||  scrollPercentage: ${scrollPercentage}`);
			console.log(`scrollStart: ${scrollStart}  ||  scrollEnd: ${scrollEnd}`);
			console.log(`scrollRangeStart: ${scrollRangeData.start}  ||  scrollRangeEnd: ${scrollRangeData.end}`);
			console.log(`scrollRangeStartOffset: ${scrollRangeData.startOffset}  ||  scrollRangeEndOffset: ${scrollRangeData.endOffset}`);
			console.log(`scrollRangeSize: ${scrollRangeData.size}  ||  contextWinSize: ${contextWinSize}`);
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
				this.blocks[i].scrollRangeData
			);
		}

		this.triggerClasses();

		requestAnimationFrame(this.animate);
	}


	/**
	 * Applies animations to all blocks based on their progress within the scroll range.
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

			let transforms = [];
			let filters = [];
			let opacityValue = null;
	
			for (let j = 0; j < block.animations.length; j++) {
				const animation = block.animations[j];
	
				if (animation.move) {
					transforms.push( 
						move(animation.move.responsive?.[breakpoint] || animation.move, block.progress, block.rangeSize, block.elSize, this.winSize) 
					);
				}
				if (animation.rotate) {
					transforms.push( 
						rotate(animation.rotate.responsive?.[breakpoint] || animation.rotate, block.progress) 
					);
				}
				if (animation.scale) {
					transforms.push( 
						scale(animation.scale.responsive?.[breakpoint] || animation.scale, block.progress) 
					);
				}
				if (animation.saturate) {
					filters.push( 
						saturate(animation.saturate.responsive?.[breakpoint] || animation.saturate, block.progress) 
					);
				}
				if (animation.blur) {
					filters.push( 
						blur(animation.blur.responsive?.[breakpoint] || animation.blur, block.progress) 
					);
				}
				if (animation.fade) {
					opacityValue = fade(animation.fade.responsive?.[breakpoint] || animation.fade, block.progress);
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
		(this.options.wrapper ? this.wrapper : window).removeEventListener('scroll', this.update);
		(this.options.wrapper ? this.wrapper : window).removeEventListener('touchmove', this.update);
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