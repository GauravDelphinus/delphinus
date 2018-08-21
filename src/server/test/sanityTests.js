/**
	Sanity tests to make sure all HTTP routes are working as expected.

	Not testing detailed business logic, but just that the endpoints are up and running.

	For detailed tests, refer the relevant test files.
**/

var dbInit = require("../db/dbInit");
var request = require("request");
var assert = require("chai").assert;
const dynamicConfig = require("../config/dynamicConfig");

describe("Sanity Tests", function() {
	this.timeout(10000);

	it("dummy test", function() {
		assert.equal("true", "true");
	});

	describe("Page Endpoints", function() {
		it("/ should return 200", function(done) {
			request.get(dynamicConfig.nodeHostname + "/", function(err, res, body) {
				if (err) {
					return done(err);
				}
				assert.equal(res.statusCode, 200);
				return done();
			});
		});

		it("/privacy should return 200", function(done) {
			request.get(dynamicConfig.nodeHostname + "/privacy", function(err, res, body) {
				if (err) {
					return done(err);
				}
				assert.equal(res.statusCode, 200);
				return done();
			});
		});

		it("/contact should return 200", function(done) {
			request.get(dynamicConfig.nodeHostname + "/contact", function(err, res, body) {
				if (err) {
					return done(err);
				}
				assert.equal(res.statusCode, 200);
				return done();
			});
		});

		it("/auth should return 200", function(done) {
			request.get(dynamicConfig.nodeHostname + "/auth", function(err, res, body) {
				if (err) {
					return done(err);
				}
				assert.equal(res.statusCode, 200);
				return done();
			});
		});

		it("/newchallenge should return 200", function(done) {
			request.get(dynamicConfig.nodeHostname + "/newchallenge", function(err, res, body) {
				if (err) {
					return done(err);
				}
				assert.equal(res.statusCode, 200);
				return done();
			});
		});

		it("/newentry should return 200", function(done) {
			request.get(dynamicConfig.nodeHostname + "/newentry", function(err, res, body) {
				if (err) {
					return done(err);
				}
				assert.equal(res.statusCode, 200);
				return done();
			});
		});
	});
	
	describe("API Endpoints", function() {
		it("/api/feeds should return 200", function(done) {
			request.get(dynamicConfig.nodeHostname + "/api/feeds", function(err, res, body) {
				if (err) {
					return done(err);
				}
				assert.equal(res.statusCode, 200);
				return done();
			});
		});

		it("/api/challenges should return 200", function(done) {
			request.get(dynamicConfig.nodeHostname + "/api/challenges", function(err, res, body) {
				if (err) {
					return done(err);
				}
				assert.equal(res.statusCode, 200);
				return done();
			});
		});

		it("/api/entries should return 200", function(done) {
			request.get(dynamicConfig.nodeHostname + "/api/entries", function(err, res, body) {
				if (err) {
					return done(err);
				}
				assert.equal(res.statusCode, 200);
				return done();
			});
		});

		it("/api/users should return 200", function(done) {
			request.get(dynamicConfig.nodeHostname + "/api/users", function(err, res, body) {
				if (err) {
					return done(err);
				}
				assert.equal(res.statusCode, 200);
				return done();
			});
		});

		it("/api/posts should return 200", function(done) {
			request.get(dynamicConfig.nodeHostname + "/api/posts", function(err, res, body) {
				if (err) {
					return done(err);
				}
				assert.equal(res.statusCode, 200);
				return done();
			});
		});

		it("/api/comments should return 200", function(done) {
			request.get(dynamicConfig.nodeHostname + "/api/comments", function(err, res, body) {
				if (err) {
					return done(err);
				}
				assert.equal(res.statusCode, 200);
				return done();
			});
		});

		it("/api/designs should return 200", function(done) {
			request.get(dynamicConfig.nodeHostname + "/api/designs", function(err, res, body) {
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


