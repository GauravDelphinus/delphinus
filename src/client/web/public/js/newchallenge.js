$(document).ready(function(){
	 document.getElementById('files').addEventListener('change', handleFileSelect, false);

	   // Setup the dnd listeners.
  var dropZone = document.getElementById('dropzone');
  dropZone.addEventListener('dragover', handleDragOver, false);
  dropZone.addEventListener('drop', handleFileDropped, false);

  $("#postChallenge").click(postChallenge);
  $("#goToHomePage").click(function() {
      window.open("/", "_self");
  });

  createLoginHeader();

  setupCategories();
});

function setupCategories() {
	$.getJSON('/api/categories/', function(data) {
		for (var i = 0; i < data.length; i++) {
			var option = $("<option>", {"value": data[i].id});
			option.text(data[i].name);
			$("#categoryList").append(option);
		}

		setupSubCategories($("#categoryList option:selected").val());
	});

	$("#categoryList").on("change", function() {
		setupSubCategories(this.value);
	});
}

function setupSubCategories(categoryId) {
	$("#subCategoryList").empty();
	$.getJSON('/api/categories?category=' + categoryId, function(data) {
		for (var i = 0; i < data.length; i++) {
			var option = $("<option>", {"value": data[i].id});
			option.text(data[i].name);

			$("#subCategoryList").append(option);
		}
	});
}

function handleFileDropped(evt) {
	evt.stopPropagation();
    evt.preventDefault();

    extractImage(evt.dataTransfer.files, handleFileSelected);
}

function handleFileSelected(data, path, title, type) {
  $("#challengeImage").prop("src", path);
  $("#challengeImage").prop("title", title);
  $("#challengeImage").data("imageType", type);
  $("#selectImage").hide();
}

function handleFileSelect(evt) {
  	extractImage(evt.target.files, handleFileSelected); // FileList object
  }


  function handleDragOver(evt) {
    evt.stopPropagation();
    evt.preventDefault();
    evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
  }

function postChallenge() {
	var jsonObj = {};
	jsonObj.imageDataURI = $("#challengeImage").attr("src");
	jsonObj.imageType = $("#challengeImage").data("imageType");
	jsonObj.caption = $("#caption").val();
	jsonObj.created = (new Date()).getTime();
	jsonObj.category = $("#subCategoryList option:selected").val();

	$.ajax({
		type: "POST",
		url: "/api/challenges",
		dataType: "json", // return data type
		contentType: "application/json; charset=UTF-8",
		data: JSON.stringify(jsonObj)
	})
	.done(function(data, textStatus, jqXHR) {
		//alert("Challenge posted successfully, challenge id = " + data._id);
    window.open("/challenge/" + data.id, "_self");
	})
	.fail(function(jqXHR, textStatus, errorThrown) {
		alert("some error was found, " + errorThrown);
    $("#postChallenge").prop("value", "Post");
    $("#postChallenge").prop("disabled", false);
	});

  //change button to 'posting ...'
  console.log("changing button state... ");
  $("#postChallenge").prop("value", "Posting...");
  $("#postChallenge").prop("disabled", true);
  console.log("after changing button state");
}