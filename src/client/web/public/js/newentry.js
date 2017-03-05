$(document).ready(function(){
	console.log("setting image source to " + challengeId);
	$("#newentryimage").attr("src", "/challenges/images/" + challengeId);

	document.getElementById("apply").onclick = applyChanges;
	//$.getJSON('/api/filters/apply/' + challengeId, parseEntry);
});

function applyChanges() {
	var jsonObj = {};
	jsonObj.imageSource = "challengeId"; // Can be "url" | "challenge" | "blob"
										// url is path to any web url
										// challengeId is the challengeId
										// blob is the base64 encoded version of the image data itself
	jsonObj.imageData = challengeId;
	jsonObj.filters = [{type: "effects", "effectType" : "preset"}];

	if ($("#radioPaint").prop("checked")) {
		jsonObj.filters[0].preset = "paint";
	}
	if ($("#radioGrayscale").prop("checked")) {
		jsonObj.filters[0].preset = "grayscale";
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
			$("#newentryimage").attr("src", jsonData.image);
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