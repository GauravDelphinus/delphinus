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

          //// resizing code
          var img = new Image();

          img.onload = function() {
            console.log("image.onload called");
            var canvas = document.createElement('canvas');
            var ctx = canvas.getContext('2d');
            canvas.width = Math.min(img.width, 1200); // TBD - max width of image, see if we can pass this value down from somewhere
            canvas.height = canvas.width * (img.height / img.width);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            // SEND THIS DATA TO WHEREVER YOU NEED IT
            var data = canvas.toDataURL('image/png');

            //$('#challengeImage').prop('src', img.src);
            $("#challengeImage").prop("src", data);
          }
          /// resizing code

          // Render image.

          img.src = e.target.result;
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