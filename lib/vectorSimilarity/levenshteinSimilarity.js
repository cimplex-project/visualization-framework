
/**
 * This file contains code for the calculation of the Levenshtein Similarity.
 */

/**
 * The Levenshtein Distance between each of the specified vectors and a candidate.
 * Can calculate the similarity of any arrays with values
 * that can be compared using the "==" operator. Therefore double values
 * should not be used.
 *
 * All vectors must have the same length.
 *
 * @param vectors
 *    array representations of a vector or string
 */
function calculate(vectors, candidate) {
	// create matrix that will be used for all calculations
	const vecSize = vectors[0].length;
	const table = [];
	for (let i = 0; i <= vecSize; i++) {
		table.push(new Array(vecSize + 1));
	}
	table[0][0] = 0;
	for (let i = 1; i <= vecSize; i++) {
		table[i][0] = i;
		table[0][i] = i;
	}

	// calculate similarities
	const similarities = [];
	for (let v = 0; v < vectors.length; v++) {
		const vec = vectors[v];
		// compute full distance table
		let replace;
		for (let i = 1; i <= vecSize; i++) {
			for (let j = 1; j <= vecSize; j++) {
				replace = (candidate[i - 1] == vec[j - 1]) ? 0 : 1;
				table[i][j] = Math.min(
					table[i - 1][j - 1] + replace,
					table[i][j - 1] + 1,
					table[i - 1][j] + 1
				);
			}
		}
		// distance is the last value in the table,
		// similarity is just the negative distance
		similarities[v] = -table[vecSize][vecSize];
	}
	return similarities;
};


// function printArray(a) {
//	console.log("1D array - values");
//	var text = "";
//	for (var j = 0, m = a.length; j < m; j++) {
//		text += a[j] + "\t";
//	}
//	console.log(text);
// }
//
// function print2dArray(a) {
//	console.log("2D array - values");
//	var text = "";
//	for (var i = 0, n = a.length; i < n; i++) {
//		for (var j = 0, m = a[i].length; j < m; j++) {
//			text += a[i][j] + "\t";
//		}
//		text += "\n";
//	}
//	console.log(text);
// }
//
//
//
// function testLevenshteinSim() {
//	var vectors = [
//		[0, 1, 2, 3, 4, 5, 6, 7],
//		[0, -1, 2, 3, 4, 5, 6, 7],
//		[0, -1, -2, 3, 4, 5, 6, 7],
//		[0, -1, -2, -3, 4, 5, 6, 7],
//		[0, -1, -2, -3, -4, 5, 6, 7]
//	];
//
//	console.log(LevenshteinCalculator(vectors, [0, 1, 2, 3, 4, 5, 6, 7]));
// }
