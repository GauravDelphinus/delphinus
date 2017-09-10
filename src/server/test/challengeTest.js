var chai = require("chai");
var chaiHttp = require("chai-http");
var app = require("../app")();
var dataUtils = require("../dataUtils");
var logger = require("../logger");

var should = chai.should();
var assert = chai.assert;

chai.use(chaiHttp);



describe("Challenge Routes", function() {
	this.timeout(10000);

	//call before running any tests in this block
	before(function(done) {
      //initialize DB
		var testData = require("./testData");
		dataUtils.initializeDBWithData(testData, function(err) {
			if (err) {
				//DB couldn't be initialized.
			}
			done();
		});
    });

	//call after running all tests in this block
    after(function(done) {
    	//potentially, remove the db stuff that was added
    	done();
    });

	describe("GET /api/challenges?sortBy=dateCreated", function() {
		it("should return list of all challenges sorted by dateCreated", function(done) {
			chai.request(app)
			.get("/api/challenges?sortBy=dateCreated")
			.end(function(err, res) {
				assert.equal(res.status, 200);
				assert.isArray(res.body);
				assert.isAtLeast(res.body.length, 3);
				logger.debug("res.body is " + JSON.stringify(res.body));
				done();
			});
		});
	});

	describe("GET /api/challenges?sortBy=popularity", function() {
		it("should return list of all challenges sorted by popularity", function(done) {
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

	describe("GET /api/challenges/:challengeId", function() {
		it("should return the specific challenge details", function(done) {
			chai.request(app)
			.get("/api/challenges/HkQawQ4PW")
			.end(function(err, res) {
				assert.equal(res.status, 200);
				assert.isObject(res.body);
				assert.equal(res.body.type, "challenge");
				done();
			});
		});
	});
});