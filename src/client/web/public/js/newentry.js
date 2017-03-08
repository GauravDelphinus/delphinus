$(document).ready(function(){
	console.log("setting image source to " + challengeId);
	$("#newentryimage").attr("src", "/challenges/images/" + challengeId);

	document.getElementById("apply").onclick = applyChanges;
	//$.getJSON('/api/filters/apply/' + challengeId, parseEntry);

	$(":checkbox").change(applyChanges);
});

function applyChanges() {
	//alert("applyChanges called");
	var jsonObj = {};
	jsonObj.imageSource = "challengeId"; // Can be "url" | "challenge" | "blob"
										// url is path to any web url
										// challengeId is the challengeId
										// blob is the base64 encoded version of the image data itself
	jsonObj.imageData = challengeId;
	jsonObj.filters = [];

	var i = 0;
	if ($("#checkPaint").prop("checked")) {
		jsonObj.filters[i++] = {type: "effects", effectType: "preset", preset: "paint"};
	}
	if ($("#checkGrayscale").prop("checked")) {
		jsonObj.filters[i++] = {type: "effects", effectType: "preset", preset: "grayscale"};
	}
	if ($("#checkMosaic").prop("checked")) {
		jsonObj.filters[i++] = {type: "effects", effectType: "preset", preset: "mosaic"};
	}
	if ($("#checkNegative").prop("checked")) {
		jsonObj.filters[i++] = {type: "effects", effectType: "preset", preset: "negative"};
	}
	if ($("#checkSolarize").prop("checked")) {
		jsonObj.filters[i++] = {type: "effects", effectType: "preset", preset: "solarize"};
	}
	if ($("#checkMonochrome").prop("checked")) {
		jsonObj.filters[i++] = {type: "effects", effectType: "preset", preset: "monochrome"};
	}
	if ($("#checkSwirl").prop("checked")) {
		jsonObj.filters[i++] = {type: "effects", effectType: "preset", preset: "swirl"};
	}
	if ($("#checkWave").prop("checked")) {
		jsonObj.filters[i++] = {type: "effects", effectType: "preset", preset: "wave"};
	}
	if ($("#checkSpread").prop("checked")) {
		jsonObj.filters[i++] = {type: "effects", effectType: "preset", preset: "spread"};
	}
	if ($("#checkCharcoal").prop("checked")) {
		jsonObj.filters[i++] = {type: "effects", effectType: "preset", preset: "charcoal"};
	}


	//alert("json is " + JSON.stringify(jsonObj));

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


function parseEntry(entry) {
	$("#entry").empty();
	$("#entry").append($("<img>").attr("src", entry.image));
	$("#entry").append($("<p>").text(entry.caption));
	$("#entry").append($("<p>").text(entry.created));
}