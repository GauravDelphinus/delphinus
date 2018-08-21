/**
	Initialization and Termination calls, called ONCE globally for *all* tests.

	Good place to add DB initialization/cleaning routines so that all tests can 
	assume that certain data is present in the DB.
**/

require("../init")();

var dbInit = require("../db/dbInit");
const dynamicConfig = require("../config/dynamicConfig");

/**
	Called ONCE before starting to run the list of all tests.
**/
before(function(done) {
	this.enableTimeouts(false);

	//first ensure we have the configuration set correctly
	require("dotenv").config();
	if (!dynamicConfig.dbUsername || !dynamicConfig.dbPassword || !dynamicConfig.dbHostname || !dynamicConfig.nodeHostname) {
		return done(new Error("Missing NEO4J authentication fields in the .env file, or .env file missing"));
	}

	//initialize DB
	var testData = require("./testData");
	const neo4j = require("node-neo4j");

	const db = new neo4j("http://" + dynamicConfig.dbUsername + ":" + dynamicConfig.dbPassword + "@" + dynamicConfig.dbHostname);

	dbInit.initializeDB(db, function(err) {
		if (err) {
			return done(err);
		}
	
		dbInit.initializeDBWithData(testData, function(err) {
			if (err) {
				//DB couldn't be initialized.
				return done(err);
			}
			return done();
		});
	});
});

/**
	Called ONCE after all tests have finished executing.
**/
after(function(done) {
	this.enableTimeouts(false);
	
	//initialize DB
	var testData = require("./testData");

	//Remove all Test Data values from DB
	dbInit.deleteDataFromDB(testData, function(err) {
		if (err) {
			//DB couldn't be initialized.
			return done(err);
		}
		return done();
	});
});
