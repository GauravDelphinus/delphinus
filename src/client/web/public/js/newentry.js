$(document).ready(function(){
	console.log("setting image source to " + challengeId);

	setupMainItem();

	setupSteps();

	$("#apply").click(postEntry);

	createLoginHeader();
	
});

function setupMainItem() {
	$.getJSON('/api/challenges/' + challengeId, function(result) {
		console.log("result is " + JSON.stringify(result));
		$("#newentryimage").prop("src", result.image);
	});
}

function setupNavigation() {
	moveToStep("layout");

	$("#prevButton").click(function() {
		var currentStep = getCurrentStep();
		if (currentStep == "filter") {
			moveToStep("layout");
		} else if (currentStep == "artifact") {
			moveToStep("filter");
		} else if (currentStep == "decoration") {
			moveToStep("artifact");
		} else if (currentStep == "post") {
			moveToStep("decoration");
		}
	});

	$("#nextButton").click(function() {
		var currentStep = getCurrentStep();
				console.log("next button clickedm currentStep is " + currentStep);

		if (currentStep == "layout") {
			moveToStep("filter");
		} else if (currentStep == "filter") {
			moveToStep("artifact");
		} else if (currentStep == "artifact") {
			moveToStep("decoration");
		} else if (currentStep == "decoration") {
			moveToStep("post");
		}
	});
}

function moveToStep(stepName) {
	console.log("moveToStep, stepName is " + stepName);
	if (stepName == "layout") {
		$("#layoutSection").show();
		$("#filterSection").hide();
		$("#artifactSection").hide();
		$("#decorationSection").hide();
		$("#postSection").hide();
		$("#nextButton").show();
		$("#prevButton").hide();
	} else if (stepName == "filter") {
		$("#layoutSection").hide();
		$("#filterSection").show();
		$("#artifactSection").hide();
		$("#decorationSection").hide();
		$("#postSection").hide();
		$("#nextButton").show();
		$("#prevButton").show();
	} else if (stepName == "artifact") {
		console.log("moving to artifact");
		$("#layoutSection").hide();
		$("#filterSection").hide();
		$("#artifactSection").show();
		$("#decorationSection").hide();
		$("#postSection").hide();
		$("#nextButton").show();
		$("#prevButton").show();
	} else if (stepName == "decoration") {
		$("#layoutSection").hide();
		$("#filterSection").hide();
		$("#artifactSection").hide();
		$("#decorationSection").show();
		$("#postSection").hide();
		$("#nextButton").show();
		$("#prevButton").show();
	} else if (stepName == "post") {
		$("#layoutSection").hide();
		$("#filterSection").hide();
		$("#artifactSection").hide();
		$("#decorationSection").hide();
		$("#postSection").show();
		$("#nextButton").hide();
		$("#prevButton").show();
	}
}


function setupSteps() {
	setupLayoutStep();

	setupFilterStep();

	setupArtifactStep();

	setupDecorationStep();

	setupNavigation();
}

function setupLayoutStep() {
	//show hide logic
	$("#layoutTypeSelection").on("change", function() {
		showHideSection(this.value, 
			[{value: "none", id: "#noneLayoutSection"}, 
			{value: "preset", id: "#presetLayoutSection"}, 
			{value: "user_defined", id: "#userDefinedLayoutSection"}, 
			{value: "custom", id: "#customLayoutSection"}]);
		applyChanges();
	});

	/*** CROP Handling ****/
	$("#saveCrop").click(function() {
		var cropData = $("#newentryimage").cropper("getData");
		console.log("cropData is " + JSON.stringify(cropData));

		jQuery.data(document.body, "cropData", cropData);

		endCrop();

		applyChanges();
	});

	$("#cancelCrop").click(function() {
		endCrop();
	});

	$("#resetCropButton").click(function() {
		//reset cached data
		jQuery.data(document.body, "cropData", null);

		applyChanges();
	});

	$("#editCropButton").click(function() {
		var cropData = jQuery.data(document.body, "cropData");

		//first switch off crop and bring image back to original size
		jQuery.data(document.body, "cropData", null);

		applyChanges(function() {
			startCrop(cropData);
		});
	});

	// Crop
	enableDisableOnCheck("#checkboxCrop", ["#resetCropButton", "#editCropButton"]);
	$("#checkboxCrop").on("change", function() {
		if ($(this).prop("checked")) {
			var cropData = jQuery.data(document.body, "cropData");
			startCrop(cropData);
		} else {
			applyChanges();
		}
	});

	// Flip
	enableDisableOnCheck("#checkboxFlip", ["input[type=radio][name=flip]"]);
	setChangeCallback(applyChanges, [
				"#checkboxFlip",
				"input[type=radio][name=flip]"]);

	// Rotate
	enableDisableOnCheck("#checkboxRotate", ["#rotateDegrees", "#rotateColor"]);
	setChangeCallback(applyChanges, ["#checkboxRotate", "#rotateDegrees", "#rotateColor"]);

	// Shear
	enableDisableOnCheck("#checkboxShear", ["#shearX", "#shearY"]);
	setChangeCallback(applyChanges, ["#checboxShear", "#shearX", "shearY"]);

}


/**
	Enter Crop Mode / UI.
	CropData is used to restore to previously stored crop box data, if available.
**/
function startCrop(cropData) {
	if ($("#checkboxCrop").prop("checked")) {

		var options = {};

		if (cropData) {
			options.data = cropData;
		}

		$("#newentryimage").cropper(options);

		$(".imageSection").addClass("imageSectionHover");

		//disable everything else until we're out of the crop mode
		$("#steps").hide();
	}
}

/**
	Exit Crop Mode / UI.
**/
function endCrop() {
	$("#newentryimage").cropper("destroy");
	$(".imageSection").removeClass("imageSectionHover");

	$("#steps").show();
}

function setupFilterStep() {
	$("#filterTypeSelection").on("change", function() {
		console.log("selectino triggered, selected option = " + this.value);

		if (this.value == "none") {
			$("#noneFilterSection").show();
			$("#presetFilterSection").hide();
			$("#userDefinedFilterSection").hide();
			$("#customFilterSection").hide();
		} else if (this.value == "preset") {
			$("#noneFilterSection").hide();
			$("#presetFilterSection").show();
			$("#userDefinedFilterSection").hide();
			$("#customFilterSection").hide();

			$.getJSON('/api/filters?type=filter' + "&filterType=preset", function(result) {
				console.log("result is " + JSON.stringify(result));	
				if (result.length > 0) {
					var list = [];
					for (var i = 0; i < result.length; i++) {
						var f = result[i][0];
						//var u = result[i][1];

						var data = {};
						data.id = f.id;
						data.caption = f.name;
						data.image = "/images/static/progress.gif";
			
						data.socialStatus = {};
						data.socialStatus.numLikes = 121;
						data.socialStatus.numShares = 23;
						data.socialStatus.numComments = 45;

						data.link = "/filter/" + f.id;

						var jsonObj = {};
						constructJSONObject(jsonObj);
						jsonObj.steps.filters[0].type = "preset";
						jsonObj.steps.filters[0].preset = f.id;
						console.log("jsonObj to be sent is " + JSON.stringify(jsonObj));
						generateChanges(f.id, jsonObj, function(id, imgPath) {
							$("#" + id + " img").prop("src", imgPath);
						});

						list.push(data);
					}

					$("#presetFilters").remove();
					var grid = createGrid("presetFilters", list, 3, true, true, function(id) {
						console.log("clicked on item with id = " + id);
						$("#presetFilterSection").data("selectedFilterID", id);
						applyChanges();
					});
					$("#presetFilterSection").append(grid);
					console.log("finished appending the grid to the page");
				}
			});
		} else if (this.value == "userDefined") {
			$("#noneFilterSection").hide();
			$("#presetFilterSection").hide();
			$("#userDefinedFilterSection").show();
			$("#customFilterSection").hide();
		} else if (this.value == "custom") {
			$("#noneFilterSection").hide();
			$("#presetFilterSection").hide();
			$("#userDefinedFilterSection").hide();
			$("#customFilterSection").show();
		}
	});

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
}

function setupArtifactStep() {
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
}

function setupDecorationStep() {
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
}

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

function constructJSONObject(jsonObj) {
	console.log("constructJSONObject called");
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

	if ($("#layoutTypeSelection").val() == "none") {
		layout.type = "none";
	} else if ($("#layoutTypeSelection").val() == "preset") {
		layout.type = "preset";
	} else if ($("#layoutTypeSelection").val() == "userDefined") {
		layout.type = "user_defined";
	} else if ($("#layoutTypeSelection").val() == "custom") {
		layout.type = "custom";
		
		if ($("#checkboxFlip").prop("checked")) {
			if ($("#radioFlipHorizontally").prop("checked")) {
				layout.mirror = "flop";
			} else if ($("#radioFlipVertically").prop("checked")) {
				layout.mirror = "flip";
				console.log("setting layout.mirror to flip");
			}
		}

		if ($("#checkboxCrop").prop("checked")) {
			var cropData = jQuery.data(document.body, "cropData");

			if (cropData) {
				layout.crop = {x: cropData.x, y: cropData.y, width: cropData.width, height: cropData.height};
			}
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

	if ($("#filterTypeSelection").val() == "none") { // NO FILTER
		filter.type = "none";
	} else if ($("#filterTypeSelection").val() == "preset") { // PRESET FILTER
		filter.type = "preset";

		filter.preset = $("#presetFilterSection").data("selectedFilterID");
		if (jQuery.hasData($("#presetFilterSection"))) {
			filter.preset = $("#presetFilterSection").data("selectedFilterID");
		}
	} else if ($("#filterTypeSelection").val() == "userDefined") { // USER DEFINED FILTER
		filter.type = "user_defined";
		filter.user_defined = "some_unique_name";
	} else if ($("#filterTypeSelection").val() == "custom") { // CUSTOM FILTER
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

function generateChanges(id, jsonObj, done) {
	$.ajax({
		type: "POST",
		url: "/api/filters/apply",
		dataType: "json",
		contentType: "application/json; charset=UTF-8",
		data: JSON.stringify(jsonObj),
		success: function(jsonData) {
			console.log("response from server, jsonData length is " + JSON.stringify(jsonData).length);
			done(id, "data:image/jpeg;base64," + jsonData.imageData);
		},
		error: function(jsonData) {
			alert("some error was found, " + jsonData.error);
		}
	});
}

function applyChanges(done) {
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
			console.log("new image received from server");

			//$("#newentryimage").attr("src", jsonData.image);
			$("#newentryimage").attr("src", "data:image/jpeg;base64," + jsonData.imageData);
			if (done) {
				done();
			}
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
			console.log("received JsonData is " + JSON.stringify(jsonData));

			//var jsonObj = JSON.parse(jsonData);

			window.open("/entry/" + jsonData.id, "_self");

			//$("#newentryimage").attr("src", "data:image/jpeg;base64," + jsonData.imageData);
		},
		error: function(jsonData) {
			//alert("error, data is " + jsonData);
			//var jsonData = $.parseJSON(data);
			alert("some error was found, " + jsonData.error);
		}
	});

}

function getCurrentStep() {
	if ($("#layoutSection").is(":visible")) {
		return "layout";
	} else if ($("#filterSection").is(":visible")) {
		return "filter";
	} else if ($("#artifactSection").is(":visible")) {
		return "artifact";
	} else if ($("#decorationSection").is(":visible")) {
		return "decoration";
	} else if ($("#postSection").is(":visible")) {
		return "post";
	}
}

function parseEntry(entry) {
	$("#entry").empty();
	$("#entry").append($("<img>").attr("src", entry.image));
	$("#entry").append($("<p>").text(entry.caption));
	$("#entry").append($("<p>").text(entry.created));
}

