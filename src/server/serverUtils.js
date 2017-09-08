var fs = require("fs");
var logger = require("./logger");
var shortid = require("shortid");
var validUrl = require("valid-url");

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
				type: (one of the options below)
					id // shortid type id string
					["validValue1", "validValue2", ...] //list of actual values, case sensitive
					imageData // base64 encoded image data (may or may not include base64 prefix)
					imageType // valid mime type value for image types (e.g., image/png)
					time // positive integer representing time elapsed since 1970 in milliseconds
					caption // string representing the caption.  Not more than 1000 characters long

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
				logger.error("Missing required param: " + param.name);
				return false;
			}

			if (query.hasOwnProperty(param.name)) {
				if (param.type.constructor === Array) {
					if (!param.type.includes(query[param.name])) {
						logger.error("Invalid value '" + query[param.name] + "' received for param: '" + param.name + "', expected among " + JSON.stringify(param.type));
						return false;
					}
				} else if (param.type == "id") {
					if (!shortid.isValid(query[param.name])) {
						logger.error("Invalid ID '" + query[param.name] + "' received for param: '" + param.name + "'");
						return false;
					}
				} else if (param.type == "imageType") {
					if (!(query[param.name] == "image/png" || query[param.name] == "image/jpeg" || query[param.name] == "image/gif")) {
						logger.error("Invalid Image Type '" + query[param.name] + "' received for param: '" + param.name + "'");
						return false;
					}
				} else if (param.type == "imageData") {
					var imageData = query[param.name];
					if (!imageData.startsWith("data:image/")) {
						logger.error("Invalid Image Data received - does not start with 'data:image/'");
						return false;
					}

					var imageBlob; //actual image data in base64 encoding
					var index = imageData.indexOf("base64,");
					if (index == -1) {
						logger.error("Invalid Image Data received - does not contain 'base64,'");
						return false; //expected the format to include base64
					}

					imageBlob = imageDataURI.slice(index + 7);
					/*
						Now, check that the starting few bytes match either jpeg, png or gif
						Refer: https://stackoverflow.com/questions/3312607/php-binary-image-data-checking-the-image-type
					*/
					if (!(imageBlob.startsWith("/9j/") || imageBlob.startsWith("iVBORw0KGgo=") || imageBlob.startsWith("R0lG"))) {
						logger.error("Invalid Image Data received - Starting bytes don't match PNG, JPEG or GIF");
						return false;
					}
				} else if (param.type == "string") {
					if (query[param.name].length > 1000) {
						logger.error("Invalid value '" + query[param.name] + "' received for param '" + param.name + "' - Character Length > 1000");
						return false;
					}
				} else if (param.type == "number") {
					if (query[param.name] !== parseInt(query[param.name], 10)) {
						logger.error("Invalid value '" + query[param.name] + "' received for param '" + param.name + "' - Not an integer");
						return false;
					}
				} else if (param.type == "url") {
					if (!validUrl.isUri(query[param.name])) {
						logger.error("Invalid URL '" + query[param.name] + "' received for param '" + param.name + "'");
						return false;
					}
				} else if (param.type == "category") {
					var categories = require("./categories");
					if (!categories.hasOwnProperty(query[param.name])) {
						logger.error("Invalid Category '" + query[param.name] + "' received for param '" + param.name + "'");
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
