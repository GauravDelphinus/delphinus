function DBResultError (query, expectedCount, actualCount) {
	this.name = "DBResultError";
	this.message = ("Ran Cypher Query: " + query + ", Expected Count of Result: " + expectedCount + ", but Actual Count: " + actualCount);
}

function DataValidationError (data, prototype) {
	this.name = "DataValidationError";
	this.message = "Data Validation failed for Data: " + JSON.stringify(data) + ", against Prototype: " + JSON.stringify(prototype);
}

module.exports = {
	DBResultError : DBResultError,
	DataValidationError : DataValidationError
};

DBResultError.prototype = Error.prototype;
DataValidationError.prototype = Error.prototype;