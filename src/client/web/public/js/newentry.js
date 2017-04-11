$(document).ready(function(){
	console.log("setting image source to " + challengeId);
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

	//$.getJSON('/api/filters/apply/' + challengeId, parseEntry);

	$("#contrast").change(function() {
		$("#contrastValue").text($("#contrast").val());
		applyChanges();
	});
	$("#brightness").change(function() {
		$("#brightnessValue").text($("#brightness").val());
		applyChanges();
	});
	$("#hue").change(function() {
		$("#hueValue").text($("#hue").val());
		applyChanges();
	});
	$("#saturation").change(function() {
		$("#saturationValue").text($("#saturation").val());
		applyChanges();
	});

	$("input[type=checkbox][name=effects]").change(applyChanges);
	$("input[type=checkbox][name=layout]").change(applyChanges);
	$("input[type=radio][name=flip]").change(applyChanges);


	$("input[type=range]").change(applyChanges);

	// Set default selection to 'preset'
	//$("input:radio[name=effect]").filter("[value=none]").prop("checked", true);

	$("input[type=radio][name=filter]").change(function() {
		if (this.value == 'none') {
			$("#presetSection").hide();
			$("#userDefinedSection").hide();
			$("#customSection").hide();
		} else if (this.value == "preset") {
			$("#presetSection").show();
			$("#userDefinedSection").hide();
			$("#customSection").hide();
		} else if (this.value == "user_defined") {
			$("#presetSection").hide();
			$("#userDefinedSection").show();
			$("#customSection").hide();
		} else if (this.value == "custom") {
			$("#presetSection").hide();
			$("#userDefinedSection").hide();
			$("#customSection").show();
		}
	});

	$("input[type=radio][name=size]").change(function() {
		if (this.value == "autoSize") {
			$("#textSizeWidth").hide();
			$("#textSizeHeight").hide();
		} else if (this.value == "customSize") {
			$("#textSizeWidth").show();
			$("#textSizeHeight").show();
		}
	});

	// ARTIFACTS
	$("input[type=checkbox][name=artifact]").change(function() {
		if ($("#checkboxBanner").prop("checked")) {
			$("#bannerSection").show();
		} else {
			$("#bannerSection").hide();
		}
	});

	$("input[type=radio][name=artifact]").change(function() {
		if (this.value == 'none') {
			$("#customArtifacts").hide();
		} else if (this.value == "preset") {
			$("#customArtifacts").hide();
		} else if (this.value == "user_defined") {
			$("#customArtifacts").hide();
		} else if (this.value == "custom") {
			$("#customArtifacts").show();
		}
	});
});

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

	if ($("#checkboxFlip").prop("checked")) {
		layout.type = "custom";
		if ($("#radioFlipHorizontally").prop("checked")) {
			layout.mirror = "flop";
		} else if ($("#radioFlipVertically").prop("checked")) {
			layout.mirror = "flip";
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

		if ($("#radioRainyDay").prop("checked")) {
			filter.preset = "rainy_day";
		} else if ($("#radioSolaris").prop("checked")) {
			filter.preset = "solaris";
		} else if ($("#radioNightingale").prop("checked")) {
			filter.preset = "nightingale";
		} else if ($("#radioRedGlory").prop("checked")) {
			filter.preset = "red_glory";
		} else if ($("#radioComical").prop("checked")) {
			filter.preset = "comical";
		} 
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

	var artifact = {};

	if ($("#radioArtifactNone").prop("checked")) {
		artifact.type = "none";
	} else if ($("#radioArtifactPreset").prop("checked")) {
		artifact.type = "preset";
	} else if ($("#radioArtifactUserDefined").prop("checked")) {
		artifact.type = "user_defined";
	} else if ($("#radioArtifactCustom").prop("checked")) {
		artifact.type = "custom";
	}

	if ($("#checkboxBanner").prop("checked")) {
		artifact.banner = {};
		artifact.banner.text = $("#textBanner").prop("value");

		if ($("#radioBannerLocationBottom").prop("checked")) {
			artifact.banner.location = "bottom";
		} else if ($("#radioBannerLocationTop").prop("checked")) {
			artifact.banner.location = "top";
		}
	}

	jsonObj.steps.artifacts.push(artifact);
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

