# ScrollageJS

ScrollageJS is a lightweight JavaScript library that animates elements based on the scroll position. It calculates an element’s animation progress relative to a defined scroll range and applies various CSS transformations and effects as the user scrolls.

## Installation

You can include ScrollageJS in your project by adding the compiled JavaScript file to your HTML:

    <script src="path/to/scrollage.min.js"></script>

## Usage

    <div class="range">
        <div class="scrollage"
            data-scrollage-range=".range"
            data-scrollage-move='{"startY":"-60px", "endY":"30%"}'
        >
            My animated element
        </div>
    </div>

- `.scrollage`: This element will be animated based on scrolling.
- `.range`: Optional. Serves as the scroll range that controls the scrollage element's animation progress.

ScrollageJS uses several data attributes on the animated elements to configure their behavior:

### `data-scrollage-move`

Specifies the movement animation parameters via JSON object:

    {
        "startX": 30 | "30%" | "-60px" | "15vw",
        "endX": -30 | "-30%" | "-60px" | "-15vw",
        "startY": -30 | "-30%" | "-60px" | "-15vh",
        "endY": 30 | "30%" | "60px" | "15vh",
        "responsive": {
            "phone": { "startX": 30 | "30%" | "60px" | "15vw", ... },
            "tablet": { "endX": 30 | "30%" | "60px" | "15vw", ... },
            "laptop": { "endY": 30 | "30%" | "60px" | "15vh", ... },
            "desktop": { "startY": 30 | "30%" | "60px" | "15vh", ... }
        },
        "easing": "InSine" | "OutSine" | "InOutSine" | "InCubic" | ...
    }

- `startX`/`endX`: The initial and final horizontal movement values (in percentage, pixels or `vw`). Default: `0`.
- `startY`/`endY`: The initial and final vertical movement values (in percentage, pixels or `vh`). Default: `0`.
- `responsive`: Optional. Allows different values per breakpoint. Default: `false`.
- `easing`: Optional. Specifies the easing function to use. Default: `false`.

Note: Percentages refer to the range or wrapper element.

### `data-scrollage-rotate`

Defines rotation animation parameters via JSON object:

    {
        "end": -360 | "-360deg",
        "responsive": { ... }
        "easing": "InSine" | "OutSine" | "InOutSine" | ...
    }

or

    {
        "endY": -360 | "-360deg",
        "startX": 180 | "180deg",
        "responsive": { ... }
        "easing": "InSine" | "OutSine" | "InOutSine" | ...
    }

- `start` / `end`: The initial and final rotation angles (in degrees) on the default axis (`Z`).
  - Shortcut for `startZ` / `endZ` (same effect).
  - Default: `0`.
- `startX` / `endX`: Rotation angles for the X-axis (ignored if `start` / `end` are set). Default: `0`.
- `startY` / `endY`: Rotation angles for the Y-axis (ignored if `start` / `end` are set). Default: `0`.
- `startZ` / `endZ`: Rotation angles for the Z-axis (same as `start` / `end`, but explicit). Default: `0`.
- `responsive`: Optional. Allows different values per breakpoint. Default: `false`.
- `easing`: Optional. Easing function. Default: `false`.

### `data-scrollage-scale`

Configures scaling animations via JSON object:

    {
        "end": 150 | "150%",
        "responsive": { ... }
        "easing": "InSine" | "OutSine" | "InOutSine" | ...
    }

or

    {
        "startY": 0 | "0%",
        "endX": 150 | "150%",
        "responsive": { ... }
        "easing": "InSine" | "OutSine" | "InOutSine" | ...
    }

- `start` / `end`: The initial and final scale values for both X and Y axes (in percentage).
  - Shortcut for `startX` / `endX` and `startY` / `endY` (same effect).
  - Default: `100`.
- `startX` / `endX`: Scale values for the X-axis in percentage (ignored if `start` / `end` are set). Default: `100`.
- `startY` / `endY`: Scale values for the Y-axis in percentage (ignored if `start` / `end` are set). Default: `100`.
- `responsive`: Optional. Allows different values per breakpoint. Default: `false`.
- `easing`: Optional. Easing function. Default: `false`.

### `data-scrollage-fade`

Specifies fade (opacity) animation settings via JSON object:

    {
        "start": 0 | "0%",
        "responsive": { ... }
        "easing": "InSine" | "OutSine" | "InOutSine" | ...
    }

- `start`/`end`: The initial and final opacity in percentage (0–100). Default: `100`.
- `responsive`: Optional. Allows different values per breakpoint. Default: `false`.
- `easing`: Optional. Easing function. Default: `false`.

### `data-scrollage-saturate`

Configures saturation animations via JSON object:

    {
        "start": 0 | "0%",
        "end": 150 | "150%",
        "responsive": { ... }
        "easing": "InSine" | "OutSine" | "InOutSine" | ...
    }

- `start`/`end`: The initial and final saturation in percentage. Default: `100`.
- `responsive`: Optional. Allows different values per breakpoint. Default: `false`.
- `easing`: Optional. Easing function. Default: `false`.

### `data-scrollage-blur`

Configures blur effect animations via JSON object:

    {
        "end": 16 | "16px",
        "responsive": { ... }
        "easing": "InSine" | "OutSine" | "InOutSine" | ...
    }

- `start`/`end`: The initial and final blur values in pixels. Default: `0`.
- `responsive`: Optional. Allows different values per breakpoint. Default: `false`.
- `easing`: Optional. Easing function. Default: `false`.

Note: This can heavily impact performance, especially on lower end devices! You have been warned!

### `data-scrollage-range`

By default, ScrollageJS uses the entire page (`documentElement`) as the scroll range, that controls the animation progress. However, you can define any element as the scroll range by specifying a CSS selector. This ensures animations start when the element enters the viewport and end when it leaves.

**Examples:**  
`data-scrollage-range="#my-section"`  
`data-scrollage-range="section.animation-range"`

### `data-scrollage-offset`

Adjust the starting and ending positions of the animation by applying an offset to the scroll range. In vertical mode, this modifies the top and bottom positions. In horizontal mode, it affects the left and right positions. You can use positive or negative numbers with `%`, `px`, `vh` or `vw` units.

**Examples:**  
`data-scrollage-offset="-30%"` or `data-scrollage-offset="-30"`  
`data-scrollage-offset="15vh"` or `data-scrollage-offset="15vw"`  
`data-scrollage-offset="60px"`

### `data-scrollage-offset-start` & `data-scrollage-offset-end`

Adjust the starting and ending positions of the animation by applying individual offsets to the scroll range. In vertical mode, this modifies the top and bottom positions. In horizontal mode, it affects the left and right positions. You can use positive or negative numbers with `%`, `px`, `vh` or `vw` units.

**Examples:**  
`data-scrollage-offset-end="30%"` or `data-scrollage-offset-end="30"`  
`data-scrollage-offset-start="-15vh"`  
`data-scrollage-offset-end="15vw"`  
`data-scrollage-offset-start="60px"`

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

Controls whether scrolling is considered `vertical` or `horizontal`. Default: `'vertical'`.

### `breakpoints`

An array of three numeric values to define responsive breakpoints, e.g. `[640, 980, 1280]`. Default: `[781, 1024, 1366]`.

### `wrapper`

The element that serves as the scroll container. Default: `documentElement`.

### `triggers`

Triggers allow you to add or remove CSS classes when a specific scroll position is reached. This is useful for applying effects, styling changes, or triggering external behaviors. Default: `[]`

    triggers: [
        {
            range: "#intro",                // Optional: The element/selector string, that defines the trigger range. Defaults to the wrapper or `documentElement`.
            position: 100 | "250px",        // Optional: The position relative to the range element at which to trigger (number in percentage or string with `%`, `px`, `vh`, `vw`). Defaults to `0`.
            class: "has-triggered-intro",   // The class, thats being added to the target element on trigger.
            target: "#class-target"         // Optional: The element/selector target, to which the class is added. Use `_self` to target the range element itself. Defaults to the wrapper or `documentElement`.
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
                .range { height: 200vh; }
                .has-triggered-range { background-color: #f0f0f0; }
            </style>
            <script src="path/to/scrollage.min.js"></script>
        </head>
        <body>
            <div class="range">
                <div class="scrollage"
                    data-scrollage-range=".range"
                    data-scrollage-offset="-30%"
                    data-scrollage-move='{"endY": 100}'
                    data-scrollage-fade='{"start: 0}'
                >
                    Animated Element
                </div>
            </div>

            <script>
                // Initialize ScrollageJS with custom options
                const scrollageInstance = new Scrollage('.scrollage', {

                    triggers: [{
                        range: '.range',
                        class: 'has-triggered-range',
                        position: '50%',
                        target: '_self'
                    }]
                });
            </script>
        </body>
    </html>

## JavaScript Methods

### `init()`

Re-caches and updates all animated elements and triggers.  
Call this method to manually reinitialize the Scrollage instance after dynamic DOM changes or layout adjustments. It recalculates the dimensions of the scroll wrapper, updates the scroll positions, and re-attaches necessary event listeners.

### `update()`

Recalculates the scroll progress and immediately updates all animations without reinitializing the instance.

### `getScrollProgress(el | string)`

Returns the current scroll progress of the specified element or selector string (or `documentElement` if not specified) in percentage.

### `destroy()`

Cleans up the Scrollage instance by emptying all cached elements, triggers, and trackers, and by removing all attached event listeners.  
Call this method when the instance is no longer needed to free up resources and avoid memory leaks.

## License

ScrollageJS is open source and available under the MIT License.  
See the LICENSE file for more information.
