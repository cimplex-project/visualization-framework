importScripts("https://cdnjs.cloudflare.com/ajax/libs/d3/3.5.14/d3.min.js");
importScripts("http://cdn.rawgit.com/upphiminn/d3.ForceBundle/master/d3-ForceEdgeBundling.js");

/**
 * This file provides a webworker for force-directed edge-bundling.
 */
onmessage = function (event) {
    const nodes = event.data.nodes;
    const links = event.data.links;

    // run edge bundling algorithm
    const fbundling = d3.ForceEdgeBundling()
        .step_size(event.data.ss)
        .compatibility_threshold(event.data.ct)
        .nodes(nodes)
        .edges(links);

    const edgeBundleLinks = fbundling();

    // send results
    postMessage({
        finished: true,
        links: edgeBundleLinks
    });
};
