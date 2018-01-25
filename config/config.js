/**
 * This file contains the programs client configurations.
 */
const config = {};

/**
 * Default configuration for expert users on a PC.
 * Different configurations can be created by overwriting attributes of
 * derived objects.
 *
 * @param id a unique ID for this configuration
 * @param description {name, expertise, device, devicePerformance}
 */
class Config {
	constructor(id, description) {
		// unique ID
		this.id = id;
		// general description and attributes
		this.description = description;
		// general interface
		this.UI = {
			// title may contain HTML
			title: "Cimplex Visualization",
			// how many columns of views are displayed in different page resolutions?
			// values define the width of all columns in multiples of 1/12
			viewColumns: [12, 6, 6, 4],
			// specifies the number of rows used for views without needing to scroll
			viewRows: 2,
			// if true, views can be moved via dragging their title bars
			viewDragAndDrop: true,
			// true if the dark theme is active
			darkTheme: DARK_THEME
		};
		// filter configuration
		this.filter = {
			// select only items that are completely inside the time selection
			startAndEndSelected: true,
			// the color of nodes / regions can depend on the number of incoming, outgoing or all edges / transitions
			// values: "in", "out", "all"
			transitionCountMode: "all",
			showCommunities: true,
			limitTransitionCount: 100000
		};
		// views" configurations
		this.timeline = {
			// aggregation level: connector: defined by connector, auto: automatically, 0: minutes, 1: hours, 2: days
			aggregationLevel: "auto",
			// false: only take the begin-time-stamps for the time line
			// true: take from beginning to end-time-stamp for time line
			aggregateOverTime: true,
			// use "step-after" for stepped line or "linear" for linear interpolation
			interpolation: "linear",
			// time in milliseconds for each step
			playerSpeed: 1000,
			// a color gradient based on the color map from the current connector
			useColorGradient: true,
			// the number of steps (colors) for the gradient
			colorGradientSteps: 12
		};
		this.map = {
			showRegions: true,
			showTransitions: true,
			showCommunities: false,
			edgeBundling: false,
			// see views/map/map.js for possible values
			tileLayer: this.UI.darkTheme ? "darkGray" : "lightGray"
		};
		this.graph = {
			edgeBundling: false,
			showLabels: true,
			labelLimit: 20,
			showCommunities: true,
			// directed links may be shown as undirected to reduce clutter
			linkDirection: true,
			// direction of links can be indicated via "doubleLines", "halfArrows" or "curvature"
			linkDirectionIndicator: "doubleLines",
			// layout calculation timeout in milliseconds (0 to disable)
			timeout: 3000
		};
		this.matrix = {
			order: "community"
		};
		this.scarfplot = {
			order: "community",
			// measure for similarity between a chosen line and the others
			measure: "cosine",
			activeSorting: undefined,
		};
		this.filterInfo = {
			// sections can be collapsed
			showSections: {
				time: true,
				network: true,
				communities: true,
				dataServiceParameters: false,
				filterHistory: true
			}
		};
		this.wordCloud = {
			filterStopWords: true,
			// standard english stop words
			stopWords: ["a", "about", "above", "above", "across", "after", "afterwards", "again", "against", "all", "almost", "alone", "along", "already", "also", "although", "always", "am", "among", "amongst", "amoungst", "amount", "an", "and", "another", "any", "anyhow", "anyone", "anything", "anyway", "anywhere", "are", "around", "as", "at", "back", "be", "became", "because", "become", "becomes", "becoming", "been", "before", "beforehand", "behind", "being", "below", "beside", "besides", "between", "beyond", "bill", "both", "bottom", "but", "by", "call", "can", "cannot", "cant", "co", "con", "could", "couldnt", "cry", "de", "describe", "detail", "do", "done", "down", "due", "during", "each", "eg", "eight", "either", "eleven", "else", "elsewhere", "empty", "enough", "etc", "even", "ever", "every", "everyone", "everything", "everywhere", "except", "few", "fifteen", "fify", "fill", "find", "fire", "first", "five", "for", "former", "formerly", "forty", "found", "four", "from", "front", "full", "further", "get", "give", "go", "had", "has", "hasnt", "have", "he", "hence", "her", "here", "hereafter", "hereby", "herein", "hereupon", "hers", "herself", "him", "himself", "his", "how", "however", "hundred", "ie", "if", "in", "inc", "indeed", "interest", "into", "is", "it", "its", "itself", "keep", "last", "latter", "latterly", "least", "less", "ltd", "made", "many", "may", "me", "meanwhile", "might", "mill", "mine", "more", "moreover", "most", "mostly", "move", "much", "must", "my", "myself", "name", "namely", "neither", "never", "nevertheless", "next", "nine", "no", "nobody", "none", "noone", "nor", "not", "nothing", "now", "nowhere", "of", "off", "often", "on", "once", "one", "only", "onto", "or", "other", "others", "otherwise", "our", "ours", "ourselves", "out", "over", "own", "part", "per", "perhaps", "please", "put", "rather", "re", "same", "see", "seem", "seemed", "seeming", "seems", "serious", "several", "she", "should", "show", "side", "since", "sincere", "six", "sixty", "so", "some", "somehow", "someone", "something", "sometime", "sometimes", "somewhere", "still", "such", "system", "take", "ten", "than", "that", "the", "their", "them", "themselves", "then", "thence", "there", "thereafter", "thereby", "therefore", "therein", "thereupon", "these", "they", "thickv", "thin", "third", "this", "those", "though", "three", "through", "throughout", "thru", "thus", "to", "together", "too", "top", "toward", "towards", "twelve", "twenty", "two", "un", "under", "until", "up", "upon", "us", "very", "via", "was", "we", "well", "were", "what", "whatever", "when", "whence", "whenever", "where", "whereafter", "whereas", "whereby", "wherein", "whereupon", "wherever", "whether", "which", "while", "whither", "who", "whoever", "whole", "whom", "whose", "why", "will", "with", "within", "without", "would", "yet", "you", "your", "yours", "yourself", "yourselves", "the"],
			// will only take effect when stop words are filtered
			filterNumbers: true,
			// inflect plural words to their singlular form
			inflect: false,
			// limit number of words to display (for better performance)
			wordLimit: 500,
			// exclude rare words
			minOccurence: 1,
			// word cloud colors are changed to a darker shade when using bright theme
			colors: this.UI.darkTheme ? ["#2ca02c", "#17becf", "#8c564b", "#bcbd22", "#aec7e8", "#ff7f0e", "#ffbb78", "#98df8a", "#d62728", "#ff9896", "#9467bd", "#c5b0d5", "#c49c94", "#e377c2", "#f7b6d2", "#dbdb8d", "#9edae5", "#1f77b4"] : ["#2ca02c", "#17becf", "#8c564b", "#bcbd22", "#aec7e8", "#ff7f0e", "#ffbb78", "#98df8a", "#d62728", "#ff9896", "#9467bd", "#c5b0d5", "#c49c94", "#e377c2", "#f7b6d2", "#dbdb8d", "#9edae5", "#1f77b4"]
				.map(x => lib.changeColorShadeHex(x, 0.8)),
			// margin for the hit box of each word, avoids words beeing drawn to close to each other
			hitBoxMargin: 2
		};
		this.globe = {
			showGlobe: true,
			showBoundaries: false,
			showBasins: true,
			showTransitions: true,
			sphericalMapping: true,
			transitionsAsLines: false,
			transitionsAnimated: true,
			transitionHeight: 1.05,
			transitionWidth: 0.006,
			maxBasinHeight: 0.04,
			postProcessing: true,
			tileLayer: this.UI.darkTheme ? "darkGray" : "lightGray",
			transitionColor: this.UI.darkTheme ? [1, 1, 1] : [0, 0, 0]
		};
	}
}

/**
 * default configuration
 */
config.default = new Config("default", {
	name: "default configuration",
	// expert, intermediate, novice
	expertise: "expert",
	// desktop, mobile, big
	device: "desktop",
	// high, medium, low
	devicePerformance: "high"
});

/**
 * mobile phone configuration
 */
config.mobile = new Config("mobile", {
	name: "mobile phone configuration",
	expertise: "novice",
	device: "mobile",
	devicePerformance: "low"
});
config.mobile.UI.viewColumns = [12, 12, 6, 6];
config.mobile.UI.viewRows = 2;
config.mobile.UI.viewDragAndDrop = false;
config.mobile.filter.limitTransitionCount = 500;

/**
 * big screen device configuration
 */
config.big = new Config("big", {
	name: "big screen device configuration",
	expertise: "intermediate",
	device: "bigScreen",
	devicePerformance: "high"
});
config.big.UI.viewColumns = [6, 4, 3, 3];
config.big.UI.viewRows = 2;

/**
 * This function allows to set a predefined configuration depending on device
 * and user expertise.
 *
 * @param device
 *    the device type whose configuration should be used
 */
config.set = function (device) {
	switch (device) {
		case "mobile":
			CONFIG = config.mobile;
			break;
		case "big":
			CONFIG = config.big;
			break;
		case "default":
		default:
			CONFIG = config.default;
	}
	console.info(`set config for device ${device} to ${CONFIG.description.name}:`);
	console.info(CONFIG);
};
