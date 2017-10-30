require("../init")();

var chai = require("chai");
var chaiHttp = require("chai-http");
var dataUtils = require("../dataUtils");

var app = require("../app");
var logger = require("../logger");

var should = chai.should();
var assert = chai.assert;

chai.use(chaiHttp);

var server = null;

/*
before(function(done) { //higher level - called only once for all tests
	// Initialize app and store in 'server' variable
	this.timeout(15000); //need this since init of app can take a bit of time
	app(function(err, appServer) {
		if (err) {
			logger.error("Fatal Error.  Node JS App NOT STARTED.  " + err);
			return done(err);
		}

		server = appServer;
		return done();
	});
});
*/

describe("HTTP Routes", function() {
	this.timeout(10000);

	it("dummy test", function() {
		assert.equal("true", "true");
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


