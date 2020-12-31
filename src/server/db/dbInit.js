const async = require("async");
const dbUtils = require("./dbUtils");
const dbChallenge = require("./dbChallenge");
const dbDesign = require("./dbDesign");
const dbUser = require("./dbUser");
const dbEntry = require("./dbEntry");

module.exports = {
	initializeDB :function(dbdriver, callback) {
		this.myDBdriver = dbdriver;
		const dbUtils = require("./dbUtils");
		const dbChallenge = require("./dbChallenge");
		const dbDesign = require("./dbDesign");

		var functions = [];
		//enumerate preset filters and create the nodes if not present
		
		var presets = require("../presets");
		for (let key in presets.presetLayout) {
			let id = key;
			let presetLayoutName = presets.presetLayout[key];

			let cypherQuery = "MERGE (l:Layout {id: '" + id + "'}) ON CREATE SET l.name = '" + presetLayoutName + "', l.layout_type = 'preset' RETURN l;";

			functions.push(async.apply(dbUtils.runQuery, cypherQuery));
		}

		for (let key in presets.presetFilter) {
			let id = key;
			let presetFilterName = presets.presetFilter[key];

			let cypherQuery = "MERGE (f:Filter {id: '" + id + "'}) ON CREATE SET f.name = '" + presetFilterName + "', f.filter_type = 'preset' RETURN f;";

			functions.push(async.apply(dbUtils.runQuery, cypherQuery));
		}
		for (let key in presets.presetArtifact) {
			let id = key;
			let presetArtifactName = presets.presetArtifact[key];

			let cypherQuery = "MERGE (a:Artifact {id: '" + id + "'}) ON CREATE SET a.name = '" + presetArtifactName + "', a.artifact_type = 'preset' RETURN a;";

			functions.push(async.apply(dbUtils.runQuery, cypherQuery));
		}
		for (let key in presets.presetDecoration) {
			let id = key;
			let presetDecorationName = presets.presetDecoration[key];

			let cypherQuery = "MERGE (d:Decoration {id: '" + id + "'}) ON CREATE SET d.name = '" + presetDecorationName + "', d.decoration_type = 'preset' RETURN d;";
			
			functions.push(async.apply(dbUtils.runQuery, cypherQuery));
		}
		
		
		
		//enumerate and create nodes for the categories and subcategories
		var categories = require("../categories");
		for (let key in categories) {
			let nodeInfo = {
				id: key,
				name: categories[key].displayName
			}

			functions.push(async.apply(dbChallenge.createCategoryNode, nodeInfo));
		}


		let designCategories = require("../designs");
		for (let key in designCategories) {
			let categoryId = key;
			let designList = designCategories[key];
			let categoryName = designList[0]; //first array element is the display name of the category

			functions.push(async.apply(dbDesign.createNodeForDesignCategory, categoryId, categoryName));
			
			
			let designObj = designList[1]; //second array element is the object containing the designs in that category
			for (let key in designObj) {
				let designId = key;

				//value is an array with two elements.  First element is the design name, and second is an object of the form {"defaultPresetArtifactId" : "presetArtifactName", etc.}.  Refer designs.json
				var designInfo = {
					id: key,
					name: designObj[key][0],
					categoryId: categoryId,
					presetArtifactId: designObj[key][1].defaultPresetArtifactId,
					captionTextSize: designObj[key][1].captionTextSize,
					captionTextColor: designObj[key][1].captionTextColor,
					captionBackgroundColor: designObj[key][1].captionBackgroundColor
				}
				functions.push(async.apply(dbDesign.createNodeForDesign, designInfo));
			}
		}
		

		//functions.push(async.apply(dbUtils.runQuery, "hello"));
		async.series(functions, function(err) {
			return callback(err);
		});
	},

	getDBdriver : function() {
		return this.myDBdriver;
	},

	initializeDBWithData: function(data, callback) {
		var functions = [];

		//Create users
		for (var i = 0; i < data.users.length; i++) {
			var user = data.users[i];

			functions.push(async.apply(dbUser.createUserNode, user));
		}

		//Create challenges
		for (let i = 0; i < data.challenges.length; i++) {
			var challenge = data.challenges[i];

			functions.push(async.apply(dbChallenge.createChallengeNode, challenge));
		}

		//Create entries
		for (let i = 0; i < data.entries.length; i++) {
			var entry = data.entries[i];

			functions.push(async.apply(dbEntry.createEntryNode, entry));
		}

		async.series(functions, function(err) {
			callback(err);
		});
	},

	deleteDataFromDB: function(data, callback) {
		var functions = [];

		//Create users
		for (var i = 0; i < data.users.length; i++) {
			var user = data.users[i];

			functions.push(async.apply(dbUser.deleteUser, user.id));
		}

		//Create challenges
		for (let i = 0; i < data.challenges.length; i++) {
			var challenge = data.challenges[i];

			functions.push(async.apply(dbChallenge.deleteChallenge, challenge.id));
		}

		//Create entries
		for (let i = 0; i < data.entries.length; i++) {
			var entry = data.entries[i];

			functions.push(async.apply(dbEntry.deleteEntry, entry.id));
		}

		async.series(functions, function(err) {
			callback(err);
		});
	}
};
