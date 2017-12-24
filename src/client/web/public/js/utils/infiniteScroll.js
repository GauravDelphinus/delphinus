/*
	INFINITE SCROLL SUPPORT
	-----------------------

	getURL - the URL that is used to fetch new content
	lastFetchedTimestamp - the timestamp we got returned from the server from the last fetch
	(next time we fetch, we need items older than that timestamp)
	updateContent - callback function to be called with the newly fetched list
*/
var watchScrolls = false; // Global Variable - to determine if we need to actively monitor scrolls (set to false when we are already in the midst of fetching new content to avoid duplication)
var lastFetchedTimestamp = 0; // Global Variable - used to track the value of the timestamp to be used for fetching the next batch of content
function startInfiniteScroll(getURL, lastFetchedTimestamp, updateContent) {
	watchScrolls = true;
	$(window).scroll(function() {
		// Fetch variables

		if (!watchScrolls) {
			return;
		}

		var scrollTop = $(document).scrollTop();
		var bodyHeight = $(document).height() - $(window).height();
		var scrollPercentage = (scrollTop / bodyHeight);

		// if the scroll is more than 90% from the top, load more content.
		if(scrollPercentage > 0.9) {
			// Load content
			watchScrolls = false;
			getURL = updateQueryStringParameter(getURL, "ts", lastFetchedTimestamp);
			$.getJSON(getURL, function(output) {
				if (output.ts > 0) {
					updateContent(output.list);

					watchScrolls = true;
					lastFetchedTimestamp = output.ts;
				} else {
					//no longer need to listen to scrolls
					endInfiniteScroll();
				}
			});
		}
	});
}

/*
	End the scroll - reset global variables to their default values
*/
function endInfiniteScroll() {
	$(window).unbind('scroll');
	watchScrolls = false;
	lastFetchedTimestamp = 0;
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