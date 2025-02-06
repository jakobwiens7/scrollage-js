/**
 * ScrollageJS v0.89
 * Animate elements by scrolling
 * Copyright (c) 2022 Jakob Wiens - TezmoMedia
 */

 (function (root, factory) {
	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define([], factory);
	} else if (typeof module === 'object' && module.exports) {
		// Node. Does not work with strict CommonJS, but
		// only CommonJS-like environments that support module.exports,
		// like Node.
		module.exports = factory();
	} else {
		// Browser globals (root is window)
		root.Scrollage = factory();
	}
}(typeof window !== "undefined" ? window : global, function () {
	var Scrollage = function(el, options) {
		"use strict";

		var self = Object.create(Scrollage.prototype);
        var blocks = [],
			triggers = [],
			trackers = [];
		var isVertical,
			wrapper,
			wrapperHeight,
			wrapperWidth,
			winHeight,
			winWidth;

		// Test via a getter in the options object to see if the passive property is accessed
		var supportsPassive = false;
		try {
			var opts = Object.defineProperty({}, 'passive', {
				get: function() {
					supportsPassive = true;
				}
			});
			window.addEventListener("testPassive", null, opts);
			window.removeEventListener("testPassive", null, opts);
		} catch (e) {}

		// Default Settings
		self.options = {
			breakpoints: [781, 1024, 1366],
			wrapper: null,
			direction: 'vertical',

			hasScrolledEnabled: true,
			hasScrolledClass: 'has-scrolled',
			hasScrolledOffset: 0,

			triggers: [
				/*{
					selector: '#home', 		// element or selector string
					identifier: 'home', 	// string (=class suffix)
					position: 100, 			// [optional] number (%) or string like '100px'
					target: null			// [optional] element, selector string or '_self' to add the class on the triggering element itself, defaults to wrapper
				}*/
			],
			hasTriggeredClassPrefix: 'has-triggered-',

			trackers: [
				/*{
					selector: '.site-header', 	// element or selector string
					identifier: 'nav-height',	// string (css variable => '--nav-height')
					target: null				// [optional] element or selector string, defaults to wrapper
				}*/
			]

			//callback: function() {},
		};

		// User defined options (might have more in the future)
		if (options) {
			Object.keys(options).forEach(function(key) {
				self.options[key] = options[key];
			});
		}

		// Validate user defined custom breakpoints
		function validateCustomBreakpoints() {
			if (self.options.breakpoints.length === 3 && Array.isArray(self.options.breakpoints)) {
				var isAscending = true;
				var isNumerical = true;
				var lastVal;

				self.options.breakpoints.forEach(function(i) {
					if (typeof i !== 'number') isNumerical = false;
					if (lastVal !== null) {
						if (i < lastVal) isAscending = false;
					}
					lastVal = i;
				});
				if (isAscending && isNumerical) return;
			}
			// Revert to default if set incorrectly
			self.options.breakpoints = [781, 1024, 1366];
			console.warn("Scrollage: The breakpoints option requires you to provide an array of 3 values in ascending order.");
		}

		if (options && options.breakpoints) {
			validateCustomBreakpoints();
		}
		// Gather and validate elements
		if (!el) el = '.scrollage';
		var elements = typeof el === 'string' ? document.querySelectorAll(el) : [el];

		if (elements.length > 0) {
			self.elems = elements;
        } else {
			console.warn("Scrollage: The elements you're trying to select don't exist.");
		}

		// Check for wrapper and wether it exists
		if (self.options.wrapper) {
			if (!self.options.wrapper.nodeType) {
				var wrapper = document.querySelector(self.options.wrapper);

				if (wrapper) {
					self.options.wrapper = wrapper;
				} else {
					console.warn("Scrollage: The wrapper you're trying to use doesn't exist.");
					//return;
				}
			}
		}

		// Set a placeholder for the current breakpoint
		var currentBreakpoint;


		// Helper: Determine current breakpoint
		var getCurrentBreakpoint = function(w) {
			var bp = self.options.breakpoints;
			if (w <= bp[0]) return 'phone';
			if (w > bp[0] && w <= bp[1]) return 'tablet';
			if (w > bp[1] && w <= bp[2]) return 'laptop';
			return 'desktop';
		};

		// Helper: Split string in value and unit
		var splitValueUnit = function(str) {
			if (!str || typeof str !== 'string') return;
			let strSplit = str.match(/^([-.\d]+(?:\.\d+)?)(.*)$/);
		
			return {
				'value': Number(strSplit[1].trim()),
				'unit': strSplit[2].trim()
			}
		}

		// Helper: Debounce function
		function debounceFunc(fn, delay) {
			let newFn;
			return function(...args) {
				if (newFn) clearTimeout(newFn);
				
				newFn = setTimeout(() => {
					fn(...args)
				}, delay);
		  
			 }
		};
		let debounceRefresh = debounceFunc(() => {
			(self.options.wrapper ? wrapper : document).removeEventListener('scroll', self.updateProgress);
			(self.options.wrapper ? wrapper : document).removeEventListener('touchmove', self.updateProgress);
			self.refresh();
		}, 120);

		// Remove Event listeners
		/*function removeEventListeners() {
			(self.options.wrapper ? wrapper : document).removeEventListener('scroll', self.updateProgress);
			(self.options.wrapper ? wrapper : document).removeEventListener('touchmove', self.updateProgress);
			window.removeEventListener('resize', debounceRefresh);
			window.removeEventListener('orientationchange', debounceRefresh);
		}*/

		// Helper: Optimized Easing Functions by Michael "Code Poet" Pohoreski, aka Michaelangel007
		// https://github.com/Michaelangel007/easing
		var EasingFuncs = {
			InSine:         function(p) { return 1 - Math.cos(p * Math.PI*0.5); },
			OutSine:        function(p) { return Math.sin(p * Math.PI*0.5); },
			InOutSine:      function(p) { 
				return 0.5*(1 - Math.cos(p * Math.PI));
			},
			InCubic:        function(p) { return p*p*p; },
			OutCubic:       function(p) { var m=p-1; return 1+m*m*m; },
			InOutCubic:     function(p) { var m=p-1,t=p*2; 
				if (t < 1) return p*t*t; 
				return 1+m*m*m*4; 
			},
			InQuintic:      function(p) { return p*p*p*p*p; },
			OutQuintic:     function(p) { var m=p-1; return 1+m*m*m*m*m; },
			InOutQuintic:   function(p) { var m=p-1,t=p*2; 
				if (t < 1) return p*t*t*t*t; 
				return 1+m*m*m*m*m*16;
			},
			InCircle:       function(p) { return 1-Math.sqrt(1 - p*p); },
			OutCircle:      function(p) { var m=p-1; return  Math.sqrt(1 -m*m); },
			InOutCircle:    function(p) { var m=p-1,t=p*2; 
				if (t < 1) return (1-Math.sqrt(1 - t*t))*0.5; 
				else return (Math.sqrt(1 - 4*m*m) + 1) * 0.5;
			},
			InBack: 		function(p) { var k=1.70158; return p*p*(p*(k+1) - k); },
			OutBack:        function(p) { var m=p-1, k=1.70158; return 1 + m*m*(m*(k+1) + k); },
			InOutBack:      function(p) { var m=p-1,t=p*2, k=1.70158 * 1.525; 
				if (p < 0.5) return p*t*(t*(k+1) - k); 
				else return 1 + 2*m*m*(2*m*(k+1) + k);
			},
			InBounce:       function(p) { return 1 - EasingFuncs.OutBounce( 1-p ); },
			OutBounce:      function(p) { var r=1/2.75; var k1=r; var k2=2*r; var k3=1.5*r; var k4=2.5*r; var k5=2.25*r; var k6=2.625*r; var k0=7.5625, t;
				if (p < k1) 	 { return k0*p*p; }
				else if (p < k2) { t = p-k3; return k0*t*t + 0.75;		}
				else if (p < k4) { t = p-k5; return k0*t*t + 0.9375;	}
				else             { t = p-k6; return k0*t*t + 0.984375;	}
			},
			InOutBounce:    function(p) { var t=p*2; 
				if (t < 1) return 0.5 - 0.5*EasingFuncs.OutBounce(1-t); 
				return 0.5 + 0.5*EasingFuncs.OutBounce(t-1);
			},
			InElastic:     	function(p) { var m=p-1; return - Math.pow(2,10*m) * Math.sin((m*40 - 3) * Math.PI/6); },
			OutElastic: 	function(p) { return 1+(Math.pow(2,10*-p) * Math.sin((-p*40 - 3) * Math.PI/6)); },
			InOutElastic:   function(p) { var s=2*p-1; var k=(80*s-9) * Math.PI/18; 
				if (s < 0) return -0.5*Math.pow(2, 10*s) * Math.sin(k);
				else return 1 +0.5*Math.pow(2,-10*s) * Math.sin(k);
			},
		};

		// Helper: Get current scroll position
		var scrollPos = function() {
			return isVertical ? wrapper.scrollTop : wrapper.scrollLeft;
		}


		// Get and cache initial position of all elements
		var cacheBlocks = function() {
			if (!self.elems) return;

			for (var i = 0; i < self.elems.length; i++) {
			    var block = createBlock(self.elems[i]);
			    blocks.push(block);
			}
		};

		// Get and cache triggers
		var cacheTriggers = function() {
			if (!self.options.triggers || !Array.isArray(self.options.triggers)) return;

			for (var i = 0; i < self.options.triggers.length; i++) {
				var trigger = self.options.triggers[i];

				if (trigger.hasOwnProperty('selector') && trigger.hasOwnProperty('identifier')) {

					var el;
					if (typeof trigger.selector === 'string') {
						el = document.querySelector(trigger.selector);
					} else if (trigger.selector.nodeType) {
						el = trigger.selector;
					}

					if (!el) {
						console.warn("Scrollage: The trigger element you're trying to select does not exist.");
						break;
					}

					if (typeof trigger.identifier !== 'string') {
						console.warn("Scrollage: The trigger identifier needs to be a string.");
						break;
					}

					var elPos = (isVertical ? el.getBoundingClientRect().top : el.getBoundingClientRect().left) + scrollPos();
					var elOffset = 0,
						offsetValue = 0,
						offsetUnit = '%';

					if (trigger.hasOwnProperty('position')) {
						if (typeof trigger.position === 'string') {
							offsetValue = splitValueUnit(trigger.position)?.value || 0;
							offsetUnit = splitValueUnit(trigger.position)?.unit || '%';
						} else {
							offsetValue = trigger.position || 0;
						}
						elOffset = offsetUnit == 'px' ? offsetValue : el.clientHeight * (offsetValue / 100)
					} 

					var targetEl = null;
					if (trigger.hasOwnProperty('target')) {
						if (typeof trigger.target === 'string') {
							targetEl = (trigger.target === '_self' ? el : document.querySelector(trigger.target));
						} else {
							targetEl = trigger.target;
						}
					}
					if (!targetEl || !targetEl.nodeType) {
						targetEl = wrapper;
					}

					triggers.push({
						position: elPos + elOffset,
						class: self.options.hasTriggeredClassPrefix + trigger.identifier,
						targetEl
					});
				}	
			}
		};

		// Get and cache trackers
		var cacheTrackers = function() {
			if (!self.options.trackers || !Array.isArray(self.options.trackers)) return;

			for (var i = 0; i < self.options.trackers.length; i++) {
				var tracker = self.options.trackers[i];

				if (tracker.hasOwnProperty('selector') && tracker.hasOwnProperty('identifier')) {

					var el;
					if (typeof tracker.selector === 'string') {
						el = document.querySelector(tracker.selector);
					} else if (tracker.selector.nodeType) {
						el = tracker.selector;
					}

					if (!el) {
						console.warn("Scrollage: The tracker element you're trying to select does not exist.");
						break;
					}

					if (typeof tracker.identifier !== 'string') {
						console.warn("Scrollage: The tracker identifier needs to be a string.");
						break;
					}

					var targetEl = null;
					if (tracker.hasOwnProperty('target')) {
						if (typeof tracker.target === 'string') {
							targetEl = (tracker.target === '_self' ? el : document.querySelector(tracker.target));
						} else {
							targetEl = tracker.target;
						}
					}
					if (!targetEl || !targetEl.nodeType) {
						targetEl = wrapper;
					}

					trackers.push({
						el,
						property: '--' + tracker.identifier,
						targetEl
					});
				}
			}
		};

		// Build array for cached element values
		var init = function() {
			isVertical = self.options.direction !== 'horizontal';
			wrapper = self.options.wrapper || document.documentElement || document.body.parentNode || document.body;
			wrapperHeight = wrapper.scrollHeight;
			wrapperWidth = wrapper.scrollWidth;
			winHeight = window.innerHeight;
			winWidth = window.innerWidth;
			currentBreakpoint = getCurrentBreakpoint(winWidth);

			// Reset cached elements
			blocks = [];
			triggers = [];
			trackers = [];

			// Recache elements
			cacheBlocks();
			cacheTriggers();
			cacheTrackers();

			// Animate / update elements
			animate();
			triggerClasses();
			trackProperties();

			// Window resize & orientation change listeners
			window.addEventListener("resize", debounceRefresh);
			window.addEventListener('orientationchange', debounceRefresh);

			// Scroll & touch listeners
			(self.options.wrapper ? wrapper : document).addEventListener(
				'scroll', 
				self.updateProgress,
				//supportsPassive ? { passive: true } : false
			);
			(self.options.wrapper ? wrapper : document).addEventListener(
				'touchmove',
				self.updateProgress,
				supportsPassive ? { passive: true } : false
			);
		};


		// We want to cache the scrollage blocks
		var createBlock = function(el) {
			var originalStyles = el.style;

			var dataRangeTarget = el.getAttribute( 'data-scrollage-target' );
			var dataRangeType = el.getAttribute( 'data-scrollage-range-type' );
			var dataOffsetStart = el.getAttribute( 'data-scrollage-offset-start' );
			var dataOffsetEnd = el.getAttribute( 'data-scrollage-offset-end' );

			var dataAnimationMove = el.getAttribute( 'data-scrollage-move' );
			var dataAnimationRotate = el.getAttribute( 'data-scrollage-rotate' );
			var dataAnimationScale = el.getAttribute( 'data-scrollage-scale' );
			var dataAnimationFade = el.getAttribute( 'data-scrollage-fade' );
			var dataAnimationBlur = el.getAttribute( 'data-scrollage-blur' );
			var dataAnimationBackground = el.getAttribute( 'data-scrollage-background' );

			var animations = [];
			if (dataAnimationMove && dataAnimationMove !== 'false') {
				animations.push({
					move: {
						axis: 'y', 		// string 'x', 'y', 'xy'
						startY: 0, 		// num || string '100%', '100px'
						endY: 100,		// num || string '100%', '100px'
						startX: 0, 		// num || string '100%', '100px'
						endX: 100, 		// num || string '100%', '100px'
						easing: false,
						responsive: false,
						...JSON.parse(dataAnimationMove)
					}
				});
			}
			if (dataAnimationRotate && dataAnimationRotate !== 'false') {
				animations.push({
					rotate: {
						axis: 'z', 		// string 'x', 'y', 'z', 'xy', 'xz', 'yz', 'xyz'
						start: 0,		// num
						end: 360,		// num
						easing: false,
						responsive: false,
						...JSON.parse(dataAnimationRotate)
					},
				});
			}
			if (dataAnimationScale && dataAnimationScale !== 'false') {
				animations.push({
					scale: {
						axis: 'xy', 	// string 'x', 'y', 'xy'
						start: 0,		// num
						end: 100,		// num
						easing: false,
						responsive: false,
						...JSON.parse(dataAnimationScale)
					}
				});
			}
			if (dataAnimationFade && dataAnimationFade !== 'false') {
				animations.push({
					fade: {
						start: 0,		// num 0 - 100
						end: 100,		// num 0 - 100
						easing: false,
						responsive: false,
						...JSON.parse(dataAnimationFade)
					}
				});
			}
			if (dataAnimationBlur && dataAnimationBlur !== 'false') {
				animations.push({
					blur: {
						start: 0,		// num 0 - 100
						end: 100,		// num 0 - 100
						responsive: false,
						...JSON.parse(dataAnimationBlur)
					}
				});
			}
			if (dataAnimationBackground && dataAnimationBackground !== 'false') {
				animations.push({
					background: {
						axis: 'y', 		// string 'x', 'y', 'xy'
						speedX: 0,
						speedY: 0,

						startY: 0, 		// num || string '100%', '100px'
						endY: 100,		// num || string '100%', '100px'
						startX: 0, 		// num || string '100%', '100px'
						endX: 100, 		// num || string '100%', '100px'
						//easing: false,

						responsive: false,
						...JSON.parse(dataAnimationBackground)
					}
				});
			}

			// Check whether target is a valid element node
			if ( dataRangeTarget ) {
				if ( typeof dataRangeTarget === 'string' ) {
					dataRangeTarget = document.querySelector(dataRangeTarget);
				}
				if ( !dataRangeTarget || !dataRangeTarget.nodeType ) {
					console.warn("Scrollage: The scroll range target you're trying to use doesn't exist.");
					dataRangeTarget = null;
				}
			}

			//console.log(dataRangeTarget);
			
			var scrollRange = getScrollRange(dataRangeTarget, dataRangeType, dataOffsetStart, dataOffsetEnd);
			var progress = getProgress(scrollPos(), scrollRange);
			
			return {
				progress,
				scrollRange,
				animations,
				originalStyles
			};
		};


		// Get & refresh data for scroll progress calculation
		function getScrollRange(target = null, type = 'default', offsetStart = 0, offsetEnd = 0) {
			var wrapperSize = isVertical ? wrapperHeight : wrapperWidth;

			var el = wrapper;
			var scrollRangeStart = 0;
			var scrollRangeEnd = wrapperSize;

			var offsetStartUnit,
				offsetEndUnit;

			// Split offset parameters into value + unit
			if (offsetStart !== 0) {
				offsetStartUnit = splitValueUnit(offsetStart)?.unit || '%';
				offsetStart = splitValueUnit(offsetStart)?.value || 0;
			}
			if (offsetEnd !== 0) {
				offsetEndUnit = splitValueUnit(offsetEnd)?.unit || '%';
				offsetEnd = splitValueUnit(offsetEnd)?.value || 0;
			}

			// Determine scroll offsets relative to wrapper
			var scrollRangeStartOffset = offsetStartUnit == 'px' ? offsetStart : wrapperSize * (offsetStart / 100);
			var scrollRangeEndOffset = offsetEndUnit == 'px' ? offsetEnd : wrapperSize * (offsetEnd / 100);
			
			// Check whether target is false, selector string or element node
			if ( target ) {
				el = target;
				scrollRangeStart = Math.round(( (isVertical ? el.getBoundingClientRect().top : el.getBoundingClientRect().left) + scrollPos()) * 100) / 100;
				scrollRangeEnd = Math.round(( (isVertical ? el.getBoundingClientRect().bottom : el.getBoundingClientRect().right) + scrollPos()) * 100) / 100;

				// Determine scroll offsets relative to target element
				scrollRangeStartOffset = offsetStartUnit == 'px' ? offsetStart : el.scrollHeight * (offsetStart / 100);
				scrollRangeEndOffset = offsetEndUnit == 'px' ? offsetEnd : el.scrollHeight * (offsetEnd / 100);
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

		
		// Returns calculated scroll progression in percentage
		function getProgress(scrollPos = 0, scrollRange) {
			var wrapperSize = isVertical ? wrapperHeight : wrapperWidth;
			var winSize = isVertical ? winHeight : winWidth;

			var scrollStart = (scrollRange.startOffset < 0 
				? 0 
				: scrollRange.startOffset
			) - scrollPos;

			var scrollEnd = wrapperSize + (scrollRange.endOffset > 0 
				? 0 
				: scrollRange.endOffset
			) - winSize - scrollPos;

			var rangeTypeModifierStart,
				rangeTypeModifierEnd;

			// Make sure scrollRange is not equal to the wrapper
			if (scrollRange.start != 0 || scrollRange.end != wrapperSize) {

				switch(scrollRange.type) {
					case 'targetInView':
						rangeTypeModifierStart = winSize;
						rangeTypeModifierEnd = 0;
						break;
					case 'targetInViewCenter':
						rangeTypeModifierStart = winSize/2;
						rangeTypeModifierEnd = winSize/2;
						break;
					default:
						rangeTypeModifierStart = 0;
						rangeTypeModifierEnd = 0;
				}

				scrollStart = (scrollRange.start + scrollRange.startOffset + rangeTypeModifierStart > winSize) 
					? (scrollRange.start + scrollRange.startOffset - rangeTypeModifierStart - scrollPos) 
					: (0 - scrollPos);

				scrollEnd 	= (wrapperSize - scrollRange.end - scrollRange.endOffset + rangeTypeModifierEnd > winSize) 
					? (scrollRange.end + scrollRange.endOffset - rangeTypeModifierEnd - scrollPos) 
					: (wrapperSize - winSize - scrollPos);
			}
			
			// Actually calculate the scroll progression
			var scrollPercentage = scrollStart / (scrollEnd - scrollStart) * -100;
			
			// Limit 'scrollPercentage' to 0 - 100
			scrollPercentage = scrollPercentage < 0 ? 0 : scrollPercentage;
			scrollPercentage = scrollPercentage > 100 ? 100 : scrollPercentage;
			
			/*
			console.log('scrollPos: ' + scrollPos + '  ||  scrollPercentage: ' + Math.round(scrollPercentage * 100) / 100);
			console.log('scrollStart: ' + scrollStart + '  ||  scrollEnd: ' + scrollEnd);
			console.log('scrollRangeStart: ' + scrollRange.start + '  ||  scrollRangeEnd: ' + scrollRange.end);
			console.log('scrollRangeStartOffset: ' + scrollRange.startOffset + '  ||  scrollRangeEndOffset: ' + scrollRange.endOffset);
			console.log('rangeTypeModifierStart: ' + rangeTypeModifierStart + '  ||  rangeTypeModifierEnd: ' + rangeTypeModifierEnd);
			*/
			
			return Math.round(scrollPercentage) / 100;
		}


		// Applies easing if enabled and returns calculated animation value
		function getAnimationProgress(start, end, progress = 0, easing = false ) {

			if (easing && typeof easing === 'string') {
				progress = EasingFuncs[easing](progress);
			}
			return Math.round( (start + (end - start) * progress) * 100 ) / 100;
		}

		// Animate all blocks
		var animate = function() {

			for (var i = 0; i < blocks.length; i++) {
				if (blocks[i].animations.length) {
					let styles = [];
					
					for (var j = 0; j < blocks[i].animations.length; j++) {
						let progress = blocks[i].progress;
						let targetSize = blocks[i].scrollRange.end - blocks[i].scrollRange.start;
						let animation = blocks[i].animations[j];

						// Animation move
						if (animation.move && (!animation.move.responsive || animation.move.responsive[currentBreakpoint])) {

							let valueX = 0,
								valueY = 0;

							if (animation.move.axis.toLowerCase().includes('x')) {
								let startX = 0,
									endX = 100;

								if (animation.move.startX !== 0) {
									let startXValue = splitValueUnit(animation.move.startX)?.value || 0;
									let startXUnit = splitValueUnit(animation.move.startX)?.unit || '%';

									if (animation.move.responsive[currentBreakpoint]?.startX) {
										startXValue = splitValueUnit(animation.move.responsive[currentBreakpoint].startX)?.value || 0;
										startXUnit = splitValueUnit(animation.move.responsive[currentBreakpoint].startX)?.unit || '%';
									}
									startX = (startXUnit == 'px' ? startXValue*100 : targetSize * startXValue);
								}
								if (animation.move.endX !== 0) {
									let endXValue = splitValueUnit(animation.move.endX)?.value || 0;
									let endXUnit = splitValueUnit(animation.move.endX)?.unit || '%';

									if (animation.move.responsive[currentBreakpoint]?.endX) {
										endXValue = splitValueUnit(animation.move.responsive[currentBreakpoint].endX)?.value || 0;
										endXUnit = splitValueUnit(animation.move.responsive[currentBreakpoint].endX)?.unit || '%';
									}
									endX = (endXUnit == 'px' ? endXValue*100 : targetSize * endXValue);
								}
								valueX = getAnimationProgress(startX, endX, progress, animation.move.easing) / 100;
							}

							if (animation.move.axis.toLowerCase().includes('y')) {
								let startY = 0,
									endY = 100;

								if (animation.move.startY !== 0) {
									let startYValue = splitValueUnit(animation.move.startY)?.value || 0;
									let startYUnit = splitValueUnit(animation.move.startY)?.unit || '%';

									if (animation.move.responsive[currentBreakpoint]?.startY) {
										startYValue = splitValueUnit(animation.move.responsive[currentBreakpoint]?.startY)?.value || 0;
										startYUnit = splitValueUnit(animation.move.responsive[currentBreakpoint]?.startY)?.unit || '%';
									}
									startY = (startYUnit == 'px' ? startYValue*100 : targetSize * startYValue);
								}
								if (animation.move.endY !== 0) {
									let endYValue = splitValueUnit(animation.move.endY)?.value || 0;
									let endYUnit = splitValueUnit(animation.move.endY)?.unit || '%';

									if (animation.move.responsive[currentBreakpoint]?.endY) {
										startYValue = splitValueUnit(animation.move.responsive[currentBreakpoint]?.endY)?.value || 0;
										startYUnit = splitValueUnit(animation.move.responsive[currentBreakpoint]?.endY)?.unit || '%';
									}
									endY = (endYUnit == 'px' ? endYValue*100 : targetSize * endYValue);
								}
								valueY = getAnimationProgress(startY, endY, progress, animation.move.easing) / 100;
							}
							styles.push( 'translate:' + valueX + 'px ' + valueY + 'px' );
						}

						// Animation rotate
						if (animation.rotate && (!animation.rotate.responsive || animation.rotate.responsive[currentBreakpoint])) {
							let value = getAnimationProgress(animation.rotate.start, animation.rotate.end, progress, animation.rotate.easing);

							if ('z' !== animation.rotate.axis.toLowerCase()) {
								let axis = animation.rotate.axis.toLowerCase().split('');
								styles.push('rotate:' + (axis.includes('x') ? 1 : 0) + ' ' + (axis.includes('y') ? 1 : 0) + ' ' + (axis.includes('z') ? 1 : 0) + ' ' + (value + 'deg') );
							} else {
								styles.push( 'rotate:' + value + 'deg' );
							}
						}

						// Animation scale
						if (animation.scale && (!animation.scale.responsive || animation.scale.responsive[currentBreakpoint])) {
							let value = getAnimationProgress(animation.scale.start, animation.scale.end,progress, animation.scale.easing) / 100;

							if ('xy' !== animation.scale.axis.toLowerCase()) {
								styles.push( 'scale:' + ('x' == animation.scale.axis.toLowerCase() ? value : 1) + ' ' + ('y' == animation.scale.axis.toLowerCase() ? value : 1) );
							} else {
								styles.push( 'scale:' + value );
							}
						}

						// Animation fade
						if (animation.fade && (!animation.fade.responsive || animation.fade.responsive[currentBreakpoint])) {
							let value = getAnimationProgress(animation.fade.start, animation.fade.end, progress, animation.fade.easing) / 100;
							styles.push( 'opacity:' + value );
						}

						// Animation blur
						if (animation.blur && (!animation.blur.responsive || animation.blur.responsive[currentBreakpoint])) {
							let value = getAnimationProgress(animation.blur.start, animation.blur.end, progress);
							styles.push( 'filter:blur(' + value + 'px)' );
						}


						// WIP

						// Animation background
						if (animation.background && (!animation.background.responsive || animation.background.responsive[currentBreakpoint])) {
							let valueX = 0,
								valueY = 0;

							//let scrollDist

							console.log(blocks[i].scrollRange);

							if (!isVertical) {
								let startX = 0,
									endX = 100;

								/*if (animation.background.startX !== 0) {
									let startXValue = splitValueUnit(animation.background.startX)?.value || 0;
									let startXUnit = splitValueUnit(animation.background.startX)?.unit || '%';

									if (animation.background.responsive[currentBreakpoint]?.startX) {
										startXValue = splitValueUnit(animation.background.responsive[currentBreakpoint].startX)?.value || 0;
										startXUnit = splitValueUnit(animation.background.responsive[currentBreakpoint].startX)?.unit || '%';
									}
									startX = (startXUnit == 'px' ? startXValue*100 : targetSize * startXValue);
								}
								if (animation.background.endX !== 0) {
									let endXValue = splitValueUnit(animation.background.endX)?.value || 0;
									let endXUnit = splitValueUnit(animation.background.endX)?.unit || '%';

									if (animation.background.responsive[currentBreakpoint]?.endX) {
										endXValue = splitValueUnit(animation.background.responsive[currentBreakpoint].endX)?.value || 0;
										endXUnit = splitValueUnit(animation.background.responsive[currentBreakpoint].endX)?.unit || '%';
									}
									endX = (endXUnit == 'px' ? endXValue*100 : targetSize * endXValue);
								}*/

								startX = targetSize * startXValue;
								endX = targetSize * endXValue;

								valueX = getAnimationProgress(startX, endX, progress, animation.background.easing) / 100;
							}

							if (isVertical) {
								let startY = 75,
									endY = -75;

								/*if (animation.background.startY !== 0) {
									let startYValue = splitValueUnit(animation.background.startY)?.value || 0;
									let startYUnit = splitValueUnit(animation.background.startY)?.unit || '%';

									if (animation.background.responsive[currentBreakpoint]?.startY) {
										startYValue = splitValueUnit(animation.background.responsive[currentBreakpoint]?.startY)?.value || 0;
										startYUnit = splitValueUnit(animation.background.responsive[currentBreakpoint]?.startY)?.unit || '%';
									}
									startY = (startYUnit == 'px' ? startYValue*100 : targetSize * startYValue);
								}
								if (animation.background.endY !== 0) {
									let endYValue = splitValueUnit(animation.background.endY)?.value || 0;
									let endYUnit = splitValueUnit(animation.background.endY)?.unit || '%';

									if (animation.background.responsive[currentBreakpoint]?.endY) {
										startYValue = splitValueUnit(animation.background.responsive[currentBreakpoint]?.endY)?.value || 0;
										startYUnit = splitValueUnit(animation.background.responsive[currentBreakpoint]?.endY)?.unit || '%';
									}
									endY = (endYUnit == 'px' ? endYValue*100 : targetSize * endYValue);
								}
								*/

								startY = targetSize * startY;
								endY = targetSize * endY;

								valueY = getAnimationProgress(startY, endY, progress, animation.background.easing) / 100;
							}
							styles.push( 'background-position:' + valueX + 'px ' + valueY + 'px' );
						}
					}

					// WIP


					styles = styles.join('; ')
					self.elems[i].style.cssText = blocks[i].originalStyles.cssText + styles;
				}
				// Scaling formula: targetValue = targetMin + (targetMax - targetMin) * (sourceValue - sourceMin) / (sourceMax - sourceMin)
			}
		};

		// Trigger all classes
		var triggerClasses = function() {

			// Add 'has-scrolled' class to wrapper / document
			if (self.options.hasScrolledEnabled) {
				if (scrollPos() > self.options.hasScrolledOffset || 0) {
					wrapper.classList.add(self.options.hasScrolledClass);
				} else {
					wrapper.classList.remove(self.options.hasScrolledClass);
				}
			}

			// Add 'has-triggered' classes
			for (var i = 0; i < triggers.length; i++) {
				if (scrollPos() >= triggers[i].position) {
					triggers[i].targetEl.classList.add(triggers[i].class);
				} else {
					triggers[i].targetEl.classList.remove(triggers[i].class);
				}
			}
		};

		// Track all properties
		var trackProperties = function() {
			for (var i = 0; i < trackers.length; i++) {
				trackers[i].targetEl.style.setProperty(
					trackers[i].property, 
					(isVertical ? trackers[i].el.clientHeight : trackers[i].el.clientWidth) + 'px'
				)
			}
		};

		// Recalculate the scroll progression for each block
		self.updateProgress = function() {

			// Update and animate blocks
			for (var i = 0; i < blocks.length; i++) {
				blocks[i].progress = getProgress(
					scrollPos(),
					blocks[i].scrollRange
				);
			}
			requestAnimationFrame(animate);

			// Update the trigger classes
			triggerClasses();
			trackProperties();
		};

		// Allow to get the wrapper's scroll progression whenever we want
		self.getProgress = function(target) {
			return getProgress(scrollPos(), getScrollRange(target));
		}

		// Allow to destroy the current instance
		self.destroy = function() {
			for (var i = 0; i < blocks.length; i++) {
				self.elems[i].originalStyles.cssText = blocks[i].originalStyles.cssText;
			}
			blocks = [];

			for (var i = 0; i < triggers.length; i++) {
				triggers[i].targetEl.classList.remove(triggers[i].class);
			}
			triggers = [];

			for (var i = 0; i < trackers.length; i++) {
				trackers[i].targetEl.style.removeProperty(trackers[i].property);
			}
			trackers = [];

			// Remove event listeners
			(self.options.wrapper ? wrapper : document).removeEventListener('scroll', self.updateProgress);
			(self.options.wrapper ? wrapper : document).removeEventListener('touchmove', self.updateProgress);
			window.removeEventListener('resize', debounceRefresh);
			window.removeEventListener('orientationchange', debounceRefresh);
		};

		// Init Scrollage instance
		init();

		// Allow to recalculate the initial values whenever we want
		self.refresh = init;

		return self;
    };
    return Scrollage;
}));