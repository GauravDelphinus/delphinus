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
			let presetArtifactId = result.data[i][0].preset_artifact_id;
			let categoryName = result.data[i][1].name;
			let categoryId = result.data[i][1].id;


			if (!output.hasOwnProperty(categoryId)) {
				output[categoryId] = {name: categoryName, designList: []};
			}
			output[categoryId].designList.push({
				name: designName, 
				id: designId, 
				image: config.url.designImages + categoryId + "/" + designId + ".jpeg", 
				presetArtifactId: presetArtifactId
			});
		}

		logger.debug("returning output: " + JSON.stringify(output));
		return done(null, output);
	});
}

module.exports = {
	getDesigns: getDesigns
};