# GraphML Connector

For information on the GraphML format see the [this website](http://graphml.graphdrawing.org/).

## Muli-Graphs

The connector supports GraphML files with one or multiple graphs. If there are multiple graphs, they will be treated as if they where parts of one single graph.

## Edge Direction

Edges may be directed independently of the graphs `edgedefault` value. In a mixed graph, the connector will represent undirected edges by two directed edges with opposite direction and half the original weight.

## Attributes

Only edge weights are supported yet.

## Examples

The files in [/data/graphml](../../data/graphml) show examples of the features that are supported.
