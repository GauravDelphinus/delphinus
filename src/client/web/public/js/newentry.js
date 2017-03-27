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

	$("input[type=checkbox][name=effects]").change(applyChanges);


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

	//alert("contrast default value is " + $("#contrast").prop("defaultValue") + ", actual selected value is " + $("#contrast").val());
	
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