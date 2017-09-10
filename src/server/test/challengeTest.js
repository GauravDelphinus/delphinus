var chai = require("chai");
var chaiHttp = require("chai-http");
var app = require("../../server/app")();

var should = chai.should();
var assert = chai.assert;

chai.use(chaiHttp);

describe("Challenge Routes", function() {
	describe("GET /api/challenges?sortBy=dateCreated", function() {
		it("should return list of all challenges", function(done) {
			chai.request(app)
			.get("/api/challenges?sortBy=dateCreated")
			.end(function(err, res) {
				res.should.have.status(200);
				res.body.should.be.an("array");
				res.body.length.should.be.eql(25);
				done(err);
			});
		});
	});

	describe("GET /api/challenges?sortBy=popularity", function() {
		it("should return list of all challenges", function(done) {
			chai.request(app)
			.get("/api/challenges?sortBy=popularity")
			.end(function(err, res) {
				res.should.have.status(200);
				res.body.should.be.an("array");
				res.body.length.should.be.eql(25);
				done(err);
			});
		});
	});

	describe("GET /api/challenges", function() {
		it("should return status 400 because of missing required query parameter: sortBy", function(done) {
			chai.request(app)
			.get("/api/challenges")
			.end(function(err, res) {
				res.should.have.status(400);
				res.body.should.be.an("object"); //object contains the 400 status message - see http://expressjs.com/en/api.html#res.sendStatus
				done(err);
			});
		});
	});
});