/**
 * This file contains code for the calculation of the Euklidean Similarity.
 */

/**
 * The Euklidean Similarity for the vectors vecA and vecB
 *
 * @param vecA
 *    array representation of a vector
 *
 * @param vecB
 *    array representation of a vector
 */
function euklideanSimilarity(vecA, vecB) {
	// input checks
	if (!vecA || !vecB) {
		console.error(`one or more arguments undefined!\na:${vecA}\nb:${vecB}`);
		return;
	} else if (vecA.length !== vecB.length) {
		console.error("vectors do not have the same length!");
		return;
	} else if (vecA.length === 0) {
		console.error("vectors have length 0!");
		return;
	}

	// calculate squared distance
	let temp = 0;
	for (let i = 0, n = vecA.length; i < n; i++) {
		// (a_i - b_i)^2
		temp += (vecA[i] - vecB[i]) * (vecA[i] - vecB[i]);
	}

	// take square root and convert to similarity
	return 1 / (1 + Math.sqrt(temp));
}

/**
 * Calculates Euklidean Similarity array.
 */
function calculate(vectors, candidate) {
	return vectors.map(d => {
		return euklideanSimilarity(d, candidate);
	});
}

/**
 * Test for Euklidean Similarity
 */
// function testEuklideanSim() {
// 	console.log("0 length? -> " + euklideanSimilarity([], []));
// 	console.log("one 0 vector? -> " + euklideanSimilarity([0, 0], [0, 1]));
// 	console.log("two 0 vectors? -> " + euklideanSimilarity([0, 0], [0, 0]));
// 	console.log("not same length? -> " + euklideanSimilarity([0, 1], [0, 1, 2]));
// 	console.log("same? -> " + euklideanSimilarity([0, 1], [0, 1]));
// 	console.log("orthogonal? -> " + euklideanSimilarity([0, 1], [1, 0]));
// 	console.log("opposite direction? -> " + euklideanSimilarity([0, 1], [0, -1]));
// 	console.log("same (long)? -> " + euklideanSimilarity([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]));
// 	console.log("same (doubles)? -> " + euklideanSimilarity([0, 1.5, 2, 3, 4, 5.5, 6, 7.0, 8, 9], [0, 1.5, 2, 3, 4, 5.5, 6, 7.0, 8, 9]));
// 	console.log("x (negative, doubles)? -> " + euklideanSimilarity([0, 1.55345, 2, 3, -4, 5.5, 6, 7.0, 8, 9], [0, 1.5, 2, -3, -40, 5.5, 6, 7.0, 8, 9]));
// }
