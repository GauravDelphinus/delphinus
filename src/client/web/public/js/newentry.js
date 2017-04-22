$(document).ready(function(){
	console.log("setting image source to " + challengeId);

	// GLOBAL FOR ALL CHANGES
	$("#newentryimage").attr("src", "/challenges/images/" + challengeId);

	$("#apply").click(postEntry);
	$("#goToHomePage").click(function() {
		window.open("/", "_self");
	});
	$("#goToChallenge").click(function() {
		window.open("/challenge/" + challengeId, "_self");
	});

	$("#step1Next").click(showFilterStep);
	$("#step2Previous").click(showLayoutStep);
	$("#step2Next").click(showArtifactStep);
	$("#step3Previous").click(showFilterStep);
	$("#step3Next").click(showDecorationStep);
	$("#step4Previous").click(showArtifactStep);

	// LAYOUT SECTION --------------------------
	$("input[type=radio][name=layout]").change(function () {
		showHideSection(this.value, 
			[{value: "none", id: "#noneLayoutSection"}, 
			{value: "preset", id: "#presetLayoutSection"}, 
			{value: "user_defined", id: "#userDefinedLayoutSection"}, 
			{value: "custom", id: "#customLayoutSection"}]);
		applyChanges();
	});

	// Flip
	enableDisableOnCheck("#checkboxFlip", ["input[type=radio][name=flip]"]);
	setChangeCallback(applyChanges, [
				"#checkboxFlip",
				"input[type=radio][name=flip]"]);

	// Crop
	enableDisableOnCheck("#checkboxCrop", ["#cropX", "#cropY", "#cropWidth", "#cropHeight"]);
	setChangeCallback(applyChanges, ["#checkboxCrop", "#cropX", "#cropY", "#cropWidth", "#cropHeight"]);

	// Rotate
	enableDisableOnCheck("#checkboxRotate", ["#rotateDegrees", "#rotateColor"]);
	setChangeCallback(applyChanges, ["#checkboxRotate", "#rotateDegrees", "#rotateColor"]);

	// Shear
	enableDisableOnCheck("#checkboxShear", ["#shearX", "#shearY"]);
	setChangeCallback(applyChanges, ["#checboxShear", "#shearX", "shearY"]);

	// FILTERS SECTION ----------------------
	$("input[type=radio][name=filter]").change(function () {
		showHideSection(this.value, 
			[{value: "none", id: "#noneFilterSection"}, 
			{value: "preset", id: "#presetFilterSection"}, 
			{value: "user_defined", id: "#userDefinedFilterSection"}, 
			{value: "custom", id: "#customFilterSection"}]);
		applyChanges();
	});

	setChangeCallback(applyChanges, [
		"input[type=checkbox][name=effects]", 
		"input[type=radio][name=preset]",
		"input[type=range]",
		"#contrast",
		"#brightness",
		"#hue",
		"#saturation"
		]);

	// ARTIFACTS SECTION ------------------------
	$("input[type=radio][name=artifact]").change(function () {
		showHideSection(this.value, 
			[{value: "none", id: "#noneArtifactSection"}, 
			{value: "preset", id: "#presetArtifactSection"}, 
			{value: "user_defined", id: "#userDefinedArtifactSection"}, 
			{value: "custom", id: "#customArtifactSection"}]);
		applyChanges();
	});

	enableDisableOnCheck("#checkboxBanner", ["#bannerSection"]);
	setChangeCallback(applyChanges, [
		"#textBanner", 
		"input[type=radio][name=banner]",
		"#checkboxBanner",
		"#bannerTextFontSize",
		"#bannerTextFontName",
		"#bannerBackgroundColor",
		"#bannerTextColor"
		]);

	// DECORATIONS SECTION ------------------------
	$("input[type=radio][name=decoration]").change(function () {
		showHideSection(this.value, 
			[{value: "none", id: "#noneDecorationSection"}, 
			{value: "preset", id: "#presetDecorationSection"}, 
			{value: "user_defined", id: "#userDefinedDecorationSection"}, 
			{value: "custom", id: "#customDecorationSection"}]);
		applyChanges();
	});

	enableDisableOnCheck("#checkboxBorder", ["#borderSection"]);
	setChangeCallback(applyChanges, [
		"#checkboxBorder", 
		"#borderWidth",
		"#borderColor"
		]);

});

function showHideSection(valueToMatch, listOfValuesAndSectionIds) {
	for (var i = 0; i < listOfValuesAndSectionIds.length; i++) {
		console.log("i = " + i + ", valueToMatch = " + valueToMatch + ", value = " + listOfValuesAndSectionIds[i].value + ", id = " + listOfValuesAndSectionIds[i].id);
		if (valueToMatch == listOfValuesAndSectionIds[i].value) {
			$(listOfValuesAndSectionIds[i].id).show();
		} else {
			$(listOfValuesAndSectionIds[i].id).hide();
		}
	}
}

function enableDisableOnCheck(checkBoxId, itemIds) {
	$(checkBoxId).change(function () {
		for (var i = 0; i < itemIds.length; i++) {
			if ($(checkBoxId).prop("checked")) {
				$(itemIds[i]).prop("disabled", false);
			} else {
				$(itemIds[i]).prop("disabled", true);
			}
		}
	});
}

function setChangeCallback(callback, listOfIds) {
	for (var i = 0; i < listOfIds.length; i++) {
		$(listOfIds[i]).change(callback);
	}
}

function showFilterStep() {
	$("#layoutSection").hide();
	$("#filterSection").show();
	$("#artifactSection").hide();
	$("#decorationSection").hide();
	$("#apply").hide();
}

function showLayoutStep() {
	$("#layoutSection").show();
	$("#filterSection").hide();
	$("#artifactSection").hide();
	$("#decorationSection").hide();
	$("#apply").hide();
}

function showArtifactStep() {
	$("#layoutSection").hide();
	$("#filterSection").hide();
	$("#artifactSection").show();
	$("#decorationSection").hide();
	$("#apply").hide();
}

function showDecorationStep() {
	$("#layoutSection").hide();
	$("#filterSection").hide();
	$("#artifactSection").hide();
	$("#decorationSection").show();
	$("#apply").show();
}

function constructJSONObject(jsonObj) {
	jsonObj.imageSource = "challengeId"; // Can be "url" | "challenge" | "blob"
										// url is path to any web url
										// challengeId is the challengeId
										// blob is the base64 encoded version of the image data itself
	jsonObj.imageData = challengeId;
	jsonObj.challengeId = challengeId;
	jsonObj.created = (new Date()).getTime();

	jsonObj.steps = {}; // the main object that encapsulates filters, layouts, etc.

	/// LAYOUT
	jsonObj.steps.layouts = [];

	var layout = {};

	if ($("#radioLayoutNone").prop("checked")) {
		layout.type = "none";
	} else if ($("#radioLayoutPreset").prop("checked")) {
		layout.type = "preset";
	} else if ($("#radioLayoutUserDefined").prop("checked")) {
		layout.type = "user_defined";
	} else if ($("#radioLayoutCustom").prop("checked")) {
		layout.type = "custom";
		
		if ($("#checkboxFlip").prop("checked")) {
			if ($("#radioFlipHorizontally").prop("checked")) {
				layout.mirror = "flop";
			} else if ($("#radioFlipVertically").prop("checked")) {
				layout.mirror = "flip";
			}
		}

		if ($("#checkboxCrop").prop("checked")) {
			layout.crop = {};
			layout.crop.x = $("#cropX").val();
			layout.crop.y = $("#cropY").val();
			layout.crop.width = $("#cropWidth").val();
			layout.crop.height = $("#cropHeight").val();
		}

		if ($("#checkboxRotate").prop("checked")) {
			layout.rotation = {};
			layout.rotation.degrees = $("#rotateDegrees").val();
			layout.rotation.color = $("#rotateColor").val();
		}

		if ($("#checkboxShear").prop("checked")) {
			layout.shear = {};
			layout.shear.xDegrees = $("#shearX").val();
			layout.shear.yDegrees = $("#shearY").val();
		}
	}

	jsonObj.steps.layouts.push(layout);

	/// FILTERS
	jsonObj.steps.filters = [];

	var filter = {};

	if ($("#radioNone").prop("checked")) { // NO FILTER
		filter.type = "none";
	} else if ($("#radioPreset").prop("checked")) { // PRESET FILTER
		filter.type = "preset";

		filter.preset = $("input[name=preset]:checked").val();
	} else if ($("#radioUserDefined").prop("checked")) { // USER DEFINED FILTER
		filter.type = "user_defined";
		filter.user_defined = "some_unique_name";
	} else if ($("#radioCustom").prop("checked")) { // CUSTOM FILTER
		filter.type = "custom";

		// ADD EFFECTS
		filter.effects = {};

		if ($("#radioPaint").prop("checked")) {
			filter.effects.paint = {radius: $("#rangePaint").val() };
		}
		if ($("#radioGrayscale").prop("checked")) {
			filter.effects.grayscale = "on";
		}
		if ($("#radioMosaic").prop("checked")) {
			filter.effects.mosaic = "on";
		}
		if ($("#radioNegative").prop("checked")) {
			filter.effects.negative = "on";
		}
		if ($("#radioSolarize").prop("checked")) {
			filter.effects.solarize = {threshold: $("#rangeSolarize").val()};
		}
		if ($("#radioMonochrome").prop("checked")) {
			filter.effects.monochrome = "on";
		}
		if ($("#radioSwirl").prop("checked")) {
			filter.effects.swirl = {degrees: $("#rangeSwirl").val()};
		}
		if ($("#radioWave").prop("checked")) {
			filter.effects.wave = {amplitude : $("#rangeWaveAmp").val(), wavelength: $("#rangeWaveLength").val()};
		}
		if ($("#radioSpread").prop("checked")) {
			filter.effects.spread = {amount : $("#rangeSpread").val()};
		}
		if ($("#radioCharcoal").prop("checked")) {
			filter.effects.charcoal = {factor: $("#rangeCharcoal").val()};
		}

		// ADD SETTINGS
		filter.settings = {};

		if ($("#contrast").val != $("#contrast").prop("defaultValue")) {
			filter.settings.contrast = {value: $("#contrast").val()};
		}
		if ($("#brightness").val != $("#brightness").prop("defaultValue")) {
			filter.settings.brightness = {value: $("#brightness").val()};
		}
		if ($("#hue").val != $("#hue").prop("defaultValue")) {
			filter.settings.hue = {value: $("#hue").val()};
		}
		if ($("#saturation").val != $("#saturation").prop("defaultValue")) {
			filter.settings.saturation = {value: $("#saturation").val()};
		}
	}

	

	jsonObj.steps.filters.push(filter);

	// ARTIFACTS

	jsonObj.steps.artifacts = [];

	console.log("jsonObj is " + JSON.stringify(jsonObj));

	var artifact = {};

	if ($("#radioArtifactNone").prop("checked")) {
		artifact.type = "none";
	} else if ($("#radioArtifactPreset").prop("checked")) {
		artifact.type = "preset";
	} else if ($("#radioArtifactUserDefined").prop("checked")) {
		artifact.type = "user_defined";
	} else if ($("#radioArtifactCustom").prop("checked")) {
		artifact.type = "custom";

		if ($("#checkboxBanner").prop("checked")) {
			artifact.banner = {};
			artifact.banner.text = $("#textBanner").prop("value");

			if ($("#radioBannerLocationBottom").prop("checked")) {
				artifact.banner.location = "bottom";
			} else if ($("#radioBannerLocationTop").prop("checked")) {
				artifact.banner.location = "top";
			}

			artifact.banner.fontSize = parseInt($("#bannerTextFontSize").prop("value"));
			artifact.banner.fontName = $("#bannerTextFontName").val();
			artifact.banner.backgroundColor = $("#bannerBackgroundColor").prop("value");
			artifact.banner.textColor = $("#bannerTextColor").prop("value");
		}
	}



	jsonObj.steps.artifacts.push(artifact);


	// DECORATIONS

	jsonObj.steps.decorations = [];

	var decoration = {};

	if ($("#radioDecorationNone").prop("checked")) {
		decoration.type = "none";
	} else if ($("#radioDecorationPreset").prop("checked")) {
		decoration.type = "preset";
	} else if ($("#radioDecorationUserDefined").prop("checked")) {
		decoration.type = "user_defined";
	} else if ($("#radioDecorationCustom").prop("checked")) {
		decoration.type = "custom";

		if ($("#checkboxBorder").prop("checked")) {
			decoration.border = {};

			decoration.border.width = $("#borderWidth").val();
			decoration.border.color = $("#borderColor").val();
		}
	}

	jsonObj.steps.decorations.push(decoration);
}

function applyChanges() {
	//alert("applyChanges called");
	var jsonObj = {};
	

	constructJSONObject(jsonObj);


	$.ajax({
		type: "POST",
		url: "/api/filters/apply",
		dataType: "json",
		contentType: "application/json; charset=UTF-8",
		data: JSON.stringify(jsonObj),
		success: function(jsonData) {
			//alert("success, data is " + jsonData);
			//var jsonData = $.parseJSON(data);
			//alert("image received: " + jsonData.image);

			//$("#newentryimage").attr("src", jsonData.image);
			$("#newentryimage").attr("src", "data:image/jpeg;base64," + jsonData.imageData);
		},
		error: function(jsonData) {
			//alert("error, data is " + jsonData);
			//var jsonData = $.parseJSON(data);
			alert("some error was found, " + jsonData.error);
		}
	});
}

function postEntry() {
	var jsonObj = {};

	//alert("contrast default value is " + $("#contrast").prop("defaultValue") + ", actual selected value is " + $("#contrast").val());
	
	constructJSONObject(jsonObj);

	$.ajax({
		type: "POST",
		url: "/api/entries",
		dataType: "json",
		contentType: "application/json; charset=UTF-8",
		data: JSON.stringify(jsonObj),
		success: function(jsonData) {

			var jsonObj = JSON.parse(jsonData);

			window.open("/entry/" + jsonObj.entryId, "_self");

			//$("#newentryimage").attr("src", "data:image/jpeg;base64," + jsonData.imageData);
		},
		error: function(jsonData) {
			//alert("error, data is " + jsonData);
			//var jsonData = $.parseJSON(data);
			alert("some error was found, " + jsonData.error);
		}
	});

}

function parseEntry(entry) {
	$("#entry").empty();
	$("#entry").append($("<img>").attr("src", entry.image));
	$("#entry").append($("<p>").text(entry.caption));
	$("#entry").append($("<p>").text(entry.created));
}

