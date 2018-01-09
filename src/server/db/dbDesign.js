const error = require("../error");
const dataUtils = require("../dataUtils");
const config = require("../config");
const logger = require("../logger");

function getDesigns(designCategory, done) {
	var cypherQuery = "MATCH (d:Design)";

	if (designCategory) {
		cypherQuery += "-[:BELONGS_TO]->(c:DesignCategory {id: '" + designCategory + "'}) ";
	} else {
		cypherQuery += "-[:BELONGS_TO]->(c:DesignCategory) ";
	}

	cypherQuery += " RETURN d, c;";

	logger.dbDebug(cypherQuery);
	dataUtils.getDB().cypherQuery(cypherQuery, function(err, result){
		if(err) {
			return done(err);
		} else if (result.data.length <= 0) {
			return done(new error.dbResultError(cypherQuery, "> 0", result.data.length));
		}

		var output = {};
		for (var i = 0; i < result.data.length; i++) {
			let designName = result.data[i][0].name;
			let designId = result.data[i][0].id;
			let categoryName = result.data[i][1].name;
			let categoryId = result.data[i][1].id;

			//fetch preset values for caption
			let presetArtifactId = result.data[i][0].caption_preset_id;
			let captionTextSize = result.data[i][0].caption_default_text_size;
			let captionTextColor = result.data[i][0].caption_default_text_color;
			let captionBackgroundColor = result.data[i][0].caption_default_background_color;


			if (!output.hasOwnProperty(categoryId)) {
				output[categoryId] = {name: categoryName, designList: []};
			}
			output[categoryId].designList.push({
				name: designName, 
				id: designId, 
				image: config.url.designImages + categoryId + "/" + designId + ".jpeg", 
				presetArtifactId: presetArtifactId,
				captionTextSize: captionTextSize,
				captionTextColor: captionTextColor,
				captionBackgroundColor: captionBackgroundColor
			});
		}

		logger.debug("returning output: " + JSON.stringify(output));
		return done(null, output);
	});
}

module.exports = {
	getDesigns: getDesigns
};