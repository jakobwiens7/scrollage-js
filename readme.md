# ScrollageJS

ScrollageJS is a lightweight JavaScript library that animates elements based on the scroll position. It calculates an element’s animation progress relative to a defined scroll range and applies various CSS transformations (move, rotate, scale, fade, blur) as the user scrolls.

## Installation

You can include ScrollageJS in your project by adding the compiled JavaScript file to your HTML:

    <script src="path/to/scrollage.min.js"></script>

## Usage

    <div class="target">
        <div class="scrollage"
            data-scrollage-selector=".target"
            data-scrollage-move='{"startY":"-60px", "endY":"30%"}'
        >
            My animated element
        </div>
    </div>

`.scrollage`: This element will be animated based on scrolling.

`.target`: Optional. Serves as the scroll range, that controls the scrollage element's animation progress.

ScrollageJS uses several data attributes on the animated elements to configure their behavior:

### `data-scrollage-move`

Specifies the movement animation parameters via JSON object:

    {
        "axis": "x" | "y" | "xy",
        "startX": "60px" | "30%" | 30,
        "endX": "60px" | "30%" | 30,
        "startY": "60px" | "30%" | 30,
        "endY": "60px" | "30%" | 30,
        "responsive": {
            "phone": { "startX": "60px", "endX": "30%" },
            "tablet": { "startX": "60px", "endX": "30%" },
            "laptop": { "startX": "60px", "endX": "30%" },
            "desktop": { "startX": "60px", "endX": "30%" }
        },
        "easing": "InSine" | "OutSine" | "InOutSine" | "InCubic" | ...
    }

`startX`/`endX` and `startY`/`endY`: Set the initial and final movement values in pixels or percentage. (Note: Percentages refer to the target element.)  
`axis`: Optional. Determines the direction(s) of movement. Default: `"y"`.  
`responsive`: Optional. Allows different values per breakpoint. Default: `false`.  
`easing`: Optional. Specifies the easing function to use. Default: `false`.

### `data-scrollage-rotate`

Defines rotation animation parameters via JSON object:

    {
        "axis": "x" | "y" | "z" | "xy" | "xz" | "yz" | "xyz",
        "start": 0,
        "end": 360,
        "easing": "InSine" | "OutSine" | "InOutSine" | ...
    }

`start`/`end`: Rotation angle range (in degrees).  
`axis`: Optional. Axis of rotation. Default: `"z"`.  
`easing`: Optional. Easing function. Default: `false`.

### `data-scrollage-scale`

Configures scaling animations via JSON object:

    {
        "axis": "xy" | "x" | "y",
        "start": 0,
        "end": 100,
        "easing": "InSine" | "OutSine" | "InOutSine" | ...
    }

`start`/`end`: Scaling values as percentages (0-100).  
`axis`: Optional. Determines whether scaling is applied on one or both axes. Default: `"xy"`  
`easing`: Optional. Easing function. Default: `false`.

### `data-scrollage-fade`

Specifies fade (opacity) animation settings via JSON object:

    {
        "start": 0,
        "end": 100,
        "easing": "InSine" | "OutSine" | "InOutSine" | ...
    }

`start`/`end`: Opacity percentage values (0–100).  
`easing`: Optional. Easing function. Default: `false`.

### `data-scrollage-blur`

Configures blur effect animations via JSON object:

    {
        "start": 0,
        "end": 20,
        "easing": "InSine" | "OutSine" | "InOutSine" | ...
    }

`start`/`end`: Blur values (in pixels).  
`easing`: Optional. Easing function. Default: `false`.

Note: This will heavily impact performance, so use with care - or not at all!

### `data-scrollage-selector`

By default, the `Document` or `HTML` element serves as the scroll range, that controls the animation progress of your scrollage elements.
However, this may not always be desirable, since elements get animated as soon as you start scrolling, even when they're not in view.
In order to solve this issue you can specify a target element by it's CSS Selector, which will then serve as the scroll range that controls the animation progress of your scrollage element during scrolling. The animation begins when the scroll position reaches this target.

### `data-scrollage-type`

These values let you adjust when the animation should start relative to the target's visibility:

`default`: Animation progression starts as soon as the target element’s top enters the viewport.

`targetInView`: Animation begins once the target element is fully visible (or covers the entire viewport).

`targetInViewCenter`: Animation starts when the target element reaches the center of the screen.

### `data-scrollage-offset-start` & `data-scrollage-offset-end`

Fine-tune the starting and ending positions of the scroll range used to calculate the animation progress. You can use both positive and negative values. When using percentages, the value refers to the target’s height.

**Examples:**  
`data-scrollage-offset-start="60px"`  
`data-scrollage-offset-end="30%"` or `data-scrollage-offset-end="30"`

## JavaScript Initialization

    <script>
        // Initialize Scrollage with default settings
        const scrollage = new Scrollage();
    </script>

You can pass a selector and an options object to customize behavior:

    <script>
        // Initialize Scrollage with custom settings
        const selector = '.scrollage';
        const options = {
            direction: 'vertical',
            breakpoints: [781, 1024, 1366],
            ...
        };
        const scrollage = new Scrollage(selector, options);
    </script>

When initializing ScrollageJS, you can customize its behavior via the options object:

### `direction`

Controls whether scrolling is considered `vertical` or `horizontal`.  
Default: `'vertical'`.

### `breakpoints`

An array of three numeric values to define responsive breakpoints, e.g. `[640, 980, 1280]`.  
Default: `[781, 1024, 1366]`.

### `wrapper`

The element that serves as the scroll container.  
Default: `document`.

### `hasScrolledEnabled`

If `true`, a CSS will be added to the wrapper when scroll position is > 0.  
Default: `false`.

### `hasScrolledClass`

Customize the CSS class, that is added to the wrapper when scroll position is > 0.  
Default: `'has-scrolled'`.

### `hasScrolledOffset`

Offset the required scroll position by the given value for the above CSS class to be added.  
Default: `0`

### `triggers`

You can define custom triggers, that add CSS classes when certain scroll positions are reached.  
Default: `[]`

    triggers: [
        {
            selector: "#intro",     // Element or selector string that defines the trigger range.
            identifier: "intro",    // A string used as a class suffix (e.g., "has-triggered-intro").
            position: 100,          // Optional: The position (percentage or pixel string, e.g., '100px') at which to trigger.
            target: null            // Optional: The element to which the class is added. Use '_self' to target the trigger element itself; defaults to the wrapper.
        }
    ]

### `hasTriggeredClassPrefix`

Customize the CSS class prefix for your custom triggers, e.g. `has-triggered-intro`.  
Default: `'has-triggered-'`.

### `trackers`

You can setup trackers, that track the height (maybe other properties?) of defined elements. A CSS Variable will then be added to the wrapper containing and updating it's value when scrolling.

    trackers: [
        {
            selector: ".site-header",  // Element or selector string to track.
            identifier: "nav-height",  // A string; the resulting CSS variable will be `--nav-height`.
            target: null               // Optional: The element to which the CSS variable is applied; defaults to the wrapper.
        }
    ]

## Example

Here’s a complete example combining HTML structure and JavaScript initialization:

    <!DOCTYPE html>
    <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>ScrollageJS Example</title>
            <style>
                /* Basic styles for demonstration */
                .target { position: relative; height: 200vh; }
                .scrollage { opacity: 0; }
                .has-scrolled { background-color: #f0f0f0; }
            </style>
            <script src="path/to/scrollage.min.js"></script>
        </head>
        <body>
            <div class="target">
                <div class="scrollage"
                    data-scrollage-selector=".target"
                    data-scrollage-offset-start="-60px"
                    data-scrollage-offset-end="15%"
                >
                    Animated Element
                </div>
            </div>

            <script>
                // Initialize ScrollageJS with custom options
                const scrollageInstance = new Scrollage('.scrollage', {
                    hasScrolledEnabled: true,
                    triggers: [
                        // Example trigger object
                        {
                        selector: '.target',
                        identifier: 'example',
                        position: '50%',
                        target: '_self'
                        }
                    ]
                });
            </script>
        </body>
    </html>

## JavaScript Methods

### `init()`

Manually re-caches and updates all animated elements, triggers, and trackers.  
Call this method to reinitialize the Scrollage instance after dynamic DOM changes or layout adjustments. It recalculates the dimensions of the scroll wrapper, updates the scroll positions, and re-attaches necessary event listeners.

### `getScrollPos()`

Returns the current scroll position of the defined wrapper (or the Document/HTML element if no wrapper is specified) as a percentage.  
Use this method to obtain the scroll progress relative to the total scrollable range of the target container.

### `destroy()`

Cleans up the Scrollage instance by emptying all cached elements, triggers, and trackers, and by removing all attached event listeners.  
Call this method when the instance is no longer needed or before reinitializing Scrollage to free up resources and avoid memory leaks.

## License

ScrollageJS is open source and available under the MIT License.  
See the LICENSE file for more information.
