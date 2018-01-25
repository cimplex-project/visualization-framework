/**
 * This file provides a webworker for array similarity calculations with
 * different comparison algorithms.
 */
onmessage = (event) => {
    const measure = event.data.measure;
    const vectors = event.data.vectors;
    const candidate = event.data.candidate;

    switch (measure) {
        case "cosine":
            importScripts("./cosineSimilarity.js");
            break;
        case "euklidean":
            importScripts("./euklideanSimilarity.js");
            break;
        case "levenshtein":
            importScripts("./levenshteinSimilarity.js");
            break;
    }

    postMessage({
        result: calculate(vectors, candidate),
        finished: true
    });
};
