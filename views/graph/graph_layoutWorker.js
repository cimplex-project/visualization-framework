importScripts("https://cdnjs.cloudflare.com/ajax/libs/d3-collection/1.0.3/d3-collection.min.js");
importScripts("https://cdnjs.cloudflare.com/ajax/libs/d3-dispatch/1.0.3/d3-dispatch.min.js");
importScripts("https://cdnjs.cloudflare.com/ajax/libs/d3-quadtree/1.0.3/d3-quadtree.min.js");
importScripts("https://cdnjs.cloudflare.com/ajax/libs/d3-timer/1.0.7/d3-timer.min.js");
importScripts("https://cdnjs.cloudflare.com/ajax/libs/d3-force/1.1.0/d3-force.min.js");

const simulation = d3.forceSimulation();

/**
 * react to message from calling function
 */
onmessage = function (event) {
	if (event.data.action == "calculate") {
		// calculate a layout
		calculation(event);
	} else {
		// return the nearest node to a given point (inside radius r)
		find(event.data.x, event.data.y, event.data.r);
	}
};

/**
 * Return the nearest node to a given point (x, y) inside radius r
 */
function find(x, y, r = 100) {
	postMessage({
		selection: true,
		selectedNode: simulation.find(x, y, r)
	});
};

/**
 * Calculate a force directed layout
 */
function calculation(event) {
	const nodes = event.data.nodes;
	const links = event.data.links;
	const width = event.data.width;
	const height = event.data.height;
	const timeout = event.data.timeout;

	// ratio how much stronger links between nodes in the same community are
	const communityAttractionRatio = 12;
	const scaleAmount = -400 / event.data.currentMaxTransitionNumber;
	const scaleWeight = 10 / (communityAttractionRatio * event.data.currentMaxTransitionWeight);
	const strength = 0.1;


	simulation.nodes(nodes)
		.force(
		"charge",
		d3.forceManyBody()
			.strength(d => d.transitionNumber * scaleAmount - 1)
			.distanceMax(Math.min(width, height) / 4)
		)
		.force(
		"link",
		d3.forceLink(links)
			.id(d => d.id)
			.distance(40)
			.strength(d => {
				if (event.data.showCommunities && d.source.community === d.target.community) {
					return communityAttractionRatio * d.weight * scaleWeight;
				} else {
					return d.weight * scaleWeight;
				}
			})
		)
		// center force
		.force("x", d3.forceX(width / 2).strength(strength))
		.force("y", d3.forceY(height / 2).strength(strength))
		// TODO: use actual radii
		// TODO: or better maximum node radius?
		.force("collide", d3.forceCollide().radius(d => 20));

	// limit number of ticks (run time) and use timeout
	const startTime = Date.now();
	for (let i = 0; i < 300; i++) {
		if (timeout > 0 && Date.now() - startTime > timeout) {
			simulation.stop();
			break;
		}
		simulation.tick();
	}

	if (nodes.length !== 1) {
		// scale and translate nodes to fit into view div, margin of 10 px
		let minX = Number.POSITIVE_INFINITY;
		let maxX = Number.NEGATIVE_INFINITY;
		let minY = Number.POSITIVE_INFINITY;
		let maxY = Number.NEGATIVE_INFINITY;

		// find bounding rectangle of entire graph
		nodes.forEach((d) => {
			if (d.x < minX)
				minX = d.x;
			if (d.x > maxX)
				maxX = d.x;
			if (d.y < minY)
				minY = d.y;
			if (d.y > maxY)
				maxY = d.y;
		});

		const scaleX = (width - 20) / (maxX - minX);
		const scaleY = (height - 20) / (maxY - minY);
		const transX = -minX * scaleX + 10;
		const transY = -minY * scaleY + 10;

		for (let i = 0; i < nodes.length; i++) {
			nodes[i].x = nodes[i].x * scaleX + transX;
			nodes[i].y = nodes[i].y * scaleY + transY;
		}
	}

	// return results
	postMessage({
		nodes: nodes,
		links: links
	});
};
