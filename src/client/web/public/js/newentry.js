$(document).ready(function(){
	setupMainItem();

	setupSteps();

	$("#apply").click(postEntry);

	createLoginHeader();
	
});

function setupMainItem() {
	$.getJSON('/api/challenges/' + challengeId, function(result) {
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

function changeCallback(event) {
	applyChanges(null);
}

function setupLayoutStep() {
	//show hide logic
	$("#layoutTypeSelection").on("change", function() {
		showHideSection(this.value, 
			[{value: "none", id: "#noneLayoutSection"}, 
			{value: "preset", id: "#presetLayoutSection"}, 
			{value: "user_defined", id: "#userDefinedLayoutSection"}, 
			{value: "custom", id: "#customLayoutSection"}]);

		if ($("#presetLayoutSection").is(":visible")) {
			$.getJSON('/api/filters?type=layout' + "&layoutType=preset", function(result) {
				if (result.length > 0) {
					var list = [];
					for (var i = 0; i < result.length; i++) {
						var l = result[i][0];
						//var u = result[i][1];

						var data = {};
						data.id = l.id;
						data.caption = l.name;
						data.image = "/images/static/progress.gif";
			
						data.socialStatus = {};
						data.socialStatus.numLikes = 121;
						data.socialStatus.numShares = 23;
						data.socialStatus.numComments = 45;

						data.link = "/layout/" + l.id;

						var jsonObj = {};
						constructJSONObject(jsonObj);
						jsonObj.steps.layouts[0].type = "preset";
						jsonObj.steps.layouts[0].preset = l.id;
						generateChanges(l.id, jsonObj, function(id, imgPath) {
							$("#" + id + " img").prop("src", imgPath);
						});

						list.push(data);
					}

					$("#presetLayouts").remove();
					var grid = createGrid("presetLayouts", list, 3, true, true, function(id) {
						$("#presetLayoutSection").data("selectedLayoutID", id);
						applyChanges();
						$(window).scrollTop(0);
					});
					$("#presetLayoutSection").append(grid);
				}
			});
		}

		applyChanges();
	});

	/*** CROP Handling ****/
	$("#saveCrop").click(function() {
		var cropData = $("#newentryimage").cropper("getData");

		jQuery.data(document.body, "cropData", cropData);

		$("#cropSectionSettings").text("Left: " + Math.round(cropData.x) + " Top: " + Math.round(cropData.y) + " Width: " + Math.round(cropData.width) + " Height: " + Math.round(cropData.height));

		endCrop();

		applyChanges();
	});

	$("#cancelCrop").click(function() {
		endCrop();
	});

	$("#resetCropButton").click(function() {
		//reset cached data
		jQuery.data(document.body, "cropData", null);

		$("#cropSectionSettings").text("Not Set");

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

	enableDisableOnCheck("#checkboxCrop", ["#resetCropButton", "#editCropButton"]);
	$("#checkboxCrop").on("change", function() {
		if ($(this).prop("checked")) {
			var cropData = jQuery.data(document.body, "cropData");
			startCrop(cropData);
		} else {
			applyChanges();
		}
	});

	//*********** FLIP Handling
	enableDisableOnCheck("#checkboxFlip", ["#flipHorizontalButton", "#flipVerticalButton"]);
	setChangeCallback(changeCallback, [
				"#checkboxFlip",
				"#flipHorizontalButton", "#flipVerticalButton"]);


	$("#flipVerticalButton, #flipHorizontalButton").click(function() {
		if ($(this).hasClass("active")) {
			//flip is on, turn it off
			$(this).removeClass("active");
		} else {
			$(this).addClass("active");
		}

		var flipSettings = "Flip Vertical: ";
		if ($("#flipVerticalButton").hasClass("active")) {
			flipSettings += "ON";
		} else {
			flipSettings += "OFF";
		}

		flipSettings += ", Flip Horizontal: ";
		if ($("#flipHorizontalButton").hasClass("active")) {
			flipSettings += "ON";
		} else {
			flipSettings += "OFF";
		}
		$("#flipSectionSettings").text(flipSettings);

		applyChanges();
	});

	// Rotate
	enableDisableOnCheck("#checkboxRotate", ["#resetRotationButton", "#anticlockwise10RotationButton", "#anticlockwise90RotationButton", "#clockwise90RotationButton", "#clockwise10RotationButton", "#rotateColorButton"]);
	setChangeCallback(changeCallback, ["#checkboxRotate", "#anticlockwise10RotationButton", "#anticlockwise90RotationButton", "#clockwise90RotationButton", "#clockwise10RotationButton", "#rotateColorButton"]);

	
	$("#anticlockwise10RotationButton, #anticlockwise90RotationButton, #clockwise90RotationButton, #clockwise10RotationButton").click(function() {
		var rotationData = jQuery.data(document.body, "rotationData");
		if (!rotationData) {
			rotationData = {degrees: 0};
		}

		if (this.id == "anticlockwise10RotationButton") {
			rotationData.degrees -= 10;
		} else if (this.id == "anticlockwise90RotationButton") {
			rotationData.degrees -= 90;
		} else if (this.id == "clockwise90RotationButton") {
			rotationData.degrees += 90;
		} else if (this.id == "clockwise10RotationButton") {
			rotationData.degrees += 10;
		}
		
		$("#rotationSectionSettings").html("Rotation: " + rotationData.degrees + "&#176;");
		jQuery.data(document.body, "rotationData", rotationData);

		applyChanges();
	});

	$("#resetRotationButton").click(function() {
		jQuery.data(document.body, "rotationData", null);

		$("#rotationSectionSettings").html("Not Set");

		applyChanges();
	});

	// Shear
	enableDisableOnCheck("#checkboxShear", ["#resetShearButton", "#negative10ShearXButton", "#positive10ShearXButton", "#negative10ShearYButton", "#positive10ShearYButton"]);
	setChangeCallback(changeCallback, ["#checkboxShear", "#resetShearButton", "#negative10ShearXButton", "#positive10ShearXButton", "#negative10ShearYButton", "#positive10ShearYButton"]);

	$("#negative10ShearXButton, #positive10ShearXButton, #negative10ShearYButton, #positive10ShearYButton").click(function() {
		var shearData = jQuery.data(document.body, "shearData");
		if (!shearData) {
			shearData = {xDegrees: 0, yDegrees: 0};
		}

		if (this.id == "negative10ShearXButton") {
			shearData.xDegrees -= 10;
		} else if (this.id == "positive10ShearXButton") {
			shearData.xDegrees += 10;
		} else if (this.id == "negative10ShearYButton") {
			shearData.yDegrees -= 10;
		} else if (this.id == "positive10ShearYButton") {
			shearData.yDegrees += 10;
		}
		
		$("#shearSectionSettings").html("Shear X: " + shearData.xDegrees + "&#176;, Y: " + shearData.yDegrees + "&#176;");
		jQuery.data(document.body, "shearData", shearData);

		applyChanges();
	});

	$("#resetShearButton").click(function() {
		jQuery.data(document.body, "shearData", null);

		$("#shearSectionSettings").html("Not Set");

		applyChanges();
	});
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

	//show hide logic
	$("#filterTypeSelection").on("change", function() {
		showHideSection(this.value, 
			[{value: "none", id: "#noneFilterSection"}, 
			{value: "preset", id: "#presetFilterSection"}, 
			{value: "user_defined", id: "#userDefinedFilterSection"}, 
			{value: "custom", id: "#customFilterSection"}]);

		if ($("#presetFilterSection").is(":visible")) {
			$.getJSON('/api/filters?type=filter' + "&filterType=preset", function(result) {
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
						generateChanges(f.id, jsonObj, function(id, imgPath) {
							$("#" + id + " img").prop("src", imgPath);
						});

						list.push(data);
					}

					$("#presetFilters").remove();
					var grid = createGrid("presetFilters", list, 3, true, true, function(id) {
						$("#presetFilterSection").data("selectedFilterID", id);
						applyChanges();
						$(window).scrollTop(0);
					});
					$("#presetFilterSection").append(grid);
				}
			});
		}

		applyChanges();
	});

	/*
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
	*/

	// FILTERS SECTION ----------------------

	//charcoal
	$("#charcoalSection").append(createRangeSection("charcoalValueText", "charcoalRangeInput", 0, 20, 0, 1));
	enableDisableOnCheck("#checkboxCharcoal", ["#charcoalRangeInput"]);

	//paint
	$("#paintSection").append(createRangeSection("paintValueText", "paintRangeInput", 0, 100, 0, 5));
	enableDisableOnCheck("#checkboxPaint", ["#paintRangeInput"]);

	//solarize
	$("#solarizeSection").append(createRangeSection("solarizeValueText", "solarizeRangeInput", 0, 100, 100, 5));
	enableDisableOnCheck("#checkboxSolarize", ["#solarizeRangeInput"]);

	//spread
	$("#spreadSection").append(createRangeSection("spreadValueText", "spreadRangeInput", 0, 100, 0, 5));
	enableDisableOnCheck("#checkboxSpread", ["#spreadRangeInput"]);

	//swirl
	$("#swirlSection").append(createRangeSection("swirlValueText", "swirlRangeInput", 0, 100, 0, 5));
	enableDisableOnCheck("#checkboxSwirl", ["#swirlRangeInput"]);

	//Wave
	$("#waveSection").append(createRangeSection("waveAmplitudeValueText", "waveAmplitudeRangeInput", 0, 100, 0, 5));
	$("#waveSection").append(createRangeSection("waveLengthValueText", "waveLengthRangeInput", 0, 100, 100, 5));
	enableDisableOnCheck("#checkboxWave", ["#waveAmplitudeRangeInput", "#waveLengthRangeInput"]);

	//contrast
	$("#contrastSection").append(createRangeSection("contrastValueText", "contrastRangeInput", -100, 100, 0, 5));
	//enableDisableOnCheck("#checkboxContrast", ["#contrastRangeInput"]);

	//brightness
	$("#brightnessSection").append(createRangeSection("brightnessValueText", "brightnessRangeInput", -100, 100, 0, 5));
	//enableDisableOnCheck("#checkboxBrightness", ["#brightnessRangeInput"]);

	//hue
	$("#hueSection").append(createRangeSection("hueValueText", "hueRangeInput", -100, 100, 0, 5));
	//enableDisableOnCheck("#checkboxHue", ["#hueRangeInput"]);

	//saturation
	$("#saturationSection").append(createRangeSection("saturationValueText", "saturationRangeInput", -100, 100, 0, 5));
	//enableDisableOnCheck("#checkboxSaturation", ["#saturationRangeInput"]);

	//set change callback for all range inputs
	$("input[type=range]").change(function() {
		if (this.id == "charcoalRangeInput") {
			$("#charcoalValueText").text("Factor: " + $("#" + this.id).val());
		} else if (this.id == "paintRangeInput") {
			$("#paintValueText").text("Radius: " + $("#" + this.id).val());
		} else if (this.id == "solarizeRangeInput") {
			$("#solarizeValueText").text("Threshold: " + $("#" + this.id).val());
		} else if (this.id == "spreadRangeInput") {
			$("#spreadValueText").text("Amount: " + $("#" + this.id).val());
		} else if (this.id == "SwirlRangeInput") {
			$("#swirlValueText").text("Degrees: " + $("#" + this.id).val());
		} else if (this.id == "waveAmplitudeRangeInput") {
			$("#waveAmplitudeValueText").text("Amplitude: " + $("#" + this.id).val());
		} else if (this.id == "waveLengthRangeInput") {
			$("#waveLengthValueText").text("Wavelength: " + $("#" + this.id).val());
		} else if (this.id == "contrastRangeInput") {
			$("#contrastValueText").text("Value: " + $("#" + this.id).val());
		} else if (this.id == "brightnessRangeInput") {
			$("#brightnessValueText").text("Value: " + $("#" + this.id).val());
		} else if (this.id == "hueRangeInput") {
			$("#hueValueText").text("Value: " + $("#" + this.id).val());
		} else if (this.id == "saturationRangeInput") {
			$("#saturationValueText").text("Value: " + $("#" + this.id).val());
		} 
	});
	




	/*
	$("input[type=radio][name=filter]").change(function () {
		showHideSection(this.value, 
			[{value: "none", id: "#noneFilterSection"}, 
			{value: "preset", id: "#presetFilterSection"}, 
			{value: "user_defined", id: "#userDefinedFilterSection"}, 
			{value: "custom", id: "#customFilterSection"}]);
		applyChanges();
	});
	*/

	setChangeCallback(changeCallback, [
		"input[type=checkbox][name=effects]", 
		"input[type=radio][name=preset]",
		"input[type=range]",
		"#contrast",
		"#brightness",
		"#hue",
		"#saturation"
		]);
}

function createRangeSection(valueTextID, rangeInputID, min, max, value, step) {
	var paintRangeSection = $("<div>", {class: "rangeSection"});
	paintRangeSection.append($("<span>", {id: valueTextID, class: "sectionSettings"}).text("Not Set"));
	var rangeInput = $("<div>", {class: "rangeInput"});
	rangeInput.append($("<span>").append(min));
	var input = $("<input>", {id: rangeInputID, type: "range", min: min, max: max, value: value, step: step});
	rangeInput.append(input);
	rangeInput.append($("<span>").append(max));
	paintRangeSection.append(rangeInput);

	return paintRangeSection;
}

function setupArtifactStep() {
		//show hide logic
	$("#artifactTypeSelection").on("change", function() {
		showHideSection(this.value, 
			[{value: "none", id: "#noneArtifactSection"}, 
			{value: "preset", id: "#presetArtifactSection"}, 
			{value: "userDefined", id: "#userDefinedArtifactSection"}, 
			{value: "custom", id: "#customArtifactSection"}]);

		if ($("#presetArtifactSection").is(":visible")) {
			$.getJSON('/api/filters?type=artifact' + "&artifactType=preset", function(result) {
				if (result.length > 0) {
					var list = [];
					for (var i = 0; i < result.length; i++) {
						var a = result[i][0];
						//var u = result[i][1];

						var data = {};
						data.id = a.id;
						data.caption = a.name;
						data.image = "/images/static/progress.gif";
			
						data.socialStatus = {};
						data.socialStatus.numLikes = 121;
						data.socialStatus.numShares = 23;
						data.socialStatus.numComments = 45;

						data.link = "/artifact/" + a.id;

						var jsonObj = {};
						constructJSONObject(jsonObj);
						jsonObj.steps.artifacts[0].type = "preset";
						jsonObj.steps.artifacts[0].preset = a.id;
						jsonObj.steps.artifacts[0].banner = {text: $("#bannerText").prop("value")};
						generateChanges(a.id, jsonObj, function(id, imgPath) {
							$("#" + id + " img").prop("src", imgPath);
						});

						list.push(data);
					}

					$("#presetArtifacts").remove();
					var grid = createGrid("presetArtifacts", list, 3, true, true, function(id) {
						$("#presetArtifactSection").data("selectedArtifactID", id);
						applyChanges();
						$(window).scrollTop(0);
					});
					$("#presetArtifactSection").append(grid);
				}
			});
		}

		applyChanges();
	});

	$("#topBannerButton, #bottomBannerButton, #aboveBannerButton, #belowBannerButton").click(function() {

		$(this).toggleClass('active')
			.siblings().not(this).not("#transparentBannerButton").not("#bannerColorButton").removeClass('active');

		applyChanges();
	});

	$("#transparentBannerButton, #bannerColorButton").click(function() {
		if (this.id == "transparentBannerButton") {
			$("#" + this.id).addClass("active");
			$("#bannerColorButton").removeClass("active");
		} else if (this.id == "bannerColorButton") {
			$("#" + this.id).addClass("active");
			$("#transparentBannerButton").removeClass("active");
		}

		applyChanges();
	});

	setChangeCallback(changeCallback, [
		"#topBannerButton",
		"#bottomBannerButton",
		"#aboveBannerButton",
		"#belowBannerButton",
		"#transparentBannerButton",
		"#bannerColorButton", 
		"#bannerText",
		"#bannerTextFontSize",
		"#bannerTextFontName",
		"#bannerTextColorButton"
		]);
}

function setupDecorationStep() {
	// DECORATIONS SECTION ------------------------
	$("#decorationTypeSelection").on("change", function() {
		showHideSection(this.value, 
			[{value: "none", id: "#noneDecorationSection"}, 
			{value: "preset", id: "#presetDecorationSection"}, 
			{value: "userDefined", id: "#userDefinedDecorationSection"}, 
			{value: "custom", id: "#customDecorationSection"}]);

		if ($("#presetDecorationSection").is(":visible")) {
			$.getJSON('/api/filters?type=decoration' + "&decorationType=preset", function(result) {
				if (result.length > 0) {
					var list = [];
					for (var i = 0; i < result.length; i++) {
						var d = result[i][0];
						//var u = result[i][1];

						var data = {};
						data.id = d.id;
						data.caption = d.name;
						data.image = "/images/static/progress.gif";
			
						data.socialStatus = {};
						data.socialStatus.numLikes = 121;
						data.socialStatus.numShares = 23;
						data.socialStatus.numComments = 45;

						data.link = "/decoration/" + d.id;

						var jsonObj = {};
						constructJSONObject(jsonObj);
						jsonObj.steps.decorations[0].type = "preset";
						jsonObj.steps.decorations[0].preset = d.id;
						generateChanges(d.id, jsonObj, function(id, imgPath) {
							$("#" + id + " img").prop("src", imgPath);
						});

						list.push(data);
					}

					$("#presetDecorations").remove();
					var grid = createGrid("presetDecorations", list, 3, true, true, function(id) {
						$("#presetDecorationSection").data("selectedDecorationID", id);
						applyChanges();
						$(window).scrollTop(0);
					});
					$("#presetDecorationSection").append(grid);
				}
			});
		}

		applyChanges();
	});

	enableDisableOnCheck("#checkboxBorder", ["#borderWidth", "#borderColor"]);
	setChangeCallback(changeCallback, [
		"#checkboxBorder", 
		"#borderWidth",
		"#borderColor"
		]);
}

function showHideSection(valueToMatch, listOfValuesAndSectionIds) {
	for (var i = 0; i < listOfValuesAndSectionIds.length; i++) {
		if (valueToMatch == listOfValuesAndSectionIds[i].value) {
			$(listOfValuesAndSectionIds[i].id).show();
		} else {
			$(listOfValuesAndSectionIds[i].id).hide();
		}
	}
}

function enableDisableOnCheck(checkBoxId, itemIds) {
	for (var i = 0; i < itemIds.length; i++) {
		if ($(checkBoxId).prop("checked")) {
			$(itemIds[i]).prop("disabled", false);
		} else {
			$(itemIds[i]).prop("disabled", true);
		}
	}

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
		$(listOfIds[i]).change({callback: null}, callback);
	}
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

	if ($("#layoutTypeSelection").val() == "none") {
		layout.type = "none";
	} else if ($("#layoutTypeSelection").val() == "preset") {
		layout.type = "preset";
		layout.preset = $("#presetLayoutSection").data("selectedLayoutID");
	} else if ($("#layoutTypeSelection").val() == "userDefined") {
		layout.type = "user_defined";
	} else if ($("#layoutTypeSelection").val() == "custom") {
		layout.type = "custom";
		
		//crop
		if ($("#checkboxCrop").prop("checked")) {
			var cropData = jQuery.data(document.body, "cropData");

			if (cropData) {
				layout.crop = {x: cropData.x, y: cropData.y, width: cropData.width, height: cropData.height};
			}
		}

		//flip
		if ($("#checkboxFlip").prop("checked")) {
			if ($("#flipHorizontalButton").hasClass("active")) {
				layout.mirror = "flop";
			}

			if ($("#flipVerticalButton").hasClass("active")) {
				layout.mirror = "flip";
			}
		}

		if ($("#checkboxRotate").prop("checked")) {
			var rotationData = jQuery.data(document.body, "rotationData");

			if (rotationData) {
				layout.rotation = {};
				layout.rotation.degrees = rotationData.degrees;
				layout.rotation.color = $("#rotateColorButton").val();
			}
		}

		if ($("#checkboxShear").prop("checked")) {
			var shearData = jQuery.data(document.body, "shearData");

			if (shearData) {
				layout.shear = {};
				layout.shear.xDegrees = shearData.xDegrees;
				layout.shear.yDegrees = shearData.yDegrees;
			}
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
	} else if ($("#filterTypeSelection").val() == "userDefined") { // USER DEFINED FILTER
		filter.type = "user_defined";
		filter.user_defined = "some_unique_name";
	} else if ($("#filterTypeSelection").val() == "custom") { // CUSTOM FILTER
		filter.type = "custom";

		// ADD EFFECTS
		filter.effects = {};
		if ($("#checkboxCharcoal").prop("checked")) {
			filter.effects.charcoal = {factor: $("#charcoalRangeInput").val()};
		}

		if ($("#checkboxGrayscale").prop("checked")) {
			filter.effects.grayscale = "on";
		}

		if ($("#checkboxMonochrome").prop("checked")) {
			filter.effects.monochrome = "on";
		}

		if ($("#checkboxMosaic").prop("checked")) {
			filter.effects.mosaic = "on";
		}

		if ($("#checkboxNegative").prop("checked")) {
			filter.effects.negative = "on";
		}

		if ($("#checkboxPaint").prop("checked")) {
			filter.effects.paint = {radius: $("#paintRangeInput").val() };
		}

		if ($("#checkboxSolarize").prop("checked")) {
			filter.effects.solarize = {threshold: $("#solarizeRangeInput").val()};
		}

		if ($("#checkboxSpread").prop("checked")) {
			filter.effects.spread = {amount : $("#spreadRangeInput").val()};
		}

		if ($("#checkboxSwirl").prop("checked")) {
			filter.effects.swirl = {degrees: $("#swirlRangeInput").val()};
		}

		if ($("#checkboxWave").prop("checked")) {
			filter.effects.wave = {amplitude : $("#waveAmplitudeRangeInput").val(), wavelength: $("#waveLengthRangeInput").val()};
		}



		// ADD SETTINGS
		filter.settings = {};

		if ($("#contrastRangeInput").val != $("#contrastRangeInput").prop("defaultValue")) {
			filter.settings.contrast = {value: $("#contrastRangeInput").val()};
		}
		if ($("#brightnessRangeInput").val != $("#brightnessRangeInput").prop("defaultValue")) {
			filter.settings.brightness = {value: $("#brightnessRangeInput").val()};
		}
		if ($("#hueRangeInput").val != $("#hueRangeInput").prop("defaultValue")) {
			filter.settings.hue = {value: $("#hueRangeInput").val()};
		}
		if ($("#saturationRangeInput").val != $("#saturationRangeInput").prop("defaultValue")) {
			filter.settings.saturation = {value: $("#saturationRangeInput").val()};
		}
	}

	

	jsonObj.steps.filters.push(filter);

	// ARTIFACTS

	jsonObj.steps.artifacts = [];

	

	var artifact = {};

	artifact.banner = {};
	artifact.banner.text = $("#bannerText").prop("value");
	if ($("#artifactTypeSelection").val() == "none") {
		artifact.type = "none";
	} else if ($("#artifactTypeSelection").val() == "preset") {
		artifact.type = "preset";
		artifact.preset = $("#presetArtifactSection").data("selectedArtifactID");

		
	} else if ($("#artifactTypeSelection").val() == "userDefined") {
		artifact.type = "user_defined";
	} else if ($("#artifactTypeSelection").val() == "custom") {
		artifact.type = "custom";

			if ($("#topBannerButton").hasClass("active")) {
				artifact.banner.location = "top";
			} else if ($("#bottomBannerButton").hasClass("active")) {
				artifact.banner.location = "bottom";
			} else if ($("#aboveBannerButton").hasClass("active")) {
				artifact.banner.location = "above";
			} else if ($("#belowBannerButton").hasClass("active")) {
				artifact.banner.location = "below";
			}

			artifact.banner.fontSize = parseInt($("#bannerTextFontSize").prop("value"));
			artifact.banner.fontName = $("#bannerTextFontName").val();
			if ($("#bannerColorButton").hasClass("active")) {
				artifact.banner.backgroundColor = $("#bannerColorButton").val();
			} else if ($("#transparentBannerButton").hasClass("active")) {
				artifact.banner.backgroundColor = "transparent";
			}
			
			artifact.banner.textColor = $("#bannerTextColorButton").val();
	}



	jsonObj.steps.artifacts.push(artifact);


	// DECORATIONS

	jsonObj.steps.decorations = [];

	var decoration = {};

	if ($("#decorationTypeSelection").val() == "none") {
		decoration.type = "none";
	} else if ($("#decorationTypeSelection").val() == "preset") {
		decoration.type = "preset";
		decoration.preset = $("#presetDecorationSection").data("selectedDecorationID");
	} else if ($("#decorationTypeSelection").val() == "userDefined") {
		decoration.type = "user_defined";
	} else if ($("#decorationTypeSelection").val() == "custom") {
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
console.log(JSON.stringify(jsonObj));
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
			//console.log("done is " + JSON.stringify(done));
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

