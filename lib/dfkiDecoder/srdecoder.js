
self.addEventListener("message", function(msg) {
	var decoder = new SRDecoder(msg.data);
	var day = decoder.getDayRecord();
	postMessage(day);
});

var GEOID_SIZE = 2;
var OC_SIZE = 8; // Size of each OutputCompartment data entry in single run mode
var TC_SIZE = 2; // Size of each TravelCompartment data entry in single run mode
var FLOAT_SIZE = 4;

var SRDecoder = function(data) {
	this.data = data;
	this.headerEnd = this.lastHeaderBytePosition();
	this.binaryBegin = this.headerEnd+2;
	this.header = this.getHeader();

	// Size in bytes of each area record (basin, country, region)
	this.recordSize = GEOID_SIZE + (this.header.outputCompartments.length * OC_SIZE);
	this.travelRecordSize = GEOID_SIZE * 2 + (this.header.travelCompartments.length * TC_SIZE);

	this.dayRecord = null;
};

SRDecoder.prototype.getHeader = function() {
	var del = this.lastHeaderBytePosition();
	var uint8Array = new Uint8Array(this.data, 0, del);
	var str = String.fromCharCode.apply(null, uint8Array);

	try {
		return JSON.parse(str);
	} catch(e) {
		console.error(str);
		throw new Error("Could not parse the header of the response data.");
	}
};

SRDecoder.prototype.lastHeaderBytePosition = function() {
	var uint8Array = new Uint8Array(this.data);
	return uint8Array.findIndex(function(element, index, array) {
		return element === 0 && array[index+1] === 0;
	});
};

SRDecoder.prototype.firstBasinBytePosition = function() {
	return this.binaryBegin;
};

SRDecoder.prototype.firstCountryBytePosition = function() {
	return this.binaryBegin + this.header.n0 * this.recordSize;
};

SRDecoder.prototype.firstRegionBytePosition = function() {
	return this.firstCountryBytePosition() + this.header.n1 * this.recordSize;
};

SRDecoder.prototype.firstContinentBytePosition = function() {
	return this.firstRegionBytePosition() + this.header.n2 * this.recordSize;
};

SRDecoder.prototype.firstHemisphereBytePosition = function() {
	return this.firstContinentBytePosition() + 6 * this.recordSize;
};

SRDecoder.prototype.firstGlobalBytePosition = function() {
	return this.firstHemisphereBytePosition() + 3 * this.recordSize;
};

SRDecoder.prototype.firstTravelDataBytePosition = function() {
	return this.firstGlobalBytePosition() + 1 * this.recordSize;
};

SRDecoder.prototype.getDayRecord = function() {
	if (!this.dayRecord) {
		this.dayRecord = new DayRecord(this.header);
		this.decodeBasins();
		this.decodeCountries();
		this.decodeRegions();
		this.decodeContinentData();
		this.decodeHemisphereData();
		this.decodeGlobalData();
		this.decodeTravelData();
	}

	return this.dayRecord;
};

SRDecoder.prototype.decodeBasins = function() {
	var firstBasinByte = this.firstBasinBytePosition();
	this.dayRecord.basinStats = this.decodeGeoRecords(firstBasinByte, this.header.n0);
};

SRDecoder.prototype.decodeCountries = function() {
	var firstCountryByte = this.firstCountryBytePosition();
	this.decodeGeoRecords(firstCountryByte, this.header.n1);
};

SRDecoder.prototype.decodeRegions = function() {
	var firstRegionByte = this.firstRegionBytePosition();
	this.decodeGeoRecords(firstRegionByte, this.header.n3);
};

SRDecoder.prototype.decodeContinentData = function() {
	var firstContinentByte = this.firstContinentBytePosition();
	this.decodeGeoRecords(firstContinentByte, 6);
};

SRDecoder.prototype.decodeHemisphereData = function() {
	var firstHemisphereByte = this.firstHemisphereBytePosition();
	this.decodeGeoRecords(firstHemisphereByte, 3);
};

SRDecoder.prototype.decodeGlobalData = function() {
	var firstGlobalByte = this.firstGlobalBytePosition();
	this.decodeGeoRecords(firstGlobalByte, 1);
};

SRDecoder.prototype.decodeTravelData = function() {
	var firstTravelByte = this.firstTravelDataBytePosition();
	this.decodeTravelRecords(firstTravelByte);
};

SRDecoder.prototype.decodeGeoRecords = function(firstByte, numAreas) {
	var data = new DataView(this.data, firstByte);
	var numOutputCompartments = this.header.outputCompartments.length;

	var stats = {
		newCasesMax : 0,
		cumulativeCasesMax : 0
	};

	for (var area = 0; area < numAreas; area++) {
		var newCases = {};
		var cumulativeCases = {};

		var areaOffset = area * this.recordSize;
		var geoId = data.getUint16(areaOffset);

		for (var oc = 0; oc < numOutputCompartments; oc++) {
			var compartment = this.header.outputCompartments[oc];
			var ocOffset = areaOffset + GEOID_SIZE + oc*OC_SIZE;

			newCases[compartment] = data.getFloat32(ocOffset);
			cumulativeCases[compartment] = data.getFloat32(ocOffset + FLOAT_SIZE);
			stats.newCasesMax = Math.max(stats.newCasesMax, newCases[compartment]);
			stats.cumulativeCasesMax = Math.max(stats.cumulativeCasesMax, cumulativeCases[compartment]);
		}

		this.dayRecord.addNewCasesRecord(geoId, newCases);
		this.dayRecord.addCumulativeCasesRecord(geoId, cumulativeCases);
	}
	return stats;
};

SRDecoder.prototype.decodeTravelRecords = function(firstByte) {
	var data = new DataView(this.data, firstByte);
	var numTravelCompartments = this.header.travelCompartments.length;

	for (var byteOffset = 0; byteOffset < data.byteLength; byteOffset += this.travelRecordSize) {
		var travelRecord = {};
		travelRecord.originBasin = data.getUint16(byteOffset);
		travelRecord.destinationBasin = data.getUint16(byteOffset + GEOID_SIZE);
		travelRecord.compartments = {};

		for (var tc = 0; tc < numTravelCompartments; tc++) {
			var compartment = this.header.travelCompartments[tc];
			var tcOffset = byteOffset + (GEOID_SIZE * 2) + (tc * TC_SIZE);

			travelRecord.compartments[compartment] = data.getUint16(tcOffset);
		}

		this.dayRecord.addTravelRecord(travelRecord);
	}
};


var DayRecord = function(header) {
	this.outputCompartments = header.outputCompartments;
	this.travelCompartments = header.travelCompartments;
	this.dayNumber = header.day;
	this.numBasins = header.n0;
	this.numCountries = header.n1;
	this.numRegions = header.n2;

	this.newCases = {};
	this.cumulativeCases = {};
	this.travelRecords = [];
};

DayRecord.prototype.addNewCasesRecord = function(geoId, rec) {
	this.newCases[geoId] = rec;
};

DayRecord.prototype.addCumulativeCasesRecord = function(geoId, rec) {
	this.cumulativeCases[geoId] = rec;
};

DayRecord.prototype.addTravelRecord = function(travelRecord) {
	this.travelRecords.push(travelRecord);
};
