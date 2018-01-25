// TODO: class with all attributes a region can have in this system
// TODO: use this in all connectors

class Region {
    constructor(id, name) {
        // general data properties
        this.properties = {
            id: +id,
            name,
            transitionNumber: undefined,
            // bbox: undefined,
            // centroid: undefined
        };

        this.incTransitions = undefined;
        this.outTransitions = undefined;

        // framework internal information
        this.community = 0;
        this.active = undefined;
        this.highlight = { h: false };

        // for geographic data
        this.geometry = undefined;
        this.type = "Feature";
    }
}
