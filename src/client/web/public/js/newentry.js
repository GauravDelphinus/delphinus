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
	    	$("#steps").show();
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
		setImageHeight();
	});

	//listen to window resize events
	$(window).bind('resize', setImageHeight);
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

/**************************** (4) FILTER STEP **********************************************/

var defaultFilterPresetSelectionID = "noFilter"; //NOTE: must match one of the values in presets.json

function setupFilterStep() {
	createPresetsView("filter", "#presetFilterSection", defaultFilterPresetSelectionID, "presets");
}

/**************************** (5) DECORATION STEP **********************************************/

function setupDecorationStep() {
	setupBorderToggleSection();
}

function setupBorderToggleSection() {
	setupColorButton("#borderColor");

	setChangeCallback(changeCallback, ["#borderColor", "#borderWidth"], []);
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

/**
	Fetch the preset value for the given type.

	This will return the last user selected value during this session.

	presetType: one of artifact, filter, layout or decoration
	defaultValue: a default value to be returned if no previous setting was found
**/
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

/**
	Save the provided preset value for the given presetType

	presetType: one of artifact, filter, layout or decoration
	presetOptionID: value to be set

	NOTE: This should match a valid value listed in presets.json
**/
function savePresetValue(presetType, presetOptionID) {
	var map = $("body").data("selectedPresets");
	if (map == undefined) {
		map = new Map();
	}
	map.set(presetType, presetOptionID);
	$("body").data("selectedPresets", map);
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

	// ARTIFACTS -------------------------------------
	var artifact = {};
	var presetValue = fetchPresetValue("artifact", defaultArtifactPresetSelectionID);
	if (presetValue != undefined) {
		artifact.preset = presetValue;
	}

	artifact.banner = {caption: $("#bannerText").prop("value")}; //this is only there to allow server to account for caption text when generating image hashes
	artifact.banner.fontSize = parseInt($("#bannerTextFontSize").prop("value"));
	artifact.banner.backgroundColor = $("#bannerColorButton").css("background-color");
	artifact.banner.textColor = $("#bannerTextColorButton").css("background-color");

	if (!$.isEmptyObject(artifact)) {
		jsonObj.steps.artifacts = [];
		jsonObj.steps.artifacts.push(artifact);
	}

	/// LAYOUT -----------------------------------------
	
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

	if (!$.isEmptyObject(layout)) {
		jsonObj.steps.layouts = [];
		jsonObj.steps.layouts.push(layout);
	}

	/// FILTERS ----------------------------------------
	var filter = {};

	var presetValue = fetchPresetValue("filter", defaultFilterPresetSelectionID);
	if (presetValue != undefined) {
		filter.preset = presetValue;
	}
	
	if (!$.isEmptyObject(filter)) {
		jsonObj.steps.filters = [];
		jsonObj.steps.filters.push(filter);
	}
	
	// DECORATIONS -------------------------------------
	var decoration = {};

	decoration.border = {};

	decoration.border.width = $("#borderWidth").val();
	decoration.border.color = $("#borderColor").css("background-color");

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



