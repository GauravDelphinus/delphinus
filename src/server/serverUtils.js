var fs = require("fs");
var logger = require("./logger");

module.exports = {
	/**
		Validate Client Query Params

		Validation format:
			[
				{param1},
				{param2},
				...
			]

			Each param object can have these properties:
				name: <name of query param>
				required: yes | no // absense of this property implies an optional field
				type: id | ["validValue1", "validValue2", ...]

			For example:
			var validationParams = [
				{
					name: "sortBy",
					required: "yes",
					type: ["dateCreated", "popularity"]
				},
				{
					name: "postedBy",
					required: "no", //can also be left out
					type: "id"
				},
				{
					name: "category",
					type: "id"
				}
			];
	**/
	validateQueryParams(query, validationParams) {
		for (var i = 0; i < validationParams.length; i++) {
			var param = validationParams[i];
			if (param.required && param.required == "yes" && !query.hasOwnProperty(param.name)) {
				logger.error("Missing required query param: " + param.name);
				return false;
			}

			if (query.hasOwnProperty(param.name)) {
				if (param.type.constructor === Array) {
					if (!param.type.includes(query[param.name])) {
						logger.error("Invalid value '" + query[param.name] + "' received for query param: '" + param.name + "', expected among " + JSON.stringify(param.type));
						return false;
					}
				} else if (param.type == "id") {
					if (!shortid.isValid(query[param.name])) {
						logger.error("Invalid ID '" + query[param.name] + "' received for query param: '" + param.name + "'");
						return false;
					}
				}
			}
		}

		return true;
	},

	copyFile: function(source, target, cb) {
	  var cbCalled = false;

	  var rd = fs.createReadStream(source);
	  rd.on("error", function(err) {
	    done(err);
	  });
	  var wr = fs.createWriteStream(target);
	  wr.on("error", function(err) {
	    done(err);
	  });
	  wr.on("close", function(ex) {
	    done(0);
	  });
	  rd.pipe(wr);

	  function done(err) {
	    if (!cbCalled) {
	      cb(err);
	      cbCalled = true;
	    }
	  }
	}
}
