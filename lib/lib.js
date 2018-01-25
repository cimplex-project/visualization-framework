/**
 * This class contains useful functions
 */
const lib = {
    /**
     * Defines often used date constants.
     */
    toMillis: {
        second: 1000,
        minute: 60000,
        hour: 3600000,
        day: 86400000,
        // 7 days
        week: 604800000,
        // 30 days
        month: 2592000000,
        // 365 days
        year: 31536000000
    },

    /**
     * Defines a start date timestamp to get rid of new Date(2000) everywhere else.
     */
    baseTimestamp: (new Date(2018, 0)).getTime(),

    /**
     * Checks if a given string contains a given substring
     */
    stringContains(str, substr) {
        return str.indexOf(substr) > -1;
    },

    /**
     * need own indexOf since value is sent as string but actual values may be int
     * and array.indexOf() uses strict comparison (===)
     * returns Infinity if value is not found (indexOf would return -1)
     */
    tolerantIndexOf(array, value) {
        for (let i = 0, n = array.length; i < n; i++) {
            if (array[i] == value) {
                return i;
            }
        }
        // if value does not occur, set position to maximum possible position
        return Number.POSITIVE_INFINITY;
    },

    /**
     * Escape a regular expression
     *
     * http://stackoverflow.com/questions/1144783/replacing-all-occurrences-of-a-string-in-javascript
     */
    escapeRegExp(str) {
        return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
    },

    /**
     * replace all occurrences of <find> in <str> with <replace>
     *
     * http://stackoverflow.com/questions/1144783/replacing-all-occurrences-of-a-string-in-javascript
     */
    replaceAll(str, find, replace) {
        return str.replace(new RegExp(lib.escapeRegExp(find), "g"), replace);
    },

    /**
     * check GET arguments of the current page URL and return the value for a
     * specified key
     */
    parseGET(key) {
        let result = null,
            tmp = [];
        location.search.substr(1).split("&").forEach((item) => {
            tmp = item.split("=");
            if (tmp[0] === key)
                result = decodeURIComponent(tmp[1]);
        });
        return result;
    },

    /**
     * add a specified number of days to a date object
     */
    addDays(date, days) {
        return date + days * lib.toMillis.day;
    },

    /**
     * get the number of day between two dates
     *
     * http://stackoverflow.com/questions/542938/how-do-i-get-the-number-of-days-between-two-dates-in-javascript
     */
    daysBetween(startDate, endDate) {
        return Math.round((endDate - startDate) / lib.toMillis.day);
    },

    /**
     * check if the user is using a mobile device
     *
     * http://stackoverflow.com/questions/3514784/what-is-the-best-way-to-detect-a-mobile-device-in-jquery
     *
     * Uses this approach from Mozilla:
     * https://developer.mozilla.org/en-US/docs/Web/HTTP/Browser_detection_using_the_user_agent
     *
     */
    isMobileDevice() {
        return /mobi/i.test(navigator.userAgent);
    },

    /**
     * Returns a boostrap grid column width selector depending on screen size.
     *
     * @param types
     *    array with 4 entries for width (1 to 12) for extra small, small, medium and large screens
     */
    getSelectorsForColumnType(types) {
        return `col-xs-${types[0]} col-sm-${types[1]} col-md-${types[2]} col-lg-${types[3]}`;
    },

    /**
     * Adds a text input with label to the specified parent.
     *
     * @param parent
     *    the parent DOM element
     *
     * @param name
     *    the name of the new input
     *
     * @param label
     *    label text
     *
     * @param value
     *    the value of the new input
     *
     * @param min
     *    minimum value
     *
     * @param max
     *    maximum value
     *
     * @param step
     *    step size
     */
    addFormInput(parent, name, label, value, min, max, step) {
        /**
         * Updates the value of an input field with the specified ID.
         * @param id - ID of the DOM element
         * @param val - the value to be set
         */
        const updateInput = function (id, val) {
            d3.select(`#${id}`).attr("value", val);
        };

        parent.append("label")
            .attr("for", `${name}Slider`)
            .attr("class", "col-sm-5")
            .html(label);
        parent.append("div").attr("class", "col-sm-2").append("input")
            .attr("id", name)
            .attr("name", name)
            .attr("value", value)
            .attr("title", label)
            .style("background", "none")
            .style("pointer-events", "none")
            .attr("tabIndex", -1)
            .style("border", "none");
        parent.append("div").attr("class", "col-sm-5").append("input")
            .attr("id", `${name}Slider`)
            .attr("type", "range")
            .attr("min", min ? min : 0)
            .attr("max", max ? max : 1)
            .attr("step", step ? step : 0.0001)
            .attr("value", value)
            .on("mousedown", function () {
                updateInput(name, this.value);
            })
            .on("mousemove", function () {
                updateInput(name, this.value);
            })
            .on("onchange", function () {
                updateInput(name, this.value);
            })
            .on("keydown", function () {
                updateInput(name, this.value);
            })
            .on("keyup", function () {
                updateInput(name, this.value);
            })
            .on("touchstart", function () {
                updateInput(name, this.value);
            })
            .on("touchmove", function () {
                updateInput(name, this.value);
            })
            .on("touchend", function () {
                updateInput(name, this.value);
            });
    },

    /**
     * Rounds a specified time interval (timestamps) to match a specified bin size
     *
     * @param interval
     *    array with two timestamps
     *
     * @param binSize
     *    size of the time bins
     */
    roundTimeInterval(interval, binSize) {
        // check if rounding is needed
        if (interval[0] % binSize === 0 && interval[1] % binSize === 0)
            return interval;
        const start = ~~(interval[0] / binSize) * binSize;
        const end = ~~(interval[1] / binSize) * binSize;
        return [start, end];
    },

    /**
     * Converts a color in hex code (e.g. #FFFFFF) to an RGB object.
     *
     * @param color
     *    color in hex code
     */
    hexColorToRGB(color) {
        if (typeof (color) !== "string") {
            throw new TypeError(`color is not a hex string: ${color}`);
        }
        const c = color.charAt(0) === "#" ? color.substring(1, 7) : color;
        if (c.length < 6) {
            throw new TypeError(`color has not the correct length of 6 characters: ${color}`);
        }
        return {
            r: parseInt(c.substring(0, 2), 16),
            g: parseInt(c.substring(2, 4), 16),
            b: parseInt(c.substring(4, 6), 16)
        };
    },

    /**
     * Converts a color in RGB to a hex string.
     *
     * @param r, g, b
     *    color RGB values
     *
     * @return
     *    hex color code
     */
    rgbColorToHex(r, g, b) {
        // one value from integer to hex string, copied from d3
        function rgbToHex(v) {
            return v < 16 ? `0${Math.max(0, v).toString(16)}` : Math.min(255, v).toString(16);
        }
        return `#${rgbToHex(r)}${rgbToHex(g)}${rgbToHex(b)}`;
    },

    /**
     * Makes a given hex color have a darker / brighter shade.
     *
     * @param color
     *    color in hex code
     *
     * @param factor
     *    factor for brightness change, < 1 means darker > 1 means brighter
     *
     * @return
     *    hex color code
     */
    changeColorShadeHex(color, factor) {
        const rgb = lib.hexColorToRGB(color);
        const c = lib.changeColorShadeRGB(rgb, factor);
        return lib.rgbColorToHex(c.r, c.g, c.b);
    },

    /**
     * Makes a given RGB color have a darker / brighter shade.
     *
     * @param color
     *    color as RGB object {r, g, b}
     *
     * @param factor
     *    factor for brightness change, < 1 means darker > 1 means brighter
     *
     * @return
     *    RGB color object {r, g, b}
     */
    changeColorShadeRGB(color, factor) {
        let error = false;
        const c = [color.r, color.g, color.b].map(x => {
            x = Math.round(x * factor);
            // catch over-/underflow
            // clip values in case of over-/underflow
            if (x > 255) {
                error = true;
                x = 255;
            } else if (x < 0) {
                error = true;
                x = 0;
            }
            return x;
        });
        if (error) {
            console.warn(`could not change color shade properly: ${c[0]}, ${c[1]}, ${c[2]}. Values are clipped to [0, 255]`);
        }
        return {
            r: c[0],
            g: c[1],
            b: c[2]
        };
    },

    /**
     *  Compares two floating point number for equality with relative epsilon
     *  inspired by http://floating-point-gui.de/errors/comparison/ and adapted
     *  for javasrcipt with type safety and Nan values.
     *
     * @return {Boolean} true if the relativce difference between x and y is smaller than epsilon
     */
    floatCompareRelativeAndAbs(x, y, relative = 1e-5, abs = 1e-50) {
        if (typeof (x) !== "number" || typeof (y) !== "number" ||
            Number.isNaN(x) || Number.isNaN(y))
            return false;

        if (x === y) {
            return true;
        }

        const a = Math.abs(x);
        const b = Math.abs(y);
        const diff = Math.abs(x - y);
        const MIN_NORMAL = Math.pow(2, -1022);

        if (a === 0 || b === 0 || diff <= MIN_NORMAL) {
            return diff < abs;
        }

        return (diff / Math.min(a + b, Number.MAX_VALUE)) < relative;
    }
};
