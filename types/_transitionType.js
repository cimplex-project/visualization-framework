// TODO: class with all attributes a transition can have in this system
// TODO: use this in all connectors

class Transition {
    constructor(id, sourceId, targetId, weight = 1, text = "") {

        this.id = +id;
        this.weight = weight;
        // if this transition is an aggregated transition,
        // this.weight is overwritten but stored here
        this.oWeight = weight;
        this.text = text;

        // save the regions to which this transition belongs
        // TODO: no longer use ids, instead only use object references
        // this probebly has to be changed in every file
        this.sourceRegionId = +sourceId;
        this.targetRegionId = +targetId;
        this.source = undefined;
        this.target = undefined;


        this.startTimestamp = undefined;
        this.endTimestamp = undefined;

        // framework internal information
        this.highlight = { h: false };

        // if this transition is an aggregated transition,
        // children are stored here
        this.transitions = undefined;
    }
}
