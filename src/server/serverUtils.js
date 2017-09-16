var fs = require("fs");
var logger = require("./logger");
var shortid = require("shortid");
var validUrl = require("valid-url");
var url = require("url");

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
				if (!this.validateItem(param.type, param.name, query[param.name])) {
					return false;
				}
			}
		}

		return true;
	},
	/*
	object: {
	    "type": "challenge",
	    "id": "HkQawQ4PW",
	    "compareDate": "1501996987212",
	    "socialStatus": {
	        "likes": {
	            "numLikes": 0,
	            "amLiking": false
	        },
	        "shares": {
	            "numShares": 0
	        },
	        "comments": {
	            "numComments": 0
	        },
	        "entries": {
	            "numEntries": 1
	        }
	    },
	    "postedDate": "1501996987212",
	    "postedByUser": {
	        "image": "https://wwwf.imperial.ac.uk/blog/student-blogs/files/2017/01/stokes-profile-400-1.png",
	        "lastSeen": "1501996987212",
	        "displayName": "Test User 1",
	        "id": "GkQawQ3PW",
	        "_id": 1030
	    },
	    "image": "/contentImages/challenges/HkQawQ4PW.jpeg",
	    "imageType": "image/jpeg",
	    "caption": "My First Challenge Title",
	    "link": "/challenge/HkQawQ4PW",
	    "categoryName": "Motivation",
	    "categoryID": "motivation"
	}

	prototype: 

	var prototype = {
		"challenge" : {
			"type" : ["challenge" | "entry" | "user"],
			"id" : "id",
			"compareDate" : "number",
			"socialStatus" : {
				"likes" : {
					"numLikes" : "number",
					"amLiking" : ["true" | "false"]
				},
				"shares" : {
					"numShares" : "number"
				},
				"comments" : {
					"numComments" : "number"
				},
				"entries": {
					"numEntries" : "number"
				}
			},
			"postedDate" : "number",
			"postedByUser" : "postedByUser",
			"image": "url",
			"imageType": "imageType",
			"caption": "string",
			"link" : "url",
			"categoryName" : "string",
			"categoryID" : "id"
		},
		"postedByUser" : {
			"id" : "id",
			"displayName" : "string",
			"image" : "url",
			"lastSeen" : "number"
		}
	};
	*/
	validateItem: function(type, name, value, logError = true) {
		//logger.debug("validateItem: type: " + JSON.stringify(type) + ", name: " + name + ", value: " + value);
		if (type.constructor === Array) {
			if (type.indexOf(value) == -1) {
				var found = false;
				for (var i = 0; i < type.length; i++) {
					if (this.validateItem(type[i], name, value, false)) {
						found = true;
						break;
					}
				}
				if (!found) {
					logger.errorIf(logError, "Invalid value '" + value + "' received for param: '" + name + "', expected among " + JSON.stringify(type));
					return false;
				}
			}
		} else if (type == "id") {
			if (!shortid.isValid(value)) {
				logger.errorIf(logError, "Invalid ID '" + value + "' received for param: '" + name + "'");
				return false;
			}
		} else if (type == "imageType") {
			if (!(value == "image/png" || value == "image/jpeg" || value == "image/gif")) {
				logger.errorIf(logError, "Invalid Image Type '" + value + "' received for param: '" + name + "'");
				return false;
			}
		} else if (type == "imageData") {
			if (!value.startsWith("data:image/")) {
				logger.errorIf(logError, "Invalid Image Data received for param: " + name + " - does not start with 'data:image/'");
				return false;
			}

			var imageBlob; //actual image data in base64 encoding
			var index = value.indexOf("base64,");
			if (index == -1) {
				logger.errorIf(logError, "Invalid Image Data received - does not contain 'base64,'");
				return false; //expected the format to include base64
			}

			imageBlob = value.slice(index + 7);
			/*
				Now, check that the starting few bytes match either jpeg, png or gif
				Refer: https://stackoverflow.com/questions/3312607/php-binary-image-data-checking-the-image-type
			*/
			if (!(imageBlob.startsWith("/9j/") || imageBlob.startsWith("iVBORw0KGgo") || imageBlob.startsWith("R0lG"))) {
				logger.errorIf(logError, "Invalid Image Data received - Starting bytes don't match PNG, JPEG or GIF");
				return false;
			}
		} else if (type == "string") {
			if (value.length > 1000) {
				logger.errorIf(logError, "Invalid value '" + value + "' received for param '" + name + "' - Character Length > 1000");
				return false;
			}
		} else if (type == "number") {
			if (isNaN(parseFloat(value))) {
				logger.errorIf(logError, "Invalid value '" + value + "' received for param '" + name + "' - Not a number");
				//throw new Error("");
				return false;
			}
		} else if (type == "url") {
			if (!validUrl.isUri(value)) {
				logger.errorIf(logError, "Invalid URL '" + value + "' received for param '" + name + "'");
				return false;
			}
		} else if (type == "myURL") {
			if (!(value.startsWith("/") || url.parse(value).hostname == global.hostname)) {
				logger.errorIf(logError, "Invalid URL '" + value + "' received for param '" + name + "'");
				return false;
			}
		} else if (type == "category") {
			var categories = require("./categories");
			if (!categories.hasOwnProperty(value)) {
				logger.errorIf(logError, "Invalid Category '" + value + "' received for param '" + name + "'");
				return false;
			}
		} else if (type == "filter") {
			var filters = require("./presets").presetFilter;
			if (!filters.hasOwnProperty(value)) {
				logger.errorIf(logError, "Invalid Filter '" + value + "' received for param '" + name + "'");
				return false;
			}
		} else if (type == "layout") {
			var layouts = require("./presets").presetLayout;
			if (!layouts.hasOwnProperty(value)) {
				logger.errorIf(logError, "Invalid Layout '" + value + "' received for param '" + name + "'");
				return false;
			}
		} else if (type == "artifact") {
			var artifacts = require("./presets").presetArtifact;
			if (!artifacts.hasOwnProperty(value)) {
				logger.errorIf(logError, "Invalid Artifact '" + value + "' received for param '" + name + "'");
				return false;
			}
		} else if (type == "decoration") {
			var decorations = require("./presets").presetDecoration;
			if (!decorations.hasOwnProperty(value)) {
				logger.errorIf(logError, "Invalid Decoration '" + value + "' received for param '" + name + "'");
				return false;
			}
		}

		return true;
	},

	validateObjectWithPrototype: function(object, prototype) {
		//logger.debug("validateObjectWithPrototype: object: " + JSON.stringify(object) + ", prototype: " + JSON.stringify(prototype));
		if (typeof object !== 'object' || typeof prototype !== 'object') {
			logger.error("validateObjectWithPrototype: either one of object or prototype are not a valid object");
			return false;
		}

		for (var key in object) {
			if (!prototype.hasOwnProperty(key)) {
				logger.error("prototype doesn't have the key: " + key);
				return false;
			}

			if (object[key] == undefined) {
				logger.error("object[key] is undefined, for key = " + key + ", object = " + JSON.stringify(object));
				return false;
			}

			if (typeof object[key] === 'object') {
				if (typeof prototype[key] !== 'object') {
					//logger.debug("prototype[key] is not an object, so looking at the predefined prototypes");
					//check to see if there's a prototype available
					if (this.prototypes.hasOwnProperty(key) && typeof this.prototypes[key] === 'object') {
						if (!this.validateObjectWithPrototype(object[key], this.prototypes[key])) {
							return false;
						}
					} else {
						return false;
					}
				} else if (!this.validateObjectWithPrototype(object[key], prototype[key])) { //call recursively if object found
					return false;
				}
			} else {
				if (!this.validateItem(prototype[key], key, object[key])) {
					return false;
				}
			}
		}

		return true;
	},

	/*
		Validate output sent back to client from server.
		Note that this acts like a filter - if a property is not present in the actual data
		it will *not* catch it, but if it is present it will make sure to match and validate
		it using the prototype.
	*/
	validateData: function(data, prototype, strict = true) {
		if (data.constructor === Object) { //object
			if (!this.validateObjectWithPrototype(data, prototype)) {
				return false;
			}
		} else if (data.constructor === Array) { //array
			var invalidIndexes = [];
			for (var i = 0; i < data.length; i++) {
				if (!this.validateObjectWithPrototype(data[i], prototype)) {
					if (strict) {
						return false;
					} else {
						invalidIndexes.push(i);
					}
				}
			}
			if (data.length > 0 && !strict) {
				if (invalidIndexes.length == data.length) {
					//not even a single object in the array is valid, so just return false
					logger.error("validateData, non-strict mode, but entire array is invalid");
					return false;
				} else {
					//at least one valid object found in the array
					for (let j = invalidIndexes.length - 1; j >= 0; j--) {
						data.splice(invalidIndexes[j], 1);
					}
					logger.error("validateData, non-strict mode, some objects found to be valid");
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
	  wr.on("close", function(err) {
	    done(err);
	  });
	  rd.pipe(wr);

	  function done(err) {
	    if (!cbCalled) {
	      cb(err);
	      cbCalled = true;
	    }
	  }
	},

	mergeFeeds: function(feedsArray, mergedFeed) {
		var indices = [];
		for (var i = 0; i < feedsArray.length; i++) {
			indices.push(-1);
			//console.log("feedsArray " + i + ":");
			var feed = feedsArray[i];
			if (feed.length > 0) {
				indices[i] = 0;
			}
		}

		while (true) {
			var found = indices.find(checkIndexRemaining);
			//console.log("found is " + found);
			if (found === undefined) {
				break;
			}
			var smallestDataObject = findAndIncrementSmallest(indices, feedsArray);
			if (smallestDataObject !== null && (mergedFeed.findIndex(alreadyExists, smallestDataObject) == -1)) {
				mergedFeed.push(smallestDataObject);
			}
			
		}
	},

	/*
		Prototypes used for validating output sent back to client from server.
		Note that this acts like a filter - if a property is not present in the actual data
		it will *not* catch it, but if it is present it will make sure to match and validate
		it using the prototype.
	*/
	prototypes: {
		"challenge" : {
			"type" : ["challenge"],
			"id" : "id",
			"compareDate" : "number",
			"socialStatus" : {
				"likes" : {
					"numLikes" : "number",
					"amLiking" : [true , false]
				},
				"shares" : {
					"numShares" : "number"
				},
				"comments" : {
					"numComments" : "number"
				},
				"entries": {
					"numEntries" : "number"
				}
			},
			"postedDate" : "number",
			"postedByUser" : "postedByUser",
			"image": "myURL",
			"imageType": "imageType",
			"caption": "string",
			"link" : "myURL",
			"categoryName" : "string",
			"categoryID" : "category",
			"activity" : "activity"
		},
		"postedByUser" : {
			"id" : "id",
			"displayName" : "string",
			"image" : ["url", "myURL"],
			"lastSeen" : "number"
		},
		"onlyId" : {
			"id" : "id"
		},
		"category" : {
			"name" : "string",
			"id" : "category"
		},
		"comment" : {
			"type" : ["comment"],
			"id" : "id",
			"compareDate" : "number",
			"postedDate" : "number",
			"postedByUser" : "postedByUser",
			"socialStatus" : {
				"likes" : {
					"numLikes" : "number",
					"amLiking" : [true , false]
				},
			},
			"text" : "string"
		},
		"entry" : {
			"type" : ["entry"],
			"id" : "id",
			"compareDate" : "number",
			"socialStatus" : {
				"likes" : {
					"numLikes" : "number",
					"amLiking" : [true , false]
				},
				"shares" : {
					"numShares" : "number"
				},
				"comments" : {
					"numComments" : "number"
				}
			},
			"postedDate" : "number",
			"postedByUser" : "postedByUser",
			"image": "myURL",
			"imageType": "imageType",
			"caption": "string",
			"link" : "myURL",
			"activity" : "activity"
		},
		"activity" : {
			"type" : ["recentlyPosted", "recentlyLiked", "recentlyCommented"],
			"comment": {
				"postedDate" : "number",
				"postedByUser" : "postedByUser",
				"socialStatus" : {
					"likes" : {
						"numLikes" : "number"
					}
				}
			},
			"like" : {
				"postedByUser" : "postedByUser",
				"postedDate": "number"
			}
		},
		"filter" : {
			"id" : "filter",
			"name" : "string"
		},
		"artifact" : {
			"id" : "artifact",
			"name" : "string"
		},
		"decoration" : {
			"id" : "decoration",
			"name" : "string"
		},
		"layout" : {
			"id" : "layout",
			"name" : "string"
		},
		"imageInfo" :  {
			"imageType" : ["url"],
			"imageData" : "myURL"
		},
		"user" : {
			"type" : ["user"],
			"id" : "id",
			"compareDate" : "number",
			"image": ["url", "myURL"],
			"caption": "string",
			"link" : "myURL",
			"lastSeen" : "number",
			"socialStatus" : {
				"facebook" : {
					"profileLink" : "url"
				},
				"twitter" : {
					"profileLink" : "url"
				},
				"follows" : {
					"numFollowers" : "number",
					"amFollowing" : [true, false]
				},
				"posts" : {
					"numPosts" : "number"
				}
			}
		}
	}
}

function checkIndexRemaining(index) {
	return (index != -1);
}

function objectLessThan(data1, data2) {
	if (data2 === null) {
		return true;
	}

	if (data1.compareDate > data2.compareDate) {
		return true;
	}

	return false;
}

function alreadyExists(element) {
	//console.log("alreadyExists: element.id = " + element.id + ", this.id = " + this.id);	
	return (element.id == this.id);
}

function findAndIncrementSmallest(indices, feedsArray) {
	var smallest = null;
	var smallestIndex = -1;

	for (var i = 0 ; i < indices.length; i++) {
		var index = indices[i];
		var feed = feedsArray[i];

		//console.log("in for loop, i = " + i + ", index = " + index + ", feed[index]  = " + feed[index]);
		if (index != -1) {
			//console.log("calling objectLessThan with feed[index].created = " + feed[index].postedDate + ", ")
			if (objectLessThan(feed[index], smallest)) {
				smallest = feed[index];
				smallestIndex = i;
			}
		}
		
	}

	indices[smallestIndex]++;
	if (indices[smallestIndex] == feedsArray[smallestIndex].length) {
		indices[smallestIndex] = -1;
	}

	//console.log("returning smallest as " + smallest.id + ", created = " + smallest.compareDate);
	return smallest;
}


