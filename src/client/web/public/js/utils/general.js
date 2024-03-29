function extractImage(files, callback) {

    // files is a FileList of File objects. List some properties.
    var output = [];
    for (var i = 0, f; f = files[i]; i++) {
    	// Only process image files.
      if (!f.type.match('image.*')) {
      	//alert("not an image");
        continue;
      }

      var reader = new FileReader();

      // Closure to capture the file information.
      reader.onload = (function(theFile) {
        return function(e) {

          //// resizing code
          var img = new Image();

          img.onload = function() {
            var canvas = document.createElement('canvas');
            var ctx = canvas.getContext('2d');
            canvas.width = Math.min(img.width, 1200); // TBD - max width of image, see if we can pass this value down from somewhere
            canvas.height = canvas.width * (img.height / img.width);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            // SEND THIS DATA TO WHEREVER YOU NEED IT
            var data = canvas.toDataURL('image/png');

            //$('#challengeImage').prop('src', img.src);
            /*
            $("#challengeImage").prop("src", data);
            */
            callback(data, e.target.result, escape(theFile.name), theFile.type);
          }
          /// resizing code

          // Render image.

          
          img.src = e.target.result;
          /*
          $("#challengeImage").prop("src", e.target.result);
          $("#challengeImage").prop("title", escape(theFile.name));
          $("#selectImage").hide();
          */

          
        };
      })(f);

      // Read in the image file as a data URL.
      reader.readAsDataURL(f);
    }
}

function formatTime(type, value) {
	if (type == "day") {
		if (value == 1) {
			return "a day ago";
		} else if (value > 1) {
			return value + " days ago";
		}
	} else if (type == "hour") {
		if (value == 1) {
			return "an hour ago";
		} else if (value > 1) {
			return value + " hours ago";
		}
	} else if (type == "minute") {
		if (value == 1) {
			return "a minute ago";
		} else if (value > 1) {
			return value + " minutes ago";
		}
	}
}

function formatDate(input) {
	var date = new Date(parseInt(input));

	var dayList = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
	var monthList = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

	var today = new Date();
	var numHours = numHoursBetween(today, date);
	var numDays = numDaysBetween(today, date);
	var numMinutes = numHours * 60;
	var output;
	if (numMinutes < 2) {
		output = "just now";
	} else if (numMinutes < 5) {
		output = "moments ago";
	} else if (numMinutes < 60) {
		output = formatTime("minute", Math.floor(numMinutes));
	} else if (numHours < 30) {
		// show in hours ago format
		output = formatTime("hour", Math.floor(numHours));
	} else if (numDays < 5) {
		//if posted less than 5 days ago, say something like "4 days ago"
		output = formatTime("day", Math.floor(numDays));
	} else {
		//post something like "Sunday, May 12, 2017"
		var day = dayList[date.getDay()];
		var month = monthList[date.getMonth()];
		var dateValue = date.getDate();
		var year = date.getFullYear();

		output = day + ", " + month + " " + dateValue + ", " + year;
	}
	
	return output;
}

function numHoursBetween(d1, d2) {
	var diff = Math.abs(d1.getTime() - d2.getTime());
	return diff / (1000 * 60 * 60);
}

function numDaysBetween (d1, d2) {
	var diff = Math.abs(d1.getTime() - d2.getTime());
	return diff / (1000 * 60 * 60 * 24);
};

//$('#' + parentId + 'Tabs a[href="#comments"]').tab('show');
function setupTabRedirection(id) {
	// Javascript to enable link to tab
	var url = document.location.toString();
	if (url.match('#')) {
		var hash = url.split('#')[1];
	    $('#' + id + 'Tabs a[href="#' + hash + '"]').tab('show');
	} //add a suffix

	// Change hash for page-reload
	$('.nav-tabs a').on('shown.bs.tab', function (e) {
	    window.location.hash = e.target.hash;
	});
}

/*
	Get the full hostname for the current page, including protocol, hostname, and port (if any)
*/
function getHostnameForCurrentPage() {
	var hostname = location.protocol+'//'+location.hostname+(location.port ? ':'+location.port: '');
	return hostname;
}

function getFullPathForCurrentPage() {
	var fullPath = window.location.protocol + "//" + window.location.hostname+(window.location.port ? ':'+ window.location.port: '') + window.location.pathname;
	return fullPath;
}

//courtesy: https://stackoverflow.com/questions/5999118/how-can-i-add-or-update-a-query-string-parameter
/*
	Update the URI with the new key/value pair.  If already present, it will update the value
	otherwise it will add this to the URI
*/
function updateQueryStringParameter(uri, key, value) {
  var re = new RegExp("([?&])" + key + "=.*?(&|$)", "i");
  var separator = uri.indexOf('?') !== -1 ? "&" : "?";
  if (uri.match(re)) {
    return uri.replace(re, '$1' + key + "=" + value + '$2');
  }
  else {
    return uri + separator + key + "=" + value;
  }
}
