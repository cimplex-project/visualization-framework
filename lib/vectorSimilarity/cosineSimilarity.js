
/**
 * This file contains code for the calculation of the Cosine Similarity.
 */

/**
 * The Cosine Distance for the vectors vecA and vecB
 *
 * @param vecA
 *    array representation of a vector
 *
 * @param vecB
 *    array representation of a vector
 */
const cosineSimilarity = (() => {
	let memorizeB;
	let memNormB;

	return (vecA, vecB) => {
		// input checks
		if (!vecA || !vecB) {
			// console.log("one or more arguments undefined!\a:" + vecA + "\nb:" + vecB);
			return -2;
		} else if (vecA.length !== vecB.length) {
			// console.log("vectors do not have the same length!");
			return -2;
		} else if (vecA.length === 0) {
			// console.log("vectors have length 0!");
			return -2;
		}

		const memorized = vecB === memorizeB;

		if (!memorized) {
			memorizeB = vecB;
			// get vecot norm (sqrt of sum of squares)
			// memNormB = vectorNorm(vecB);
			memNormB = Math.hypot(...vecB);
		}

		// calculate vector product
		let vectorProduct = 0;
		let sqNormA = 0;
		for (let i = 0, n = vecA.length; i < n; i++) {
			vectorProduct += vecA[i] * +vecB[i];
			sqNormA += vecA[i] * vecA[i];
		}

		const normA = Math.sqrt(sqNormA);
		const normB = memNormB;
		// normalization
		const similarity = vectorProduct / (normA * normB);

		// check if NaN
		if (isNaN(similarity)) {
			return -2;
		} else {
			return similarity;
		}
	};
})();

/**
 * Calculates Cosine Similarity array.
 */
function calculate(vectors, candidate) {
	return vectors.map(d => {
		return cosineSimilarity(d, candidate);
	});
};

/**
 * Test for Cosine Similarity
 */
// function testCosineSim() {
// 	console.log("0 length? -> " + cosineSimilarity([], []));
// 	console.log("0 vector? -> " + cosineSimilarity([0, 0], [0, 1]));
// 	console.log("not same length? -> " + cosineSimilarity([0, 1], [0, 1, 2]));
// 	console.log("same:1? -> " + cosineSimilarity([0, 1], [0, 1]));
// 	console.log("orthogonal:0? -> " + cosineSimilarity([0, 1], [1, 0]));
// 	console.log("opposite direction-1? -> " + cosineSimilarity([0, 1], [0, -1]));
// 	console.log("same (long)? -> " + cosineSimilarity([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]));
// 	console.log("same (doubles)? -> " + cosineSimilarity([0, 1.5, 2, 3, 4, 5.5, 6, 7.0, 8, 9], [0, 1.5, 2, 3, 4, 5.5, 6, 7.0, 8, 9]));
// 	console.log("x (negative, doubles)? -> " + cosineSimilarity([0, 1.55345, 2, 3, -4, 5.5, 6, 7.0, 8, 9], [0, 1.5, 2, -3, -40, 5.5, 6, 7.0, 8, 9]));
// }
