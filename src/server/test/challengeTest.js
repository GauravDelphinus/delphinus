var chai = require("chai");
var chaiHttp = require("chai-http");
var app = require("../app")();
var dataUtils = require("../dataUtils");

var should = chai.should();
var assert = chai.assert;

chai.use(chaiHttp);

//initialize DB
var testData = require("./testData");
dataUtils.initializeDBWithData(testData);

describe("Challenge Routes", function() {
	this.timeout(10000);

	describe("GET /api/challenges?sortBy=dateCreated", function() {
		it("should return list of all challenges", function(done) {
			chai.request(app)
			.get("/api/challenges?sortBy=dateCreated")
			.end(function(err, res) {
				assert.equal(res.status, 200);
				assert.isArray(res.body);
				assert.isAtLeast(res.body.length, 3);
				done();
			});
		});
	});

	describe("GET /api/challenges?sortBy=popularity", function() {
		it("should return list of all challenges", function(done) {
			chai.request(app)
			.get("/api/challenges?sortBy=popularity")
			.end(function(err, res) {
				assert.equal(res.status, 200);
				assert.isArray(res.body);
				assert.isAtLeast(res.body.length, 3);
				done();
			});
		});
	});

	describe("GET /api/challenges", function() {
		it("should return status 400 because of missing required query parameter: sortBy", function(done) {
			chai.request(app)
			.get("/api/challenges")
			.end(function(err, res) {
				assert.equal(res.status, 400);
				assert.isObject(res.body); //object contains the 400 status message - see http://expressjs.com/en/api.html#res.sendStatus
				done();
			});
		});
	});
});