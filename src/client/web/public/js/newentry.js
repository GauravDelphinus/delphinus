$(document).ready(function(){
	setupMainItem();

	createLoginHeader();

	setupHandlers();
});

function setupDesignSection() {
	
	$.getJSON('/api/designs/', function(result) {
		$("#designCategories").data("designData", result);
		for (key in result) {
			if (result[key].name) {
				$("#designCategories").append($("<option>", {value: key, text: result[key].name, selected: true}));
			}
		}
		$("#designCategories").chosen({width: "100%"}); //use an ergonomic selection dropdown.  Refer https://harvesthq.github.io/chosen/

		refreshDesignView();
	})
	.fail(function() {
		window.location.replace("/error");
	});

	$("#designCategories").change(function() {
		refreshDesignView();
	});
}

function checkDesign(designObj) {
	return (designObj.id == this);
}

function refreshDesignView() {
	//first, find the select categories
	var selectedDesignList = [];
	var designData = $("#designCategories").data("designData");
	var selectedCategories = $("#designCategories").val();

	//build the list of all designs that are part of the selected categories
	for (var i = 0; i < selectedCategories.length; i++) {
		if (designData.hasOwnProperty(selectedCategories[i])) {
			selectedDesignList.push.apply(selectedDesignList, designData[selectedCategories[i]].designList);
		}
	}

	//create the grid view with these designs
	var grid = createGrid("presetDesignGrid", selectedDesignList, 3, true, true, null, function(selectedDesignId) {

		//find the selected design, and use that image to pass to the new caption workflow
		var selectedDesignObj = selectedDesignList.find(checkDesign, selectedDesignId);
		designId = selectedDesignId; //set design Id to the selected design (see constructJSONObject)
		defaultArtifactPresetSelectionID = selectedDesignObj.presetArtifactId;

		switchToStepsView(selectedDesignObj.image, selectedDesignObj.name);
	});

	//refresh the grid list
	$("#presetDesignList").empty().append(grid);
}

/**
	Set up event handlers
**/
function setupHandlers() {
	// Setup the dnd listeners.
	var dropZone = document.getElementById('dropzone');
	dropZone.addEventListener('dragover', handleDragOver, false);
	dropZone.addEventListener('drop', handleFileDropped, false);

	//handler for caption text box
	$("#bannerText").on('keyup', function (e) {
	    if (e.keyCode == 13) {
	    	setupArtifactStep();
	    }
	});

	//handler for file Browse button
	document.getElementById('files').addEventListener('change', handleFileSelect, false);

	$("#selectDesignButton").click(function() {
		setupDesignSection();

		$("#selectDesignSection").show();
		$("#selectImageSection").hide();
	});

	//post button
	$("#apply").click(postEntry);

	//handlers for the tabs
	$('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
		var target = $(e.target).attr("href") // activated tab
		if (target == "#artifactSection") {
			setupArtifactStep();
		} else if (target == "#layoutSection") {
			setupLayoutStep();
		} else if (target == "#filterSection") {
			setupFilterStep();
		} else if (target == "#decorationSection") {
			setupDecorationStep();
		}
	});
}

/****** Drag / Drop Handlers ********/

function handleFileDropped(evt) {
	evt.stopPropagation();
    evt.preventDefault();

    extractImage(evt.dataTransfer.files, handleFileSelected);
}

function handleFileSelect(evt) {
  	extractImage(evt.target.files, handleFileSelected); // FileList object
}


function handleDragOver(evt) {
    evt.stopPropagation();
    evt.preventDefault();
    evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
}

/**
	An image was selected, whether by drag/drop or by Browse button
	Show the image and switch to next step 
**/
function handleFileSelected(data, path, title, type) {
	switchToStepsView(path, title);
}

function switchToStepsView(imagePath, imageTitle) {
	$("#newentryimage").prop("src", imagePath);
	$("#newentryimage").prop("title", imageTitle);
	$("#selectImageSection").hide();
	$("#selectDesignSection").hide();

	$("#stepsSection").show();
	$("#bannerText").focus();
}

/**
	Decide what to show - if challengeId is available, pull the details
	to show the original image.  Otherwise, ask user to browse for a new image
	or to select a design.
**/
function setupMainItem() {
	if (challengeId != 0) {
		//since we have the challenge Id, this is a Challenge Entry workflow
		$.getJSON('/api/challenges/' + challengeId + "?info=basic", function(result) {
			$("#newentryimage").prop("src", result.image);
			$("#newentryimage").data("imageType", result.imageType);
			$("#selectImageSection").hide();
			$("#stepsSection").show();
		})
		.fail(function() {
			window.location.replace("/error");
		});
	} else {
		//prompt user to select image that needs to be "captionified"
		$("#selectImageSection").show();
		$("#stepsSection").hide();
	}
	
	$("#newentryimage").on("load", function() {
		$("#newentryimage").data("naturalWidth", this.naturalWidth);
		$("#newentryimage").data("naturalHeight", this.naturalHeight);
		setImageHeight(); //adjust height
	});

	//listen to window resize events
	$(window).bind('resize', setImageHeight);
    setImageHeight();
}

/*
	Set the Image Height to the best possible to fit into the resizable window.
*/
function setImageHeight() {
	var offset = $("#newentryimage").offset();
	var windowHeight = window.innerHeight;
	if ($("#newentryimage").height() > $("#newentryimage").width()) {
		//it's a portrait image, so try to adjust the height to fit about half way into the visible area of the window
		var desiredHeight = windowHeight / 2;
		$("#newentryimage").height(desiredHeight);
	}
}


function changeCallback(event) {
	applyChanges(true, null);
}

/**************************** (1) CAPTION STEP **********************************************/

function showCaptionStep() {
	$("#stepTitle").text("Enter a really awesome caption for your entry!")
}

function setupCaptionStep() {

}

/**************************** (2) ARTIFACT STEP **********************************************/

var defaultArtifactPresetSelectionID = "bannerBottom"; //NOTE: must match one of the values in presets.json

/*
	Show the Artifact Step - first time setup

	This will refresh the thumbnail list from the server.
*/
function setupArtifactStep() {
	//set up the custom settings
	setupColorButton("#bannerColorButton");
	setupColorButton("#bannerTextColorButton");
	setChangeCallback(changeCallback, ["#bannerTextFontSize"], []);

	createPresetsView("artifact", "#presetArtifactSection", defaultArtifactPresetSelectionID, "presets");
}

/**************************** (3) LAYOUT STEP **********************************************/

var defaultLayoutPresetSelectionID = "originalLayout"; //NOTE: must match one of the values in presets.json

function setupLayoutStep() {
	setupCropToggleSection();

	createPresetsView("layout", "#presetLayoutSection", defaultLayoutPresetSelectionID, "presets");
}

function setupCropToggleSection() {
	/*************************** CROP SECTION *****************************/
	/**********************************************************************/

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

		applyChanges(false, function() {
			startCrop(cropData);
		});
	});

	setChangeCallback(changeCallback, [], ["#resetCropButton", "#saveCropButton"]);
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
	$("#captionSection").hide();
	$("#cropLabel").show();

}

/**
	Exit Crop Mode / UI.
**/
function endCrop() {
	$("#newentryimage").cropper("destroy");
	$(".imageSection").removeClass("imageSectionHover");

	//restore back the original view - show the caption, the steps, adn hide the crop label
	$("#steps").show();
	$("#captionSection").show();
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
					var f = result[i];
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
					generateChanges(f.id, jsonObj, function(id, data) {
						$("#presetFilters" + id + "EntityImage").prop("src", data.imageData);
					});

					list.push(data);
				}

				var grid = createGrid("presetFilters", list, 3, true, true, defaultSelectionID, function(id) {
					switchStepOptions("filter", "preset", id);

					$(window).scrollTop(0);
				});
				$("#presetFilterSection").empty().append(grid);

				applyChanges(false); //for default selection
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
					var d = result[i];
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
					generateChanges(d.id, jsonObj, function(id, data) {
						$("#presetDecorations" + id + "EntityImage").prop("src", data.imageData);
					});

					list.push(data);
				}

				var grid = createGrid("presetDecorations", list, 3, true, true, defaultSelectionID, function(id) {
					switchStepOptions("decoration", "preset", id);

					$(window).scrollTop(0);
				});
				$("#presetDecorationSection").empty().append(grid);

				applyChanges(false); //for default selection
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
	$("#stepTitle").text("You're all set!")
}

/*****************************************************************************************/
/**************************** COMMON ROUTINES / HELPER FUNCTIONS **********************************************/

/**
	Create/initialize the Presets view for hosting preset thumbnais of artifacts, filters, etc.

	presetType: one of artifact, filter, decoration or layout
	presetSectionID: id of the preset section for that preset type (including the # symbol)
	defaultPresetID: the ID of the default preset value for that presetType
	contentTag: a content tag (string) to uniquely identify this presets view
	Note: this should be called only once
**/
function createPresetsView(presetType, presetSectionID, defaultPresetID, contentTag) {
	//default selection
	var defaultSelectionID = fetchPresetValue(presetType, defaultPresetID);

	createPresetsViewInternal(presetType, contentTag, defaultSelectionID, function(err, presetsView) {
		if (err) {
			window.location.replace("/error");
			return;
		}

		$(presetSectionID).empty().append(presetsView);

		//apply changes to reflect default selection
		applyChanges(false);

		//refresh the thumbnails in the presets view
		refreshPresetsView(presetType, presetSectionID);
	});

}

/**
	Refresh the Presets view for hosting preset thumbnais of artifacts, filters, etc.

	presetType: one of artifact, filter, decoration or layout
	presetSectionID: id of the preset section for that preset type (including the # symbol)

	Note: this assumes that the view is already created and only the thumbnails need to be refreshed
	due to a chance in the selections by the user
**/
function refreshPresetsView(presetType, presetSectionID) {
	var images = $(presetSectionID + " img");
	$(images).each(function(index) {
		var image = $(this);
		var presetId = $(image).attr("id");
		//update the server with the step information and update the image that is received
		var jsonObj = constructJSONObjectWithPreset(presetType, presetId);

		generateChanges(presetId, jsonObj, function(id, data) {
			$("img#" + id).prop("src", data.imageData);
		});
	});
}

/**
	Construct the JSON object with all the currently selected settings

	Also, add the preset infromation to the object
**/
function constructJSONObjectWithPreset(presetType, presetId) {
	//construct the jsonObj representing the current steps
	var jsonObj = {};
	constructJSONObject(jsonObj);

	if (presetType == "artifact") {
		if (!jsonObj.steps.artifacts) {
			jsonObj.steps.artifacts = [{}];
		}

		jsonObj.steps.artifacts[0].preset = presetId;
	} else if (presetType == "layout") {
		if (!jsonObj.steps.layouts) {
			jsonObj.steps.layouts = [{}];
		}

		jsonObj.steps.layouts[0].preset = presetId;
	} else if (presetType == "filter") {
		if (!jsonObj.steps.filters) {
			jsonObj.steps.filters = [{}];
		}

		jsonObj.steps.filters[0].preset = presetId;
	} else if (presetType == "decoration") {
		if (!jsonObj.steps.decorations) {
			jsonObj.steps.decorations = [{}];
		}

		jsonObj.steps.decorations[0].preset = presetId;		
	}

	return jsonObj;
}

/**
	Helper function that creates the presets view for the given presetType (filter, artifact, etc.)
	It also gets the preset images from the server and updates them, and handles the selection event
	on specific preset images.
**/
function createPresetsViewInternal(presetType, contentTag, defaultSelectionID, callback) {

	//fetch presets for the given type
	$.getJSON('/api/filters?stepType=' + presetType + "&type=preset", function(presetsList) {

		if (presetsList.length > 0) {
			var list = [];
			for (var i = 0; i < presetsList.length; i++) {
				var a = presetsList[i];

				var data = {};
				data.id = a.id;
				data.caption = a.name;
				data.image = "/images/static/progress.gif"; //start by showing the progress image

				list.push(data);
			}

			//create the strip view with the given list, and handle the selection event
			var presetsView = createHorizontalStrip("createEntry", contentTag, list, true, true, defaultSelectionID, function(id) {
				//save the preset value for later use
				savePresetValue(presetType, id);
				
				//apply the changes based on the new selection
				applyChanges(false);
			});

			if (presetsView) {
				//append the presets view to the section
				//$("#presetArtifactSection").empty().append(presetsView);

				//apply changes to reflect default selection
				//applyChanges();
				return callback(null, presetsView);
			} else {
				//showAlert("There appears to be a problem fetching data from the server.  Please try refreshing the page.", 2);
				return callback(new Error("Error fetching data from server"));
			}
		} else {
			return callback(new Error("Error fetching data from server"));
		}
	})
	.fail(function() {
		return callback(new Error("Error fetching data from server"));
	});
}

/*
	Set up the color button using the bootstrap-colorpicker module.
	Refer: https://farbelous.github.io/bootstrap-colorpicker/
*/
function setupColorButton(buttonID) {
	$(buttonID).colorpicker().on('changeColor', function(e) {
        $(buttonID).css("background", e.color.toString("rgba"));
        applyChanges(true);
    });
}

function fetchPresetValue(presetType, defaultValue) {
	var value = "";
	var map = $("body").data("selectedPresets");
	if (map == undefined) {
		map = new Map();
	}

	if (!map.has(presetType)) {
		map.set(presetType, defaultValue);
		$("body").data("selectedPresets", map);
		value = defaultValue;
	} else {
		value = map.get(presetType);
	}
		
	return value;
}

function savePresetValue(presetType, presetOptionID) {
	var map = $("body").data("selectedPresets");
	if (map == undefined) {
		map = new Map();
	}
	map.set(presetType, presetOptionID);
	$("body").data("selectedPresets", map);
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
				$("#customArtifactSection button:not(.featureToggleButton), #customArtifactSection input, #customArtifactSection select ").prop("disabled", true);
				$("#customArtifactSection .featureToggleButton").removeClass("active").text("OFF");
				break;
			case "layout":
				$("#layoutOptionsButton").data("state", "preset");
				$("#presetLayoutSection").data("selectedPresetID", presetOptionID);
				$("#customLayoutSection button:not(.featureToggleButton), #customLayoutSection input, #customLayoutSection select ").prop("disabled", true);
				$("#customLayoutSection .featureToggleButton").removeClass("active").text("OFF");
				break;
			case "filter":
				$("#filterOptionsButton").data("state", "preset");
				$("#presetFilterSection").data("selectedPresetID", presetOptionID);
				$("#customFilterSection button:not(.featureToggleButton), #customFilterSection input, #customFilterSection select ").prop("disabled", true);
				$("#customFilterSection .featureToggleButton").removeClass("active").text("OFF");
				break;
			case "decoration":
				$("#decorationOptionsButton").data("state", "preset");
				$("#presetDecorationSection").data("selectedPresetID", presetOptionID);
				$("#customDecorationSection button:not(.featureToggleButton), #customDecorationSection input, #customDecorationSection select ").prop("disabled", true);
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

	applyChanges(false);
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

/*
function showHideSection(valueToMatch, listOfValuesAndSectionIds) {
	for (var i = 0; i < listOfValuesAndSectionIds.length; i++) {
		if (valueToMatch == listOfValuesAndSectionIds[i].value) {
			$(listOfValuesAndSectionIds[i].id).show();
		} else {
			$(listOfValuesAndSectionIds[i].id).hide();
		}
	}
}
*/

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

	if (challengeId != 0) {
		jsonObj.sourceType = "challengeId";
		jsonObj.sourceData = challengeId;
	} else if (designId != 0) {
		jsonObj.sourceType = "designId";
		jsonObj.sourceData = designId;
	} else {
		var imageSrc = $("#newentryimage").data("originalSrc");
		if (imageSrc == undefined) {
			imageSrc = $("#newentryimage").prop("src");
			$("#newentryimage").data("originalSrc", imageSrc);
		}
		
		if (imageSrc.startsWith("data:image")) {
			//data uri
			jsonObj.sourceType = "dataURI";
		} else {
			//assume URL
			jsonObj.sourceType = "imageURL";
		}
		jsonObj.sourceData = imageSrc;
	}

	jsonObj.created = (new Date()).getTime();
	jsonObj.caption = $("#bannerText").prop("value");

	//extract image height and width, will be used to save in server for use for meta tags
	jsonObj.imageHeight = $("#newentryimage").data("naturalHeight");
	jsonObj.imageWidth = $("#newentryimage").data("naturalWidth");
	jsonObj.imageType = $("#newentryimage").data("imageType");

	jsonObj.steps = {}; // the main object that encapsulates filters, layouts, etc.

	/// LAYOUT
	
	var layout = {};
	var presetValue = fetchPresetValue("layout", defaultLayoutPresetSelectionID);
	if (presetValue != undefined) {
		layout.preset = presetValue;
	}
	
	//crop
	var cropData = jQuery.data(document.body, "cropData");

	if (cropData) {
		layout.crop = {x: cropData.x, y: cropData.y, width: cropData.width, height: cropData.height};
	}

		/* Future support
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
		*/

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
	//if ($("#artifactOptionsButton").data("state") == "preset") {
		var presetValue = fetchPresetValue("artifact", defaultArtifactPresetSelectionID);
		if (presetValue != undefined) {
			artifact.preset = presetValue;
		}

		artifact.banner = {caption: $("#bannerText").prop("value")}; //this is only there to allow server to account for caption text when generating image hashes
		artifact.banner.fontSize = parseInt($("#bannerTextFontSize").prop("value"));
		artifact.banner.backgroundColor = $("#bannerColorButton").css("background-color");
		artifact.banner.textColor = $("#bannerTextColorButton").css("background-color");

		/*
	} else if ($("#artifactOptionsButton").data("state") == "custom") {
			artifact.type = "custom";

			artifact.banner = {caption: $("#bannerText").prop("value")}; //this is only there to allow server to account for caption text when generating image hashes

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
	*/


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
	//console.log("generateChanges, calling POST on /api/filters/apply, jsonObj = " + JSON.stringify(jsonObj));
	$.ajax({
		type: "POST",
		url: "/api/filters/apply",
		dataType: "json",
		contentType: "application/json; charset=UTF-8",
		data: JSON.stringify(jsonObj),
		success: function(jsonData) {
				done(id, jsonData);
				//$("#newentryimage").data("captionId", jsonData.id);
				//$("#newentryimage").data("imageType", jsonData.imageType);
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
function applyChanges(refreshPresets, done) {
	var jsonObj = {};
	
	console.log("applyChanges called with refreshPresets = " + refreshPresets);
	constructJSONObject(jsonObj);
	$.ajax({
		type: "POST",
		url: "/api/filters/apply",
		dataType: "json",
		contentType: "application/json; charset=UTF-8",
		data: JSON.stringify(jsonObj),
		success: function(jsonData) {
			$("#newentryimage").attr("src", jsonData.imageData);
			if (done) {
				done();
			}
		},
		error: function(jsonData) {
			applyFailCount ++;
			if (applyFailCount == 1) {
				//try one more time
				applyChanges(refreshPresets, done);
			} else {
				//if more than once, redirect to error page and restart
				window.location.replace("/error");
			}
		}
	});

	if (refreshPresets) {
		//find the currently visible tab
		var activeTabId = $("#steps ul.nav-tabs li.active").attr("id");
		if (activeTabId == "artifactTab") {
			refreshPresetsView("artifact", "#presetArtifactSection", defaultArtifactPresetSelectionID, "presets");
		} else if (activeTabId == "layoutTab") {
			refreshPresetsView("layout", "#presetLayoutSection", defaultLayoutPresetSelectionID, "presets");
		} else if (activeTabId == "filterTab") {
			refreshPresetsView("filter", "#presetFilterSection", defaultFilterPresetSelectionID, "presets");
		} else if (activeTabId == "decorationTab") {
			refreshPresetsView("decoration", "#presetDecorationSection", defaultDecorationPresetSelectionID, "presets");
		}
	}
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
    	window.open("/entry/" + data.id, "_self");
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



