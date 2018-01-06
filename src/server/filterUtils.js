var async = require("async");
var logger = require("./logger");
var config = require("./config");
var mime = require("mime");
var fs = require("fs");
var serverUtils = require("./serverUtils");
var shortid = require("shortid");
var dataUtils = require("./dataUtils");

module.exports = {
	extractSingleStepList : function(steps) {
		var singleStepList = [];

		var step = {};

		if (steps.layouts) {
			step.layouts = [];
			for (let i = 0; i < steps.layouts.length; i++) {
				var layout = {};
				step.layouts.push(layout);

				if (steps.layouts[i].size) {
					step.layouts[i].size = steps.layouts[i].size;
					singleStepList.push(cloneObject(step));
				}

				/* Future use
				if (steps.layouts[i].crop) {
					step.layouts[i].crop = steps.layouts[i].crop;
					singleStepList.push(cloneObject(step));
				}

				if (steps.layouts[i].mirror) {
					step.layouts[i].mirror = steps.layouts[i].mirror;
					singleStepList.push(cloneObject(step));
				}

				if (steps.layouts[i].rotation) {
					step.layouts[i].rotation = steps.layouts[i].rotation;
					singleStepList.push(cloneObject(step));
				}

				if (steps.layouts[i].shear) {
					step.layouts[i].shear = steps.layouts[i].shear;
					singleStepList.push(cloneObject(step));
				}
				*/

				if (steps.layouts[i].preset) {
					step.layouts[i].preset = steps.layouts[i].preset;
				}
				
				singleStepList.push(cloneObject(step));
			}
		}

		if (steps.filters) {
			step.filters = [];

			for (let i = 0; i < steps.filters.length; i++) {
				var filter = {};
				step.filters.push(filter);

				/* Future use
				if (steps.filters[i].settings) {
					step.filters[i].settings = steps.filters[i].settings;
					singleStepList.push(cloneObject(step));
				}

				if (steps.filters[i].effects) {
					step.filters[i].effects = {};

					if (steps.filters[i].effects.paint) {
						step.filters[i].effects.paint = steps.filters[i].effects.paint;
						singleStepList.push(cloneObject(step));
					}

					if (steps.filters[i].effects.grayscale) {
						step.filters[i].effects.grayscale = steps.filters[i].effects.grayscale;
						singleStepList.push(cloneObject(step));
					}

					if (steps.filters[i].effects.mosaic) {
						step.filters[i].effects.mosaic = steps.filters[i].effects.mosaic;
						singleStepList.push(cloneObject(step));
					}

					if (steps.filters[i].effects.negative) {
						step.filters[i].effects.negative = steps.filters[i].effects.negative;
						singleStepList.push(cloneObject(step));
					}

					if (steps.filters[i].effects.solarize) {
						step.filters[i].effects.solarize = steps.filters[i].effects.solarize;
						singleStepList.push(cloneObject(step));
					}

					if (steps.filters[i].effects.monochrome) {
						step.filters[i].effects.monochrome = steps.filters[i].effects.monochrome;
						singleStepList.push(cloneObject(step));
					}

					if (steps.filters[i].effects.swirl) {
						step.filters[i].effects.swirl = steps.filters[i].effects.swirl;
						singleStepList.push(cloneObject(step));
					}

					if (steps.filters[i].effects.wave) {
						step.filters[i].effects.wave = steps.filters[i].effects.wave;
						singleStepList.push(cloneObject(step));
					}

					if (steps.filters[i].effects.spread) {
						step.filters[i].effects.spread = steps.filters[i].effects.spread;
						singleStepList.push(cloneObject(step));
					}

					if (steps.filters[i].effects.charcoal) {
						step.filters[i].effects.charcoal = steps.filters[i].effects.charcoal;
						singleStepList.push(cloneObject(step));
					}
				}
				*/

				if (steps.filters[i].preset) {
					step.filters[i].preset = steps.filters[i].preset;
				}
				
				singleStepList.push(cloneObject(step));
			}
		}

		if (steps.artifacts) {
			step.artifacts = [];

			for (let i = 0; i < steps.artifacts.length; i++) {
				var artifact = {};
				step.artifacts.push(artifact);

				if (steps.artifacts[i].banner) {
					step.artifacts[i].banner = steps.artifacts[i].banner;
					singleStepList.push(cloneObject(step));
				}

				if (steps.artifacts[i].preset) {
					step.artifacts[i].preset = steps.artifacts[i].preset;
				}
				
				singleStepList.push(cloneObject(step));
			}
		}

		if (steps.decorations) {
			step.decorations = [];

			for (let i = 0; i < steps.decorations.length; i++) {
				var decoration = {};
				step.decorations.push(decoration);

				if (steps.decorations[i].border) {
					step.decorations[i].border = steps.decorations[i].border;
					singleStepList.push(cloneObject(step));
				}

				if (steps.decorations[i].preset) {
					step.decorations[i].preset = steps.decorations[i].preset;
				}
				
				singleStepList.push(cloneObject(step));
			}
		}

		return singleStepList;
	},

	validateSteps: function(steps) {
		return true;
	},

	generateHash: function(string) {
		var hash = 0;
		if (string.length == 0) return hash;
		for (let i = 0; i < string.length; i++) {
			let char = string.charCodeAt(i);
			hash = ((hash<<5)-hash)+char;
			hash = hash & hash; // Convert to 32bit integer
		}
	return hash;
	},

	processImageDataForEntry: function(entryData, createNodesIfNotFound, next) {
		async.waterfall([
		    function(callback) {
		    	if (entryData.sourceType == "challengeId") {
		    		var challengeId = entryData.sourceData;
					if (!challengeId) {
						logger.error("Challenge ID missing.");
						return callback(new Error("Challenge ID Missing."));
					}

					dataUtils.getImageDataForChallenge(challengeId, function(err, imageData){
						if (err) {
							return callback(err);
						}

						var sourceImagePath = global.appRoot + config.path.challengeImagesRaw + challengeId + "." + mime.extension(imageData.imageType);
						//var hash = this.generateHash(JSON.stringify(steps));
						//var targetImageName = entryData.challengeId + "-" + hash + "." + mime.extension(imageData.imageType);
						//var targetImagePath = global.appRoot + config.path.cacheImages + targetImageName;
						//var targetImageUrl = config.url.cacheImages + targetImageName;

    					return callback(null, {sourceImagePath: sourceImagePath, sourceFileIsTemp: false, /* targetImagePath: targetImagePath, targetImageUrl: targetImageUrl, */ imageType: imageData.imageType, sourceId: challengeId});
					});
				} else {
					return callback(null, null);
				}
		    },
		    function(info, callback) {
		    	if (info == null && entryData.sourceType == "imageURL") {
		    		var imageURL = entryData.sourceData;
		    		if (!imageURL) {
		    			logger.error("Missing Image URL.");
		    			return callback(new Error("Missing Image URL"));
		    		}

		    		if (createNodesIfNotFound) {
		    			dataUtils.createIndependentImageNode(entryData.sourceType, imageURL, entryData.userId, function(err, data) {
			    			if (err) {
			    				return callback(err);
			    			}

			    			var sourceImagePath = config.path.independentImagesRaw + data.id + "." + mime.extension(data.imageType);
			    			return callback(null, {sourceImagePath: sourceImagePath, sourceFileIsTemp: false, targetImagePath: null, targetImageUrl: null, imageType: data.imageType, sourceId: data.id});
			    		});
		    		} else {
		    			serverUtils.downloadImage(imageURL, null, function(err, outputPath) {
		    				if (err) {
		    					return callback(err);
		    				}

		    				var extension = imageURL.split('.').pop();
		    				var imageType = mime.lookup(extension);
		    				return callback(null, {sourceImagePath: outputPath, sourceFileIsTemp: true, /* targetImagePath: null, targetImageUrl: null, */ imageType: imageType, sourceId: 0});
		    			});
		    		}
		    	} else {
		    		return callback(null, info);
		    	}
		    },
		    function(info, callback) {
		    	if (info == null && entryData.sourceType == "dataURI") {
		    		var dataURI = entryData.sourceData;
		    		if (!dataURI) {
		    			logger.error("Missing Image URI");
		    			return callback(new Error("Missing Image URI"));
		    		}

					if (createNodesIfNotFound) {
		    			dataUtils.createIndependentImageNode(entryData.sourceType, dataURI, entryData.userId, function(err, data) {
			    			if (err) {
			    				return callback(err);
			    			}

			    			var sourceImagePath = config.path.independentImagesRaw + data.id + "." + mime.extension(data.imageType);
			    			return callback(null, {sourceImagePath: sourceImagePath, sourceFileIsTemp: false, targetImagePath: null, targetImageUrl: null, imageType: data.imageType, sourceId: data.id});
			    		});
		    		} else {
		    			serverUtils.writeImageFromDataURI(dataURI, null, function(err, outputPath) {
		    				if (err) {
		    					return callback(err);
		    				}

		    				var parseDataURI = require("parse-data-uri");
							var parsed = parseDataURI(dataURI);
		    				return callback(null, {sourceImagePath: outputPath, sourceFileIsTemp: true, /* targetImagePath: null, targetImageUrl: null, */ imageType: parsed.mimeType, sourceId: 0});
		    			});
		    		}
		    	} else {
		    		return callback(null, info);
		    	}
		    },
		    function(info, callback) {
		    	if (info == null && entryData.sourceType == "designId") {
		    		var designId = entryData.sourceData;
		    		if (!designId ) {
		    			logger.error("Missing Design ID");
		    			return callback(new Error("Missing Design ID"));
		    		}

		    		dataUtils.getImageDataForDesign(designId, function(err, imageData){
						if (err) {
							return callback(err);
						}

						var sourceImagePath = global.appRoot + config.path.designImagesRaw + imageData.categoryId + "/" + designId + "." + mime.extension(imageData.imageType);

						return callback(null, {sourceImagePath: sourceImagePath, sourceFileIsTemp: false, imageType: "image/jpeg", sourceId: imageData.id});
					});
		    	} else {
		    		return callback(null, info);
		    	}
		    }
		], function (err, info) {
			if (err) {
				logger.error("Some error encountered: " + err);
				return next(err, null);
			} else if (info == null) {
				logger.error("Info is null, meaning none of the inputs were valid.");
				return next(new Error("Info is null, meaning none of the inputs were valid."), null);
			}

			return next(0, info);
		});
	}
};

function cloneObject(input) {
	return JSON.parse(JSON.stringify(input));
}
