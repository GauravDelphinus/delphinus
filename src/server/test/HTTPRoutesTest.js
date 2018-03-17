/**
	Sanity tests to make sure all HTTP routes are working as expected.

	Not testing detailed business logic, but just that the endpoints are up and running.

	For detailed tests, refer the relevant test files.
**/

require("../init")();

var dbInit = require("../db/dbInit");
var chai = require("chai");
var chaiHttp = require("chai-http");
var request = require("request");

var app = require("../app");
var logger = require("../logger");

var should = chai.should();
var assert = chai.assert;

chai.use(chaiHttp);

var server = null;

describe("HTTP Routes", function() {
	this.timeout(10000);

	it("dummy test", function() {
		assert.equal("true", "true");
	});

	describe("Client Endpoints", function() {
		it("/ should return 200", function(done) {
			request.get(process.env.HOSTNAME + "/", function(err, res, body) {
				if (err) {
					return done(err);
				}
				assert.equal(res.statusCode, 200);
				return done();
			});
		});
	});
	
	describe("API Endpoints", function() {
		it("/api/challenges should return 200", function(done) {
			request.get(process.env.HOSTNAME + "/api/challenges", function(err, res, body) {
				if (err) {
					return done(err);
				}
				assert.equal(res.statusCode, 200);
				return done();
			});
		});

		it("/api/entries should return 200", function(done) {
			request.get(process.env.HOSTNAME + "/api/entries", function(err, res, body) {
				if (err) {
					return done(err);
				}
				assert.equal(res.statusCode, 200);
				return done();
			});
		});

		it("/api/users should return 200", function(done) {
			request.get(process.env.HOSTNAME + "/api/users", function(err, res, body) {
				if (err) {
					return done(err);
				}
				assert.equal(res.statusCode, 200);
				return done();
			});
		});
	});
	
	/*
	//call before running any tests in this block
	before(function(done) {
		//initialize DB
		var testData = require("./testData");
		dataUtils.initializeDBWithData(testData, function(err) {
			if (err) {
				//DB couldn't be initialized.
				done(err);
			}
			done();
		});
    });

	//call after running all tests in this block
    after(function(done) {
    	//potentially, remove the db stuff that was added
    	done();
    });



	describe("Challenge Routes", function() {		
		describe("GET /api/challenges?sortBy=dateCreated", function() {
			it("should return list of all challenges sorted by dateCreated", function(done) {
				chai.request(server)
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
			it("should return list of all challenges sorted by popularity", function(done) {
				chai.request(server)
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
				chai.request(server)
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
				chai.request(server)
				.get("/api/challenges/HkQawQ4PW")
				.end(function(err, res) {
					assert.equal(res.status, 200);
					assert.isObject(res.body);
					assert.equal(res.body.type, "challenge");
					assert.equal(res.body.caption, "My First Challenge Title");
					done();
				});
			});
		});
	});

	describe("Entry Routes", function() {		
		describe("GET /api/entries?sortBy=dateCreated", function() {
			it("should return list of all entries sorted by dateCreated", function(done) {
				chai.request(server)
				.get("/api/entries?sortBy=dateCreated")
				.end(function(err, res) {
					assert.equal(res.status, 200);
					assert.isArray(res.body);
					assert.isAtLeast(res.body.length, 4);
					done();
				});
			});
		});

		describe("GET /api/entries?sortBy=popularity", function() {
			it("should return list of all entries sorted by popularity", function(done) {
				chai.request(server)
				.get("/api/entries?sortBy=popularity")
				.end(function(err, res) {
					assert.equal(res.status, 200);
					assert.isArray(res.body);
					assert.isAtLeast(res.body.length, 4);
					done();
				});
			});
		});

		describe("GET /api/entries", function() {
			it("should return status 400 because of missing required query parameter: sortBy", function(done) {
				chai.request(server)
				.get("/api/entries")
				.end(function(err, res) {
					assert.equal(res.status, 400);
					assert.isObject(res.body); //object contains the 400 status message - see http://expressjs.com/en/api.html#res.sendStatus
					done();
				});
			});
		});

		describe("GET /api/entries/:entryId", function() {
			it("should return the specific entry details", function(done) {
				chai.request(server)
				.get("/api/entries/NkQbwW4PK")
				.end(function(err, res) {
					assert.equal(res.status, 200);
					assert.isObject(res.body);
					assert.equal(res.body.type, "entry");
					assert.equal(res.body.caption, "My Fourth Entry Caption");
					done();
				});
			});
		});
	});
	*/
});


