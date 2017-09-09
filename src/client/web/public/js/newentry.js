$(document).ready(function(){
	setupMainItem();

	setupSteps();

	setupNavigation();

	$("#apply").click(postEntry);

	createLoginHeader();
});

function setupMainItem() {
	$.getJSON('/api/challenges/' + challengeId, function(result) {
		$("#newentryimage").prop("src", result.image);
		$("#newentryimage").data("imageType", result.imageType);
	})
	.fail(function() {
		window.location.replace("/error");
	});

	$("#newentryimage").on("load", function() {
		$("#newentryimage").data("naturalWidth", this.naturalWidth);
		$("#newentryimage").data("naturalHeight", this.naturalHeight);
	});
}

/*
	Set up handlers for the Navigation / Step Wizard (buttons 1-6).
*/
function setupNavigation() {
	var navListItems = $('div.stepwizard-header div a'),
          allWells = $('.setup-content'),
          allNextBtn = $('.nextBtn');

	allWells.hide();

	navListItems.click(function (e) {
		e.preventDefault();
		var $target = $($(this).attr('href')),
			$item = $(this);

		if (!$item.hasClass('disabled')) {
	          navListItems.removeClass('btn-primary').addClass('btn-default');
	          $item.addClass('btn-primary');
	          allWells.hide();
	          $target.show();
	          showStep($target.prop("id"));
	          $target.find('input:eq(0)').focus();
		}
	});

	//show the first step
	$('div.stepwizard-header div a.btn-primary').trigger('click');

	$("#prevButton").click(function() {
		var currentStep = getCurrentStep();
		var previousStepLink = $('div.stepwizard-header div a[href="#' + currentStep + 'Section"]').parent().prev();
		previousStepLink.children("a").removeAttr('disabled').trigger('click');
	});

	$("#nextButton").click(function() {
		var currentStep = getCurrentStep();
		var nextStepLink = $('div.stepwizard-header div a[href="#' + currentStep + 'Section"]').parent().next();
		nextStepLink.children("a").removeAttr('disabled').trigger('click');
	});
}

function setupSteps() {
	setupArtifactStep();

	setupLayoutStep();

	setupFilterStep();

	setupDecorationStep();
}

/*
	Switch to the specified step.
*/
function showStep(stepId) {
	if (stepId == "captionSection") {
		showCaptionStep();
		$("#nextButton").css("visibility", "visible");
		$("#prevButton").css("visibility", "hidden");
	} else if (stepId == "artifactSection") {
		showArtifactStep();
		$("#nextButton").css("visibility", "visible");
		$("#prevButton").css("visibility", "visible");
	} else if (stepId == "layoutSection") {
		showLayoutStep();
		$("#nextButton").css("visibility", "visible");
		$("#prevButton").css("visibility", "visible");
	} else if (stepId == "filterSection") {
		showFilterStep();
		$("#nextButton").css("visibility", "visible");
		$("#prevButton").css("visibility", "visible");
	} else if (stepId == "decorationSection") {
		showDecorationStep();
		$("#nextButton").css("visibility", "visible");
		$("#prevButton").css("visibility", "visible");
	} else if (stepId == "postSection") {
		showPostStep();
		$("#nextButton").css("visibility", "hidden");
		$("#prevButton").css("visibility", "visible");
	}
}

function changeCallback(event) {
	applyChanges(null);
}

/**************************** (1) CAPTION STEP **********************************************/

function showCaptionStep() {
	$("#stepTitle").text("Enter a really awesome caption for your entry!")
}

function setupCaptionStep() {

}

/**************************** (2) ARTIFACT STEP **********************************************/

var defaultArtifactPresetSelectionID = "bannerBottomBlack";

/*
	Show the Artifact Step - either by navitating using the Next/Previous buttons,
	or by clicking the step button directly.

	This will refresh the thumbnail list from the server.
*/
function showArtifactStep() {
	$("#stepTitle").text("Place your caption in the entry image")

	if ($("#presetArtifactSection").is(":visible")) {
		//default selection
		var defaultSelectionID = $("#presetArtifactSection").data("selectedPresetID");
		if (defaultSelectionID == undefined) {
			defaultSelectionID = defaultArtifactPresetSelectionID;
			$("#presetArtifactSection").data("selectedPresetID", defaultSelectionID);
		}

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

					var jsonObj = {};
					constructJSONObject(jsonObj);
					if (!jsonObj.steps.artifacts) {
						jsonObj.steps.artifacts = [{}];
					}
					jsonObj.steps.artifacts[0].type = "preset";
					jsonObj.steps.artifacts[0].preset = a.id;
					jsonObj.steps.artifacts[0].banner = {text: $("#bannerText").prop("value")};
					generateChanges(a.id, jsonObj, function(id, imgPath) {
						$("#" + id + "EntityImage").prop("src", imgPath);
					});

					list.push(data);
				}

				$("#presetArtifacts").remove();
				var grid = createGrid("presetArtifacts", list, 3, true, true, defaultSelectionID, function(id) {
					switchStepOptions("artifact", "preset", id);
					
					$(window).scrollTop(0);
				});
				$("#presetArtifactSection").append(grid);

				//apply changes to reflect default selection
				applyChanges();
			}
		})
		.fail(function() {
			window.location.replace("/error");
		});
	}
}

function setupArtifactStep() {
	setupPresetAndCustomOptions("#artifactOptionsButton", "#presetArtifactSection", "#customArtifactSection", "preset");

	setupBannerToggleSection();
}

function setupBannerToggleSection() {
	var changeElementIds = [
		"#bannerColorButton", 
		"#bannerTextFontSize",
		"#bannerTextFontName",
		"#bannerTextColorButton"
		];

	var clickElementIds = [
		"#topBannerButton",
		"#bottomBannerButton",
		"#aboveBannerButton",
		"#belowBannerButton",
		"#transparentBannerButton",
		];

	setupGeneralRulesForToggleSection("#bannerEnabledButton", changeElementIds, clickElementIds, "artifact");

	setMutuallyExclusiveButtons(["#topBannerButton", "#bottomBannerButton", "#aboveBannerButton", "#belowBannerButton"]);

	setupColorButton("#bannerColorButton");
	setupColorButton("#bannerTextColorButton");

	clickElementIds.push("#bannerEnabledButton");
	setChangeCallback(changeCallback, changeElementIds, clickElementIds);
}



/**************************** (3) LAYOUT STEP **********************************************/

function showLayoutStep() {
	$("#stepTitle").text("Tweak the layout of your entry")

	if ($("#presetLayoutSection").is(":visible")) {
		//default selection
		var defaultSelectionID = $("#presetLayoutSection").data("selectedPresetID");
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
					if (!jsonObj.steps.layouts) {
						jsonObj.steps.layouts = [{}];
					}
					jsonObj.steps.layouts[0].type = "preset";
					jsonObj.steps.layouts[0].preset = l.id;
					generateChanges(l.id, jsonObj, function(id, imgPath) {
						$("#" + id + "EntityImage").prop("src", imgPath);
					});

					list.push(data);
				}

				$("#presetLayouts").remove();
				var grid = createGrid("presetLayouts", list, 3, true, true, defaultSelectionID, function(id) {
					switchStepOptions("layout", "preset", id);

					$(window).scrollTop(0);
				});
				$("#presetLayoutSection").append(grid);

				applyChanges(); //for default selection
			}
		})
		.fail(function() {
			window.location.replace("/error");
		});
	}
}

function setupLayoutStep() {
	setupPresetAndCustomOptions("#layoutOptionsButton", "#presetLayoutSection", "#customLayoutSection", "preset");

	setupCropToggleSection();

	setupMirrorToggleSection();

	setupRotationToggleSection();

	setupShearToggleSection();
}

function setupCropToggleSection() {
	/*************************** CROP SECTION *****************************/
	/**********************************************************************/

	// Logic Specific to this section

	setupGeneralRulesForToggleSection("#cropEnabledButton", [], ["#resetCropButton", "#editCropButton"], "layout");

	$("#saveCropButton").click(function() {
		var cropData = $("#newentryimage").cropper("getData");

		jQuery.data(document.body, "cropData", cropData);

		endCrop();
	});

	$("#cancelCropButton").click(function() {
		endCrop();
	});

	$("#resetCropButton").click(function() {
		//reset cached data
		jQuery.data(document.body, "cropData", null);
	});

	$("#editCropButton").click(function() {
		var cropData = jQuery.data(document.body, "cropData");

		//first switch off crop and bring image back to original size
		jQuery.data(document.body, "cropData", null);

		applyChanges(function() {
			startCrop(cropData);
		});
	});

	setChangeCallback(changeCallback, [], ["#resetCropButton", "#cropEnabledButton", "#saveCropButton"]);
}


/**
	Enter Crop Mode / UI.
	CropData is used to restore to previously stored crop box data, if available.
**/
function startCrop(cropData) {
	var options = {};

	if (cropData) {
		options.data = cropData;
	}

	$("#newentryimage").cropper(options);

	$(".imageSection").addClass("imageSectionHover");

	//disable everything else until we're out of the crop mode
	$("#steps").hide();
	$("#cropLabel").show();

}

/**
	Exit Crop Mode / UI.
**/
function endCrop() {
	$("#newentryimage").cropper("destroy");
	$(".imageSection").removeClass("imageSectionHover");

	$("#steps").show();
	$("#cropLabel").hide();
}

function setupMirrorToggleSection() {
	/*************************** FLIP SECTION *****************************/
	/**********************************************************************/

	setupGeneralRulesForToggleSection("#mirrorEnabledButton", [], ["#flipHorizontalButton", "#flipVerticalButton"], "layout");

	setMutuallyExclusiveButtons(["#flipHorizontalButton", "#flipVerticalButton"]);

	setChangeCallback(changeCallback, [], ["#mirrorEnabledButton", "#flipVerticalButton", "#flipHorizontalButton"]);
}

function setupRotationToggleSection() {
	/*************************** ROTATE SECTION *****************************/
	/************************************************************************/

	setupGeneralRulesForToggleSection("#rotationEnabledButton", [], ["#resetRotationButton", "#anticlockwise10RotationButton", "#anticlockwise90RotationButton", "#clockwise90RotationButton", "#clockwise10RotationButton", "#rotateColorButton"], "layout");
	
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
		
		jQuery.data(document.body, "rotationData", rotationData);
	});

	$("#resetRotationButton").click(function() {
		jQuery.data(document.body, "rotationData", null);
	});

	setupColorButton("#rotateColorButton");

	setChangeCallback(changeCallback, ["#rotateColorButton"], ["#rotationEnabledButton", "#resetRotationButton", "#anticlockwise10RotationButton", "#anticlockwise90RotationButton", "#clockwise90RotationButton", "#clockwise10RotationButton"]);

}

function setupShearToggleSection() {
	/*************************** SHEAR SECTION ******************************/
	/************************************************************************/

	setupGeneralRulesForToggleSection("#shearEnabledButton", [], ["#resetShearButton", "#negative10ShearXButton", "#positive10ShearXButton", "#negative10ShearYButton", "#positive10ShearYButton", "#shearColorButton"], "layout");
	
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
		
		jQuery.data(document.body, "shearData", shearData);
	});

	$("#resetShearButton").click(function() {
		jQuery.data(document.body, "shearData", null);
	});

	setupColorButton("#shearColorButton");

	setChangeCallback(changeCallback, ["#shearColorButton"], ["#shearEnabledButton", "#resetShearButton", "#negative10ShearXButton", "#positive10ShearXButton", "#negative10ShearYButton", "#positive10ShearYButton"]);
}

/**************************** (4) FILTER STEP **********************************************/

function showFilterStep() {
	$("#stepTitle").text("Apply a really cool filter to your entry!")

	if ($("#presetFilterSection").is(":visible")) {
		//default selection
		var defaultSelectionID = $("#presetFilterSection").data("selectedPresetID");

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
					if (!jsonObj.steps.filters) {
						jsonObj.steps.filters = [{}];
					}
					jsonObj.steps.filters[0].type = "preset";
					jsonObj.steps.filters[0].preset = f.id;
					generateChanges(f.id, jsonObj, function(id, imgPath) {
						$("#" + id + "EntityImage").prop("src", imgPath);
					});

					list.push(data);
				}

				$("#presetFilters").remove();
				var grid = createGrid("presetFilters", list, 3, true, true, defaultSelectionID, function(id) {
					switchStepOptions("filter", "preset", id);

					$(window).scrollTop(0);
				});
				$("#presetFilterSection").append(grid);

				applyChanges(); //for default selection
			}
		})
		.fail(function() {
			window.location.replace("/error");
		});
	}
}

function setupFilterStep() {
	setupPresetAndCustomOptions("#filterOptionsButton", "#presetFilterSection", "#customFilterSection", "preset");

	setupGrayscaleToggleSection();

	setupMonochromeToggleSection();

	setupNegativeToggleSection();

	setupSolarizeToggleSection();

	setupSpreadToggleSection();

	setupSwirlToggleSection();

	setupWaveToggleSection();

	setupCharcoalToggleSection();

	setupMosaicToggleSection();

	setupPaintToggleSection();

	setupContrastToggleSection();

	setupBrightnessToggleSection();

	setupHueToggleSection();

	setupSaturationToggleSection();
}

function setupGrayscaleToggleSection() {
	setupGeneralRulesForToggleSection("#grayscaleEnabledButton", [], [], "filter");

	setChangeCallback(changeCallback, [], ["#grayscaleEnabledButton"]);
}

function setupMonochromeToggleSection() {
	setupGeneralRulesForToggleSection("#monochromeEnabledButton", [], [], "filter");

	setChangeCallback(changeCallback, [], ["#monochromeEnabledButton"]);
}

function setupNegativeToggleSection() {
	setupGeneralRulesForToggleSection("#negativeEnabledButton", [], [], "filter");

	setChangeCallback(changeCallback, [], ["#negativeEnabledButton"]);
}

function setupSolarizeToggleSection() {
	setupGeneralRulesForToggleSection("#solarizeEnabledButton", ["#solarizeRangeInput"], [], "filter");

	$("#solarizeSection").append(createRangeSection("Solarize factor", "solarizeRangeInput", 0, 100, 100, 5));

	setChangeCallback(changeCallback, ["#solarizeRangeInput"], ["#solarizeEnabledButton"]);
}

function setupSpreadToggleSection() {
	setupGeneralRulesForToggleSection("#spreadEnabledButton", ["#spreadRangeInput"], [], "filter");

	$("#spreadSection").append(createRangeSection("Spread radius", "spreadRangeInput", 0, 100, 0, 5));

	setChangeCallback(changeCallback, ["#spreadRangeInput"], ["#spreadEnabledButton"]);
}

function setupSwirlToggleSection() {
	setupGeneralRulesForToggleSection("#swirlEnabledButton", ["#swirlRangeInput"], [], "filter");

	$("#swirlSection").append(createRangeSection("Swirl radius", "swirlRangeInput", 0, 100, 0, 5));

	setChangeCallback(changeCallback, ["#swirlRangeInput"], ["#swirlEnabledButton"]);
}

function setupWaveToggleSection() {
	setupGeneralRulesForToggleSection("#waveEnabledButton", ["#waveAmplitudeRangeInput", "#waveLengthRangeInput"], [], "filter");

	$("#waveSection").append(createRangeSection("Wave amplitude", "waveAmplitudeRangeInput", 0, 100, 0, 5));
	$("#waveSection").append(createRangeSection("Wave length", "waveLengthRangeInput", 0, 100, 100, 5));

	setChangeCallback(changeCallback, ["#waveAmplitudeRangeInput", "#waveLengthRangeInput"], ["#waveEnabledButton"]);
}

function setupCharcoalToggleSection() {
	setupGeneralRulesForToggleSection("#charcoalEnabledButton", ["#charcoalRangeInput"], [], "filter");

	$("#charcoalSection").append(createRangeSection("Charcoal factor", "charcoalRangeInput", 0, 20, 0, 1));

	setChangeCallback(changeCallback, ["#charcoalRangeInput"], ["#charcoalEnabledButton"]);
}

function setupMosaicToggleSection() {
	setupGeneralRulesForToggleSection("#mosaicEnabledButton", [], [], "filter");

	setChangeCallback(changeCallback, [], ["#mosaicEnabledButton"]);
}

function setupPaintToggleSection() {
	setupGeneralRulesForToggleSection("#paintEnabledButton", ["#paintRangeInput"], [], "filter");

	$("#paintSection").append(createRangeSection("Paint radius", "paintRangeInput", 0, 100, 0, 5));

	setChangeCallback(changeCallback, ["#paintRangeInput"], ["#paintEnabledButton"]);
}

function setupContrastToggleSection() {
	setupGeneralRulesForToggleSection("#contrastEnabledButton", ["#contrastRangeInput"], [], "filter");

	$("#contrastSection").append(createRangeSection("Contrast", "contrastRangeInput", -100, 100, 0, 5));

	setChangeCallback(changeCallback, ["#contrastRangeInput"], ["#contrastEnabledButton"]);
}

function setupBrightnessToggleSection() {
	setupGeneralRulesForToggleSection("#brightnessEnabledButton", ["#brightnessRangeInput"], [], "filter");

	$("#brightnessSection").append(createRangeSection("Brightness", "brightnessRangeInput", -100, 100, 0, 5));

	setChangeCallback(changeCallback, ["#brightnessRangeInput"], ["#brightnessEnabledButton"]);
}

function setupHueToggleSection() {
	setupGeneralRulesForToggleSection("#hueEnabledButton", ["#hueRangeInput"], [], "filter");

	$("#hueSection").append(createRangeSection("Hue", "hueRangeInput", -100, 100, 0, 5));

	setChangeCallback(changeCallback, ["#hueRangeInput"], ["#hueEnabledButton"]);
}

function setupSaturationToggleSection() {
	setupGeneralRulesForToggleSection("#saturationEnabledButton", ["#saturationRangeInput"], [], "filter");

	$("#saturationSection").append(createRangeSection("Saturation", "saturationRangeInput", -100, 100, 0, 5));

	setChangeCallback(changeCallback, ["#saturationRangeInput"], ["#saturationEnabledButton"]);
}

/**************************** (5) DECORATION STEP **********************************************/

function showDecorationStep() {
	$("#stepTitle").text("Apply some final touches to your entry with a border!")

	if ($("#presetDecorationSection").is(":visible")) {
		//default selection
		var defaultSelectionID = $("#presetDecorationSection").data("selectedPresetID");

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
					if (!jsonObj.steps.decorations) {
						jsonObj.steps.decorations = [{}];
					}
					jsonObj.steps.decorations[0].type = "preset";
					jsonObj.steps.decorations[0].preset = d.id;
					generateChanges(d.id, jsonObj, function(id, imgPath) {
						$("#" + id + "EntityImage").prop("src", imgPath);
					});

					list.push(data);
				}

				$("#presetDecorations").remove();
				var grid = createGrid("presetDecorations", list, 3, true, true, defaultSelectionID, function(id) {
					switchStepOptions("decoration", "preset", id);

					$(window).scrollTop(0);
				});
				$("#presetDecorationSection").append(grid);

				applyChanges(); //for default selection
			}
		})
		.fail(function() {
			window.location.replace("/error");
		});
	}
}

function setupDecorationStep() {
	setupPresetAndCustomOptions("#decorationOptionsButton", "#presetDecorationSection", "#customDecorationSection", "preset");

	setupBorderToggleSection();
}

function setupBorderToggleSection() {
	setupGeneralRulesForToggleSection("#borderEnabledButton", ["#borderWidth", "#borderColor"], [], "decoration");

	setupColorButton("#borderColor");

	setChangeCallback(changeCallback, ["#borderColor", "#borderWidth"], ["#borderEnabledButton"]);
}

/**************************** (6) POST STEP **********************************************/

function showPostStep() {
	$("#stepTitle").text("You're now ready to post!")
}

/*****************************************************************************************/
/**************************** COMMON ROUTINES / HELPER FUNCTIONS **********************************************/

/*
	Set up the color button using the bootstrap-colorpicker module.
	Refer: https://farbelous.github.io/bootstrap-colorpicker/
*/
function setupColorButton(buttonID) {
	$(buttonID).colorpicker().on('changeColor', function(e) {
        $(buttonID).css("background", e.color.toString("rgba"));
        applyChanges();
    });
}

/*
	Switch between Preset and Custom options mode.

	Note that these modes are mutually exclusive.
*/
function switchStepOptions(stepType, optionType, presetOptionID) {
	if (optionType == "preset") {
		//Switch to Preset mode.  Make sure to turn of Custom mode buttons, if any are still enabled.
		switch (stepType) {
			case "artifact":
				$("#artifactOptionsButton").data("state", "preset");
				$("#presetArtifactSection").data("selectedPresetID", presetOptionID);
				$("#customArtifactSection button:not(.featureToggleButton), input, select ").prop("disabled", true);
				$("#customArtifactSection .featureToggleButton").removeClass("active").text("OFF");
				break;
			case "layout":
				$("#layoutOptionsButton").data("state", "preset");
				$("#presetLayoutSection").data("selectedPresetID", presetOptionID);
				$("#customLayoutSection button:not(.featureToggleButton), input, select ").prop("disabled", true);
				$("#customLayoutSection .featureToggleButton").removeClass("active").text("OFF");
				break;
			case "filter":
				$("#filterOptionsButton").data("state", "preset");
				$("#presetFilterSection").data("selectedPresetID", presetOptionID);
				$("#customFilterSection button:not(.featureToggleButton), input, select ").prop("disabled", true);
				$("#customFilterSection .featureToggleButton").removeClass("active").text("OFF");
				break;
			case "decoration":
				$("#decorationOptionsButton").data("state", "preset");
				$("#presetDecorationSection").data("selectedPresetID", presetOptionID);
				$("#customDecorationSection button:not(.featureToggleButton), input, select ").prop("disabled", true);
				$("#customDecorationSection .featureToggleButton").removeClass("active").text("OFF");
				break;
		}
		
	} else if (optionType == "custom") {
		//Switch to Custom mode.
		switch (stepType) {
			case "artifact":
				$("#artifactOptionsButton").data("state", "custom");
				break;
			case "layout":
				$("#layoutOptionsButton").data("state", "custom");
				break;
			case "filter":
				$("#filterOptionsButton").data("state", "custom");
				break;
			case "decoration":
				$("#decorationOptionsButton").data("state", "custom");
				break;
		}
	}

	applyChanges();
}

/*
	Handlers for the Options button that switches between Preset and Custom mode.
*/
function setupPresetAndCustomOptions(optionsButtonId, presetSectionID, customSectionID, defaultSection) {
	$(optionsButtonId).data("state", defaultSection);
	$(optionsButtonId).click(function() {
		if ($(presetSectionID).is(":visible")) {
			$(presetSectionID).hide();
			$(customSectionID).show();

			$(this).text("Hide custom options");
		} else if ($(customSectionID).is(":visible")) {
			$(presetSectionID).show();
			$(customSectionID).hide();

			$(this).text("Show custom options");
		}
	});
}

/*
	Create a range input, with min and max specified, and set
	a label or caption with the currently selected value.
*/
function createRangeSection(caption, rangeInputID, min, max, value, step) {
	var rangeSection = $("<div>", {class: "settingsRangeWithValue"});
	var captionElement = $("<div>", {id: rangeInputID + "Caption"}).append(caption + ": " + value);
	var input = $("<input>", {id: rangeInputID, type: "range", min: min, max: max, value: value, step: step});
	input.change(function() {
		$("#" + rangeInputID + "Caption").text(caption + ": " + $("#" + this.id).val());
	});
	
	var rangeInputWithMinMax = $("<div>").append($("<span>").append(min + " ")).append(input).append($("<span>").append(" " + max));

	rangeSection.append(captionElement).append(rangeInputWithMinMax);
	return rangeSection;
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

/*
	Setup general rules for a custom section that has a main feature
	toggle button, and other feature items that are dependent
	on that toggle.

	Also, the assumption is that this main feature toggle is mutually
	exclusive to the presets settings, which means that if the toggle
	is ON, the presets should be switched off.
*/
function setupGeneralRulesForToggleSection(mainFeatureButtonId, changeElementIds, clickElementIds, stepType) {
	var allElementIds = changeElementIds.concat(clickElementIds);

	enableDisableItems(allElementIds, $(mainFeatureButtonId).hasClass("active"));

	setupMainFeatureToggle(mainFeatureButtonId, allElementIds, stepType);
}

/*
	Enable or Disable the list of provided items.
*/
function enableDisableItems(elementIds, enable) {
	for (var i = 0; i < elementIds.length; i++) {
		$(elementIds[i]).prop("disabled", !enable);
	}
}

/*
	Activate or Deactive the list of provided items.
*/
function activateDeactivateItems(elementIds, activate) {
	for (var i = 0; i < elementIds.length; i++) {
		if (activate) {
			$(elementIds[i]).addClass("active");
		} else {
			$(elementIds[i]).removeClass("active");
		}
	}
}

/*
	Handle toggle for main feature button.

	Also, takes care of enabling/disabling other items that are dependent on the 
	main feature button
*/
function setupMainFeatureToggle(mainFeatureButtonId, otherFeatureElementIds, stepType) {
	//first, toggle the main feature button
	var mainFeatureButton = $(mainFeatureButtonId);
	mainFeatureButton.click(function() {
		if ($(this).hasClass("active")) {
			//already ON, switch OFF
			$(this).removeClass("active");
			$(this).text("OFF");
			enableDisableItems(otherFeatureElementIds, false);

			//deactivate the items since the main feature toggle is OFF
			//activateDeactivateItems(otherFeatureElementIds, false);
		} else {
			//already OFF, switch ON
			$(this).addClass("active");
			$(this).text("ON");
			enableDisableItems(otherFeatureElementIds, true);

			//Switch on custom options mode, since at least one toggle feature has been turned ON
			switchStepOptions(stepType, "custom", null);
		}
	});

}

/*
	Set the callback that should be called when the list of elements
	provided either change or are clicked.
*/
function setChangeCallback(callback, changeElementIds, clickElementIds) {
	for (var i = 0; i < changeElementIds.length; i++) {
		$(changeElementIds[i]).change({callback: null}, callback);
	}

	for (var i = 0; i < clickElementIds.length; i++) {
		$(clickElementIds[i]).click({callback: null}, callback);
	}
}

/*
	Given the button list, set them to be toggleable
	with the 'active' class mutually exclusively of each
	other.

	This assumes that the buttons are all siblings of
	each other in the DOM hierarchy.
*/
function setMutuallyExclusiveButtons(buttonIdList) {
	var selector = "";
	for (var i = 0; i < buttonIdList.length; i++) {
		if (i > 0) {
			selector += ", ";
		}
		selector += buttonIdList[i];
	}
	$(selector).click(function() {
		$(this).toggleClass('active').siblings().not(this).removeClass('active');
	});
}

function getCurrentStep() {
	if ($("#captionSection").is(":visible")) {
		return "caption";
	} else if ($("#layoutSection").is(":visible")) {
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

/*****************************************************************************************/
/*
	Construct the JSON Object that contains all the currently selected
	settings for all the steps.  This is sent to server for two purposes:

	1) To generate intermediate thumbnail preset images based on current selections
	2) To generate the final steps at the time of Posting the entry
*/
/*****************************************************************************************/

function constructJSONObject(jsonObj) {

	jsonObj.challengeId = challengeId;
	jsonObj.created = (new Date()).getTime();
	jsonObj.caption = $("#bannerText").prop("value");

	//extract image height and width, will be used to save in server for use for meta tags
	jsonObj.imageHeight = $("#newentryimage").data("naturalHeight");
	jsonObj.imageWidth = $("#newentryimage").data("naturalWidth");
	jsonObj.imageType = $("#newentryimage").data("imageType");

	jsonObj.steps = {}; // the main object that encapsulates filters, layouts, etc.

	/// LAYOUT
	
	var layout = {};
	if ($("#layoutOptionsButton").data("state") == "preset") {
		var presetValue = $("#presetLayoutSection").data("selectedPresetID");
		if (presetValue != undefined) {
			layout.type = "preset";
			layout.preset = presetValue;
		}
	} else if ($("#layoutOptionsButton").data("state") == "custom") {
		layout.type = "custom";
		
		//crop
		if ($("#cropEnabledButton").hasClass("active")) {
			var cropData = jQuery.data(document.body, "cropData");

			if (cropData) {
				layout.crop = {x: cropData.x, y: cropData.y, width: cropData.width, height: cropData.height};
			}
		}

		//flip
		if ($("#mirrorEnabledButton").hasClass("active")) {
			if ($("#flipHorizontalButton").hasClass("active")) {
				layout.mirror = "flop";
			}

			if ($("#flipVerticalButton").hasClass("active")) {
				layout.mirror = "flip";
			}
		}

		//rotation
		if ($("#rotationEnabledButton").hasClass("active")) {
			var rotationData = jQuery.data(document.body, "rotationData");

			if (rotationData) {
				layout.rotation = {};
				layout.rotation.degrees = rotationData.degrees;
				layout.rotation.color = $("#rotateColorButton").css("background-color");
			}
		}

		//shear
		if ($("#shearEnabledButton").hasClass("active")) {
			var shearData = jQuery.data(document.body, "shearData");

			if (shearData) {
				layout.shear = {};
				layout.shear.xDegrees = shearData.xDegrees;
				layout.shear.yDegrees = shearData.yDegrees;
				layout.shear.color = $("#shearColorButton").css("background-color");
			}
		}
	}

	if (!$.isEmptyObject(layout)) {
		jsonObj.steps.layouts = [];
		jsonObj.steps.layouts.push(layout);
	}

	/// FILTERS
	var filter = {};

	if ($("#filterOptionsButton").data("state") == "preset") { // PRESET FILTER
		var presetValue = $("#presetFilterSection").data("selectedPresetID");
		if (presetValue != undefined) {
			filter.type = "preset";
			filter.preset = presetValue;
		}
	} else if ($("#filterOptionsButton").data("state") == "custom") { // CUSTOM FILTER
		filter.type = "custom";

		// Antique
		if ($("#grayscaleEnabledButton").hasClass("active")) {
			filter.grayscale = "on";
		}

		if ($("#monochromeEnabledButton").hasClass("active")) {
			filter.monochrome = "on";
		}

		if ($("#negativeEnabledButton").hasClass("active")) {
			filter.negative = "on";
		}

		if ($("#solarizeEnabledButton").hasClass("active")) {
			filter.solarize = {threshold: $("#solarizeRangeInput").val()};
		}

		// Distortion
		if ($("#spreadEnabledButton").hasClass("active")) {
			filter.spread = {amount : $("#spreadRangeInput").val()};
		}

		if ($("#swirlEnabledButton").hasClass("active")) {
			filter.swirl = {degrees: $("#swirlRangeInput").val()};
		}

		if ($("#waveEnabledButton").hasClass("active")) {
			filter.wave = {amplitude : $("#waveAmplitudeRangeInput").val(), wavelength: $("#waveLengthRangeInput").val()};
		}

		// Artistic
		if ($("#charcoalEnabledButton").hasClass("active")) {
			filter.charcoal = {factor: $("#charcoalRangeInput").val()};
		}

		if ($("#mosaicEnabledButton").hasClass("active")) {
			filter.mosaic = "on";
		}

		if ($("#paintEnabledButton").hasClass("active")) {
			filter.paint = {radius: $("#paintRangeInput").val() };
		}

		// Contrast/Brigthness/Color
		if ($("#contrastEnabledButton").hasClass("active")) {
			filter.contrast = {value: $("#contrastRangeInput").val()};
		}

		if ($("#brightnessEnabledButton").hasClass("active")) {
			filter.brightness = {value: $("#brightnessRangeInput").val()};
		}

		if ($("#hueEnabledButton").hasClass("active")) {
			filter.hue = {value: $("#hueRangeInput").val()};
		}

		if ($("#saturationEnabledButton").hasClass("active")) {
			filter.saturation = {value: $("#saturationRangeInput").val()};
		}
	}

	
	if (!$.isEmptyObject(filter)) {
		jsonObj.steps.filters = [];
		jsonObj.steps.filters.push(filter);
	}
	

	// ARTIFACTS
	var artifact = {};
	if ($("#artifactOptionsButton").data("state") == "preset") {
		var presetValue = $("#presetArtifactSection").data("selectedPresetID");
		if (presetValue != undefined) {
			artifact.type = "preset";
			artifact.preset = presetValue;
		}
	} else if ($("#artifactOptionsButton").data("state") == "custom") {
			artifact.type = "custom";

			artifact.banner = {};

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
			artifact.banner.backgroundColor = $("#bannerColorButton").css("background-color");
			artifact.banner.textColor = $("#bannerTextColorButton").css("background-color");
	}


	if (!$.isEmptyObject(artifact)) {
		jsonObj.steps.artifacts = [];
		jsonObj.steps.artifacts.push(artifact);
	}
	
	// DECORATIONS
	var decoration = {};

	if ($("#decorationOptionsButton").data("state") == "preset") {
		var presetValue = $("#presetDecorationSection").data("selectedPresetID");
		if (presetValue != undefined) {
			decoration.type = "preset";
			decoration.preset = presetValue;
		}
	} else if ($("#decorationOptionsButton").data("state") == "custom") {
		decoration.type = "custom";

		if ($("#borderEnabledButton").hasClass("active")) {
			decoration.border = {};

			decoration.border.width = $("#borderWidth").val();
			decoration.border.color = $("#borderColor").css("background-color");
		}
	}

	if (!$.isEmptyObject(artifact)) {
		jsonObj.steps.decorations = [];
		jsonObj.steps.decorations.push(decoration);
	}
}

/*
	Generate the intermediate image based on given jsonObj.  Typically used
	for generating thumbnail images for Preset options.
*/
var generateFailCount = 0;
function generateChanges(id, jsonObj, done) {
	$.ajax({
		type: "POST",
		url: "/api/filters/apply",
		dataType: "json",
		contentType: "application/json; charset=UTF-8",
		data: JSON.stringify(jsonObj),
		success: function(jsonData) {
			if (jsonData.type == "url") {
				done(id, jsonData.imageData);
			} else if (jsonData.type == "blob") {
				done(id, "data:image/jpeg;base64," + jsonData.imageData);
			}
			
		},
		error: function(jsonData) {
			generateFailCount ++;

			if (generateFailCount == 1) {
				generateChanges(id, jsonObj, done);
			} else {
				//if more than once, redirect to error page and restart
				window.location.replace("/error");
			}
		}
	});
}

/*
	Apply changes based on current selection on the main preview image.
*/
var applyFailCount = 0;
function applyChanges(done) {
	var jsonObj = {};
	
	constructJSONObject(jsonObj);
	$.ajax({
		type: "POST",
		url: "/api/filters/apply",
		dataType: "json",
		contentType: "application/json; charset=UTF-8",
		data: JSON.stringify(jsonObj),
		success: function(jsonData) {
			if (jsonData.type == "url") {
				$("#newentryimage").attr("src", jsonData.imageData);
			} else if (jsonData.type == "blob") {
				$("#newentryimage").attr("src", "data:image/jpeg;base64," + jsonData.imageData);
				if (done) {
					done();
				}
			}
		},
		error: function(jsonData) {
			applyFailCount ++;
			if (applyFailCount == 1) {
				//try one more time
				applyChanges(done);
			} else {
				//if more than once, redirect to error page and restart
				window.location.replace("/error");
			}
		}
	});
}

/*
	Actually POST the new entry.
*/
var failCount = 0;
function postEntry() {

	var jsonObj = {};
	
	constructJSONObject(jsonObj);

	$.ajax({
		type: "POST",
		url: "/api/entries",
		dataType: "json",
		contentType: "application/json; charset=UTF-8",
		data: JSON.stringify(jsonObj)
	})
	.done(function(data, textStatus, jqXHR) {
    	window.open("/entry/" + jsonData.id, "_self");
	})
	.fail(function(jqXHR, textStatus, errorThrown) {
		failCount ++;

		if (failCount == 1) {
			//in case of some failure, allow the user another chance at posting by clicking the Post Challenge button again
			alert("Oops.. Something prevented us from posting your entry.  Please try again.");
		    $("#apply").prop("value", "Post");
		    $("#apply").prop("disabled", false);
		} else {
			window.location.replace("/error");
		}
	});

	//as soon as the user clicks Post Entry button, disable the button to prevent multiple clicks
	//change button to 'posting ...'
	$("#apply").prop("value", "Posting...");
	$("#apply").prop("disabled", true);
}



