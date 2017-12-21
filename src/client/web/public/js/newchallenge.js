$(document).ready(function(){
	//set up all event handlers
	setupHandlers();

	//set up categories
	setupCategories();
});

/**
	Set up event handlers
**/
function setupHandlers() {
	// Setup the dnd listeners.
	var dropZone = document.getElementById('dropzone');
	dropZone.addEventListener('dragover', handleDragOver, false);
	dropZone.addEventListener('drop', handleFileDropped, false);

	//handler for file Browse button
	document.getElementById('files').addEventListener('change', handleFileSelect, false);

	// Post challenge button
	$("#postChallenge").click(postChallenge);
}

/**
	Fetch available categories and populate the categories drop down
**/
function setupCategories() {
	$.getJSON('/api/categories/', function(data) {
		for (var i = 0; i < data.length; i++) {
			var option = $("<option>", {"value": data[i].id});
			option.text(data[i].name);
			$("#categoryList").append(option);
		}
	})
	.fail(function() {
		window.location.replace("/error");
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
	//show the image, and hide the drag/drop view
	$("#challengeImage").prop("src", path);
	$("#challengeImage").prop("title", title);
	$("#selectImage").hide();

	//show the remaining sections
	$("#descriptionSection").show();
	$("#categorySection").show();
	$("#postSection").show();
	$("#caption").blur().focus(); //make sure to set focus into the challenge message text area

	//show the share section
	if (user.facebook || user.twitter) {
  		$("#shareSection").show();
  		if (user.facebook) {
  			$("#shareFacebookSection").show();
  		}
  		if (user.twitter) {
  			$("#shareTwitterSection").show();
  		}	
  	} else {
  		$("#shareSection").hide();
  	}
}

/**
	Post the challenge to the server
**/
var failCount = 0;
function postChallenge() {
	//construct the json object to be posted
	var jsonObj = {};
	jsonObj.imageDataURI = $("#challengeImage").attr("src"); //image data
	jsonObj.caption = $("#caption").val(); //challenge message
	jsonObj.created = (new Date()).getTime(); //created time
	jsonObj.category = $("#categoryList option:selected").val(); //category id

	//finally, make the call to the server
	$.ajax({
		type: "POST",
		url: "/api/challenges",
		dataType: "json", // return data type
		contentType: "application/json; charset=UTF-8",
		data: JSON.stringify(jsonObj)
	})
	.done(function(data, textStatus, jqXHR) {
		//if the challenge was posted successfully, redirect to the newly created challenge page
    	window.location.replace("/challenge/" + data.id);
	})
	.fail(function(jqXHR, textStatus, errorThrown) {
		failCount ++;

		if (failCount == 1) {
			//in case of some failure, allow the user another chance at posting by clicking the Post Challenge button again
			alert("Oops.. Something prevented us from posting your Challenge.  Please try again.");
		    $("#postChallenge").prop("value", "Post");
		    $("#postChallenge").prop("disabled", false);
		} else {
			window.location.replace("/error");
		}
	});

	//as soon as the user clicks Post Challenge button, disable the button to prevent multiple clicks
	//change button to 'posting ...'
	$("#postChallenge").prop("value", "Posting...");
	$("#postChallenge").prop("disabled", true);
}