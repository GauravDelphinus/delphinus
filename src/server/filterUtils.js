var async = require("async");
var logger = require("./logger");
var config = require("./config");
var mime = require("mime");
var fs = require("fs");
var serverUtils = require("./serverUtils");
var shortid = require("shortid");
var dbIndependentImage = require("./db/dbIndependentImage");
var dbUtils = require("./db/dbUtils");	

module.exports = {
	extractSingleStepList : function(steps, title) {
		var singleStepList = [];

		var step = {};

		// Extract ARTIFACTS -----------------------------------------------
		if (steps.artifacts) {
			step.artifacts = [];

			for (let i = 0; i < steps.artifacts.length; i++) {
				var artifact = {};
				step.artifacts.push(artifact);

				if (steps.artifacts[i].type == "preset") {
					step.artifacts[i].type = "preset";

					if (steps.artifacts[i].preset) {
						step.artifacts[i].preset = steps.artifacts[i].preset;
						//Adding caption to account for that in hash generation
						step.artifacts[i].banner = { caption: title};
						singleStepList.push(cloneObject(step));
					}
				} else if (steps.artifacts[i].type == "custom") {
					step.artifacts[i].type = "custom";

					if (steps.artifacts[i].banner) {
						step.artifacts[i].banner = steps.artifacts[i].banner;
						//Adding caption to account for that in hash generation
						step.artifacts[i].banner.caption = title;
						singleStepList.push(cloneObject(step));
					}
				}	
			}
		}

		// Extract LAYOUTS -----------------------------------------------
		if (steps.layouts) {
			step.layouts = [];
			for (let i = 0; i < steps.layouts.length; i++) {
				var layout = {};
				step.layouts.push(layout);

				if (steps.layouts[i].type == "preset") {
					step.layouts[i].type = "preset";

					if (steps.layouts[i].preset) {
						step.layouts[i].preset = steps.layouts[i].preset;
					}
				} else if (steps.layouts[i].type == "custom") {
					step.layouts[i].type = "custom";

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
				}

				singleStepList.push(cloneObject(step));
			}
		}

		// Extract FILTERS -----------------------------------------------
		if (steps.filters) {
			step.filters = [];

			for (let i = 0; i < steps.filters.length; i++) {
				var filter = {};
				step.filters.push(filter);

				if (steps.filters[i].type == "preset") {
					step.filters[i].type = "preset";

					if (steps.filters[i].preset) {
						step.filters[i].preset = steps.filters[i].preset;
						singleStepList.push(cloneObject(step));
					}
				}
			}
		}

		// Extract DECORATIONS -----------------------------------------------
		if (steps.decorations) {
			step.decorations = [];

			for (let i = 0; i < steps.decorations.length; i++) {
				var decoration = {};
				step.decorations.push(decoration);

				if (steps.decorations[i].type == "preset") {
					step.decorations[i].type = "preset";

					if (steps.decorations[i].preset) {
						step.decorations[i].preset = steps.decorations[i].preset;
						singleStepList.push(cloneObject(step));
					}
				} else if (steps.decorations[i].type == "custom") {
					step.decorations[i].type = "custom";

					if (steps.decorations[i].border) {
						step.decorations[i].border = steps.decorations[i].border;
						singleStepList.push(cloneObject(step));
					}
				}
			}
		}

		return singleStepList;
	},

	validateSteps: function(steps) {
		if (!steps) {
			return false;
		}

		//validate artifacts ******************************************************
		if (steps.artifacts) {
			if (steps.artifacts.constructor !== Array) {
				return false;
			}

			for (var i = 0; i < steps.artifacts.length; i++) {
				var artifact = steps.artifacts[i];
				if (!serverUtils.validateQueryParams(artifact, this.params.artifact)) {
					return false;
				}

				if (artifact.type == "preset") {
					if (!serverUtils.validateQueryParams(artifact, this.params.presetArtifact)) {
						return false;
					}
				} else if (artifact.type == "custom") {
					if (!serverUtils.validateQueryParams(artifact.banner, this.params.customArtifactBanner)) {
						return false;
					}
				}
			}
		}

		//validate layouts ******************************************************
		if (steps.layouts) {
			if (steps.layouts.constructor !== Array) {
				return false;
			}

			for (var i = 0; i < steps.layouts.length; i++) {
				var layout = steps.layouts[i];
				if (!serverUtils.validateQueryParams(layout, this.params.layout)) {
					return false;
				}

				if (layout.type == "preset") {
					if (!serverUtils.validateQueryParams(layout, this.params.presetLayout)) {
						return false;
					}
				} else if (layout.type == "custom") {
					//crop is mandatory because "custom" is determined by the mere presence of crop (see newentry.js)
					if (!serverUtils.validateQueryParams(layout.crop, this.params.customLayoutCrop)) {
						return false;
					}

					//mirror is optional
					if (!serverUtils.validateQueryParams(layout, this.params.customLayoutMirror)) {
						return false;
					}

					//rotation is optional
					if (layout.rotation && !serverUtils.validateQueryParams(layout.rotation, this.params.customLayoutRotation)) {
						return false;
					}
				}
			}
		}

		//validate filters ******************************************************
		if (steps.filters) {
			if (steps.filters.constructor !== Array) {
				return false;
			}

			for (var i = 0; i < steps.filters.length; i++) {
				var filter = steps.filters[i];
				if (!serverUtils.validateQueryParams(filter, this.params.filter)) {
					return false;
				}

				if (layout.type == "preset") {
					if (!serverUtils.validateQueryParams(filter, this.params.presetFilter)) {
						return false;
					}
				}
			}
		}

		//validate decorations ******************************************************
		if (steps.decorations) {
			if (steps.decorations.constructor !== Array) {
				return false;
			}

			for (var i = 0; i < steps.decorations.length; i++) {
				var decoration = steps.decorations[i];
				if (!serverUtils.validateQueryParams(decoration, this.params.decoration)) {
					return false;
				}

				if (decoration.type == "preset") {
					if (!serverUtils.validateQueryParams(decoration, this.params.presetDecoration)) {
						return false;
					}
				} else if (decoration.type == "custom") {
					if (!serverUtils.validateQueryParams(decoration.border, this.params.customDecorationBorder)) {
						return false;
					}
				}
			}
		}

		return true;
	},

	//VALIDATION PARAMETERS
	params: {
		//Artifacts ============================================
		/*
			//for presets
			artifact: {
				type: "preset",
				preset: "bannerBottom", etc. (one of the values in presets.json)
			}

			//for custom
			artifact: {
				type: "custom",
				banner: {
					backgroundColor: #ff00aa, (hex color code)
					textColor: #ff00aa, (hex color code)
					fontName: "arial" (fixed for now)
					location: "bottom", "top", "center", "below", "below", "above"
				}
			}
		*/
		artifact: [
			{
				name: "type",
				type: ["preset", "custom"],
				required: "yes"
			}
		],
		presetArtifact: [
			{
				name: "preset",
				type: "presetArtifact",
				required: "yes"
			}
		],
		customArtifactBanner: [
			{
				name: "location",
				type: ["top", "bottom", "center", "above", "below"],
				required: "yes"
			},
			{
				name: "backgroundColor",
				type: "color",
				required: "yes"
			},
			{
				name: "textColor",
				type: "color",
				required: "yes"
			},
			{
				name: "fontName",
				type: ["arial"],
				required: "yes"
			}
		],

		//Layouts ============================================
		/*
			layout: {
				type: "preset",
				preset: "originalLayout", etc. (one of the values in presets.json)
			}

			layout: {
				type: "custom",
				mirror: "flip" | "flop",
				rotation: {
					degrees: <number>
					color: <color>
				},
				crop: {
					x: <x value of top left coordinate>,
					y: <y value of top left coordinate>,
					width: width in pixels
					height: height in pixels
				}
			}
		*/
		layout: [
			{
				name: "type",
				type: ["preset", "custom"],
				required: "yes"
			}
		],
		presetLayout: [
			{
				name: "preset",
				type: "presetLayout",
				required: "yes"
			}
		],
		customLayoutCrop: [
			{
				name: "x",
				type: "number",
				required: "yes"
			},
			{
				name: "y",
				type: "number",
				required: "yes"
			},
			{
				name: "width",
				type: "number",
				required: "yes"
			},
			{
				name: "height",
				type: "number",
				required: "yes"
			}
		],
		customLayoutRotation: [
			{
				name: "degrees",
				type: "number",
				required: "yes"
			},
			{
				name: "color",
				type: "color",
				required: "yes"
			}
		],
		customLayoutMirror: [
			{
				name: "mirror",
				type: ["flip", "flop"],
				required: "no"
			}
		],

		//Filters ============================================
		/*
			filter: {
				type: "preset",
				preset: "noFilter", etc. (one of the values in presets.json)
			}
		*/
		filter: [
			{
				name: "type",
				type: ["preset"], //currently only preset is supported for filters
				required: "yes"
			}
		],
		presetFilter: [
			{
				name: "preset",
				type: "presetFilter",
				required: "yes"
			}
		],

		//Decorations (borders) ============================================
		/*
			decoration: {
				type: "preset",
				preset: "noBorder", etc. (one of the values in presets.json)
			}

			decoration: {
				type: "custom",
				border: {
					width: <width in pixels>
					color: color of border
				}
			}
		*/
		decoration: [
			{
				name: "type",
				type: ["preset", "custom"],
				required: "yes"
			}
		],
		presetDecoration: [
			{
				name: "preset",
				type: "presetDecoration",
				required: "yes"
			}
		],
		customDecorationBorder: [
			{
				name: "width",
				type: "number",
				required: "yes"
			},
			{
				name: "color",
				type: "color",
				required: "yes"
			}
		],
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

	/**
		Normalize / expand the steps array such that all indirect references
		(such as filter node ids, etc.) are resolved to actual settings that can 
		be processed by the Image Processor.
	**/
	normalizeSteps: function (steps, next) {
		next(0, steps);
	}
	
};

function cloneObject(input) {
	return JSON.parse(JSON.stringify(input));
}
