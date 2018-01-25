
/**
 * This file contains code for a word cloud visualization.
 */

/**
 * Word Cloud class.
 */
class WordCloud extends View {
	constructor(params) {
		super(params);
		// subscribed events
		DISPATCH.on(`initializeView.${this.name}`, param => {
			if (param.includes(this.name)) {
				// configuration dependent attributes can only be set here
				this.activate();
				this.setStyleSelectors(lib.getSelectorsForColumnType(CONFIG.UI.viewColumns), false);
				this.setHeight(Math.floor(VIEW_CONTAINER_HEIGHT / CONFIG.UI.viewRows), false);
				this.width = this.viewDiv.node().getBoundingClientRect().width;
				// stopwords to be used in this.reduceWords() are stored in a map for better performance
				this.stopWordMap = new Map(CONFIG.wordCloud.stopWords.map(x => [x, undefined]));
			}
		});

		// react to filtering
		DISPATCH.on(`onRegionFiltered.${this.name}`, () => this.draw());
		DISPATCH.on(`onTimeFiltered.${this.name}`, () => this.draw());
		DISPATCH.on(`onFilterReset.${this.name}`, () => this.draw());
		DISPATCH.on(`onRegionHighlight.${this.name}`, () => this.drawHighlights());
		DISPATCH.on(`onTransitionHighlight.${this.name}`, () => this.drawHighlights());
		DISPATCH.on(`onHighlightEnd.${this.name}`, () => this.drawWords());

		// set the view draw function
		this.setDrawFunction(() => {
			this.createCanvas();
			this.words = this.reduceWords(CRXFILTER.currentData.transitions);
			this.drawCanvas();
		});

		// set settings function
		this.setSettingsFunction(this.settingsFunction);
	}

	/**
	 * react to reactivation
	 */
	reactivated() {
		this.width = this.viewDiv.node().getBoundingClientRect().width;
		this.draw();
	}

	/**
	 * Creates a canvas DOM element for this view.
	 */
	createCanvas() {
		this.clear();
		this.width = this.viewDiv.node().getBoundingClientRect().width;
		this.canvas = document.createElement("canvas");
		this.canvas.width = this.width;
		this.canvas.height = this.height;
		// add interaction handlers
		this.canvas.addEventListener("mousemove", e => this.handleMousemove(e, this), false);
		this.canvas.addEventListener("mouseout", e => this.handleMouseout(e, this), false);
		// add canvas to DOM
		this.viewDiv.node().appendChild(this.canvas);
		// create tooltip
		this.tip = this.viewDiv.append("div")
			.attr("class", "viewTooltip")
			.style("display", "none");
	}

	/**
	 * Creates a canvas DOM element for this view.
	 */
	drawCanvas() {
		if (!this.words || this.words.length === 0) {
			this.showNoItemsMessage();
			return;
		}
		const margin = CONFIG.wordCloud.hitBoxMargin;
		// start radius
		const a = 5;
		// growing rate
		const b = 5;
		// angle step size
		const step = 2;
		const maxTries = 5000;

		// reset canvas
		const ctx = this.canvas.getContext("2d");
		ctx.clearRect(0, 0, this.canvas.width, this.canvas.width);
		const cWidth = this.canvas.width;
		const cHeight = this.canvas.height;

		// remember placed words and their hit boxes
		this.placedWords = [];

		// words are already sorted by number of occurences,
		// so they are processed in the correct order
		// scale most important word to some size and all other accordingly
		const maxOccurences = this.words[0].occurences;
		for (let i = 0; i < this.words.length; i++) {
			const w = this.words[i];

			// set font size based on number of occurences
			const fontSize = 8 + (Math.sqrt(w.occurences) / Math.sqrt(maxOccurences)) * 30;
			ctx.font = `${fontSize}px Calibri`;

			// get bounding box size
			const wordSize = ctx.measureText(w.word).width;
			const halfWsWidth = wordSize / 2;
			const halfWsHeight = fontSize / 2;

			// get center
			const center_x = cWidth / 2;
			const center_y = cHeight / 2;

			// spiral from center outwards and check if any other words are hit
			let numOfTries = 0;
			// angle
			let theta = 0;
			// radius
			let r = a;
			let x, y;
			while (true) {
				// make step smaller with increasing radius
				theta += step / (r * 0.1);
				r = a + b * theta;
				x = center_x + r * Math.cos(theta);
				y = center_y + r * Math.sin(theta);

				// get current hitbox
				w.hitBox = [
					[x - halfWsWidth - margin, y - halfWsHeight - margin],
					[x + halfWsWidth + margin, y + halfWsHeight + margin]
				];

				// check if we have to try again
				if (numOfTries++ >= maxTries) {
					// to many tries
					break;
				} else if (!this.insideCanvas(w.hitBox)) {
					// do not try positions outside the canvas
					continue;
				} else if (!this.hitDetected(w.hitBox, this.placedWords)) {
					// no hit, word can be placed
					break;
				}
			}

			// break if the current word could not be placed
			// (the next words probably wont fit either)
			if (numOfTries >= maxTries) {
				break;
			} else {
				// place word
				this.placedWords.push(w);
				// get color from first character of the word, so color is deterministic
				ctx.fillStyle = CONFIG.wordCloud.colors[w.word.charCodeAt(0) % CONFIG.wordCloud.colors.length];
				// write text
				ctx.fillText(w.word, x - halfWsWidth, y + halfWsHeight / 2);
			}
		}
	}

	/**
	 * Draws all words contained in this.placedWords onto the canvas.
	 * If highlightedWords is defined, all words that are not contained in it are
	 * drawn in gray and semi-transparent.
	 *
	 * @param highlightedWords
	 *    (optional) words to be highlighted, i.e. not faded to gray
	 */
	drawWords(highlightedWords) {
		if (!this.placedWords) {
			return;
		}

		const ctx = this.canvas.getContext("2d");
		ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

		let hw;
		if (highlightedWords) {
			// create map of highlightedWords for better performance
			hw = new Map(highlightedWords.map(x => [x, undefined]));
		}
		const m = CONFIG.wordCloud.hitBoxMargin;

		this.placedWords.forEach(w => {
			const hb = w.hitBox;
			// set font size
			const fontSize = hb[1][1] - hb[0][1] - 2 * m;
			ctx.font = `${fontSize}px Calibri`;
			// get color from first character of the word, so color is deterministic
			if (!highlightedWords || !hw || hw.has(w.word)) {
				ctx.fillStyle = CONFIG.wordCloud.colors[w.word.charCodeAt(0) % CONFIG.wordCloud.colors.length];
			} else {
				ctx.fillStyle = "rgba(127, 127, 127, 0.5)";
			}
			// write text
			ctx.fillText(w.word, hb[0][0] + m, hb[1][1] - 0.25 * fontSize - m);
		});
	}

	/**
	 * Checks if there is a conflict while positioning the word <w> when the words
	 * <words> are already placed.
	 *
	 * @param hitBox
	 *    hit box of the word to be placed
	 *
	 * @param words
	 *    words already placed
	 *
	 * @return
	 *    true the word in conflict or false if there is none
	 */
	// TODO: use quadtree?
	// https://bl.ocks.org/cmgiven/547658968d365bcc324f3e62e175709b
	hitDetected(hitBox, words) {
		// no collision for the first word
		if (words.length === 0) {
			return false;
		}
		// words are tested from first to last placed since they are in this order,
		// making the test more efficient
		for (let i = 0; i < words.length; i++) {
			if (this.intersects(hitBox, words[i].hitBox)) {
				return words[i];
			}
		}
		// if no collision detected, return false
		return false;
	}

	/**
	 * Checks if a rectagle is completely inside the canvas.
	 */
	insideCanvas(hitBox) {
		return hitBox[0][0] > 0
			&& hitBox[0][1] > 0
			&& hitBox[1][0] < this.canvas.width
			&& hitBox[1][1] < this.canvas.height;
	}

	/**
	 * Checks if two rectangles intersect.
	 */
	intersects(a, b) {
		return Math.max(a[0][0], b[0][0]) < Math.min(a[1][0], b[1][0])
			&& Math.max(a[0][1], b[0][1]) < Math.min(a[1][1], b[1][1]);
	}

	/**
	 * Takes a list of transitions and extracts their textual information.
	 * Then splits the text into words, optionally filters stop words and finally
	 * reduces them into a summary of word objects that contain the word, its number
	 * of occurences and references to the transitions that contained the word.
	 *
	 * @param transitions
	 *    array of transitions that contain text
	 *
	 * @return
	 *    filtered array
	 */
	reduceWords(transitions) {
		const map = new Map();

		transitions.forEach(t => {
			// split texts into words, remove special characters except hyphens
			// TODO: still problems with "(word"
			let words = t.text.split(/\s+|\W\s+|\W$/)
				// make all lowercase
				.map(w => w.toLowerCase())
				.filter(w =>
					// filter words shorter than 2 characters
					w.length > 1
					// filter numbers
					&& !(CONFIG.wordCloud.filterNumbers && isFinite(w))
					// filter stop words
					&& (CONFIG.wordCloud.filterStopWords && !this.stopWordMap.has(w))
				);

			if (CONFIG.wordCloud.inflect) {
				// map plural and singular of the same word to the same object
				words = words.map(w => w.singularize().toString());
			}

			// check if there are words left
			if (words.length === 0) {
				return [];
			}

			// create a map in order to summarize the same words
			// inside a single word object
			words.forEach(function mapWords(w) {
				if (!map.has(w)) {
					// create new word object
					const wordObject = {
						word: w,
						occurences: 1,
						transitions: [t]
					};

					map.set(w, wordObject);
				} else {
					// word already in map, update its object
					const oldWordObject = map.get(w);
					oldWordObject.transitions.push(t);
					oldWordObject.occurences++;
				}
			});
		});

		// convert map to array so the cloud plugin can work with it
		let reducedWords = [];
		map.forEach(w => {
			// remove words with low occurence
			if (w.occurences >= CONFIG.wordCloud.minOccurence) {
				reducedWords.push(w);
			}
		});

		// sort by occurences descending
		reducedWords.sort((a, b) => b.occurences - a.occurences);

		// store the original number of words
		this.totalNumberOfWords = reducedWords.length;

		// limit the number of words
		reducedWords = reducedWords.slice(0, CONFIG.wordCloud.wordLimit);

		return reducedWords;
	}

	/**
	 * Checks if the current mouse position hits a word and shows a tooltip if it
	 * does.
	 */
	handleMousemove(e, _this) {
		// get currently hovered region and iteration
		const x = e.offsetX;
		const y = e.offsetY;
		const word = _this.hitDetected([[x, y], [x + 1, y + 1]], _this.placedWords);

		if (!word) {
			_this.tip.style("display", "none");
			_this.drawWords();
		} else {
			const tooltip = `" ${word.word} "<br><br>
						${word.transitions.length} occurences<br><br>
						${_this.placedWords.length} of ${_this.totalNumberOfWords} words shown<br>
						(limit: ${CONFIG.wordCloud.wordLimit}, min. occurence: ${CONFIG.wordCloud.minOccurence})`;
			// show tooltip
			_this.tip
				.style("display", "block")
				.html(tooltip)
				.style("z-Index", 1000)
				.style("top", `${e.clientY + 20}px`)
				.style("left", `${e.clientX + 20}px`);

			// highlight word
			_this.drawWords([word.word]);

			// trigger transition highlight for all transitions that contain this word
			DISPATCH.startTransitionHighlightMulti(word.transitions.map(d => d.id));
		}
	}

	/**
	 * Reacts to the cursor leaving the canvas by hiding the tooltip.
	 */
	handleMouseout(e, _this) {
		_this.tip.style("display", "none");
		DISPATCH.endHighlight();
		_this.drawWords();
	}

	/**
	 * Highlights words that correspond to currently highlighted transitions.
	 */
	drawHighlights() {
		if (!this.placedWords) {
			return;
		}

		const tIds = [];

		// go through reduced transitions and take all their child transitions
		CRXFILTER.currentData.reducedTransitions
			.filter(x => x.highlight && x.highlight.h)
			.forEach(x => {
				x.transitions.forEach(t => {
					tIds.push(t.id);
				});
			});

		// create map of ids of highlighted transitions for better performance
		const htIdMap = new Map(tIds.map(x => [x, undefined]));

		// get words for highlighted transitions
		const highlightedWords = this.placedWords
			.filter(x => {
				for (let i = 0; i < x.transitions.length; i++) {
					if (htIdMap.has(x.transitions[i].id)) {
						return true;
					}
				}
				return false;
			})
			.map(x => x.word);

		// draw highlighted words
		this.drawWords(highlightedWords);
	}

	/**
	 * add options to the view settings panel
	 */
	settingsFunction() {
		const _this = this;
		const box = _this.settingsPanel;

		// inflect plural to singular
		box.append("label")
			.text("Inflect plural words to their singular form ")
			.append("input")
			.attr("type", "checkbox")
			.property("checked", CONFIG.wordCloud.inflect)
			.on("click", function () {
				CONFIG.wordCloud.inflect = !CONFIG.wordCloud.inflect;
				wordCloudView.draw();
			});

		// word limit
		box.append("label")
			.text("Word limit ")
			.append("input")
			.attr("type", "number")
			.attr("min", "0")
			.attr("max", "100")
			.attr("step", "1")
			.attr("value", CONFIG.wordCloud.wordLimit)
			.on("change", function () {
				const valueInt = parseInt(this.value);
				if (isNaN(valueInt)) {
					alert(`no valid integer: ${this.value}`);
				} else {
					CONFIG.wordCloud.wordLimit = valueInt;
					_this.draw();
				}
			});

		// min occurence
		box.append("label")
			.text("Minimum number of occurences ")
			.append("input")
			.attr("type", "number")
			.attr("min", "0")
			.attr("max", "100")
			.attr("step", "1")
			.attr("value", CONFIG.wordCloud.minOccurence)
			.on("change", function () {
				const valueInt = parseInt(this.value);
				if (isNaN(valueInt)) {
					alert(`no valid integer: ${this.value}`);
				} else {
					CONFIG.wordCloud.minOccurence = valueInt;
					_this.draw();
				}
			});
	}
}


const wordCloudView = new WordCloud({
	name: "wordCloud",
	title: "Word Cloud",
	icon: "<i class=\"fa fa-cloud fa-fw\"></i>",
	infoText: `<p>This view shows a word cloud.</p>
			   <p>Words are sized by number of occurences and are placed closer to the center if they occur more often.</p>
			   <p>The word cloud shows only as many words as fit into the available space.
			   	There are also a word limit and a minimum number of occurences that can be changed in the view's settings.
			   	This means that some less frequent words may not be shown.</p>
			   <p>Words are colored based on their first letter.</p>`
});
