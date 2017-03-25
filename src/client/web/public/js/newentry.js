$(document).ready(function(){
	console.log("setting image source to " + challengeId);
	$("#newentryimage").attr("src", "/challenges/images/" + challengeId);

	document.getElementById("apply").onclick = postEntry;
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

	$("input[type=radio][name=preset]").change(applyChanges);


	$("input[type=range]").change(applyChanges);

	// Set default selection to 'preset'
	//$("input:radio[name=effect]").filter("[value=none]").prop("checked", true);

	$("input[type=radio][name=effect]").change(function() {
		if (this.value == 'none') {
			$("#presetSection").hide();
			$("#userDefinedSection").hide();
		} else if (this.value == "preset") {
			$("#presetSection").show();
			$("#userDefinedSection").hide();
		} else if (this.value == "user_defined") {
			$("#presetSection").hide();
			$("#userDefinedSection").show();
		}
	});
});

function constructJSONObject(jsonObj) {
	jsonObj.imageSource = "challengeId"; // Can be "url" | "challenge" | "blob"
										// url is path to any web url
										// challengeId is the challengeId
										// blob is the base64 encoded version of the image data itself
	jsonObj.imageData = challengeId;
	jsonObj.challengeId = challengeId;
	jsonObj.created = (new Date()).getTime();
	jsonObj.filters = [];

	var filter = {};

	// ADD EFFECTS
	filter.effects = {};
	if ($("#radioNone").prop("checked")) { // NO EFFECTS
		filter.effects.type = "none";
	} else if ($("#radioPreset").prop("checked")) { // PRESET EFFECTS
		filter.effects.type = "preset";

		if ($("#radioPaint").prop("checked")) {
			filter.effects.preset = "paint";
			filter.effects.paint = {radius: $("#rangePaint").val() };
		} else if ($("#radioGrayscale").prop("checked")) {
			filter.effects.preset = "grayscale";
		} else if ($("#radioMosaic").prop("checked")) {
			filter.effects.preset = "mosaic";
		} else if ($("#radioNegative").prop("checked")) {
			filter.effects.preset = "negative";
		} else if ($("#radioSolarize").prop("checked")) {
			filter.effects.preset = "solarize";
			filter.effects.solarize = {threshold: $("#rangeSolarize").val()};
		} else if ($("#radioMonochrome").prop("checked")) {
			filter.effects.preset = "monochrome";
		} else if ($("#radioSwirl").prop("checked")) {
			filter.effects.preset = "swirl";
			filter.effects.swirl = {degrees: $("#rangeSwirl").val()};
		} else if ($("#radioWave").prop("checked")) {
			filter.effects.preset = "wave";
			filter.effects.wave = {amplitude : $("#rangeWaveAmp").val(), wavelength: $("#rangeWaveLength").val()};
		} else if ($("#radioSpread").prop("checked")) {
			filter.effects.preset = "spread";
			filter.effects.spread = {amount : $("#rangeSpread").val()};
		} else if ($("#radioCharcoal").prop("checked")) {
			filter.effects.preset = "charcoal";
			filter.effects.charcoal = {factor: $("#rangeCharcoal").val()};
		}
	} else if ($("#radioUserDefined").prop("checked")) { // USER DEFINED EFFECTS
		filter.effects.type = "user_defined";
		filter.effects.user_defined = 10; // ID of user defined filter
	}

	// ADD SETTINGS
	filter.settings = {};
	filter.settings.contrast = $("#contrast").val();
	filter.settings.brightness = $("#brightness").val();
	filter.settings.hue = $("#hue").val();
	filter.settings.saturation = $("#saturation").val();

	jsonObj.filters.push(filter);
}

function applyChanges() {
	//alert("applyChanges called");
	var jsonObj = {};
	
	constructJSONObject(jsonObj);

	//alert("json is: " + JSON.stringify(jsonObj));

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

	constructJSONObject(jsonObj);

	$.ajax({
		type: "POST",
		url: "/api/entries",
		dataType: "json",
		contentType: "application/json; charset=UTF-8",
		data: JSON.stringify(jsonObj),
		success: function(jsonData) {
			alert("success, data is " + jsonData);

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