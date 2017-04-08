$(document).ready(function(){
	 document.getElementById('files').addEventListener('change', handleFileSelect, false);

	   // Setup the dnd listeners.
  var dropZone = document.getElementById('dropzone');
  dropZone.addEventListener('dragover', handleDragOver, false);
  dropZone.addEventListener('drop', handleFileDropped, false);

  $("#postChallenge").click(postChallenge);

  // canvas resizing of image
  /*
  var canvas = document.getElementById("canvas");
  var ctx = canvas.getContext("2d");

  img = new Image();
  img.onload = function () {

    canvas.height = canvas.width * (img.height / img.width);

    /// step 1
    var oc = document.createElement('canvas'),
        octx = oc.getContext('2d');

    oc.width = img.width * 0.5;
    oc.height = img.height * 0.5;
    octx.drawImage(img, 0, 0, oc.width, oc.height);

    /// step 2
    octx.drawImage(oc, 0, 0, oc.width * 0.5, oc.height * 0.5);

    ctx.drawImage(oc, 0, 0, oc.width * 0.5, oc.height * 0.5,
    0, 0, canvas.width, canvas.height);
  }
  //img.src = "http://i.imgur.com/SHo6Fub.jpg";
  */
});

function handleFileDropped(evt) {
	evt.stopPropagation();
    evt.preventDefault();

    extractImage(evt.dataTransfer.files); // FileListobject
}

function handleFileSelect(evt) {
  	extractImage(evt.target.files); // FileList object
  }

  function extractImage(files) {

    // files is a FileList of File objects. List some properties.
    var output = [];
    for (var i = 0, f; f = files[i]; i++) {
    	// Only process image files.
      if (!f.type.match('image.*')) {
      	alert("not an image");
        continue;
      }

      var reader = new FileReader();

      // Closure to capture the file information.
      reader.onload = (function(theFile) {
        return function(e) {
          // Render image.

          $("#challengeImage").prop("src", e.target.result);
          $("#challengeImage").prop("title", escape(theFile.name));
          $("#selectImage").hide();
        };
      })(f);

      // Read in the image file as a data URL.
      reader.readAsDataURL(f);
    }
  }

  function handleDragOver(evt) {
    evt.stopPropagation();
    evt.preventDefault();
    evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
  }

function postChallenge() {
	var jsonObj = {};
	jsonObj.imageDataURI = $("#challengeImage").attr("src");
	jsonObj.caption = $("#caption").val();
	jsonObj.created = (new Date()).getTime();

	$.ajax({
		type: "POST",
		url: "/api/challenges",
		dataType: "json", // return data type
		contentType: "application/json; charset=UTF-8",
		data: JSON.stringify(jsonObj)
	})
	.done(function(data, textStatus, jqXHR) {
		//alert("Challenge posted successfully, challenge id = " + data._id);
    window.open("/challenge/" + data._id, "_self");
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