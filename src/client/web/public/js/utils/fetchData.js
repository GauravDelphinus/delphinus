

/************** FETCH BATCH WISE DATA, NO SCROLL DEPENDENCY *********/

/*
	Fetch batchwise data from the given getURL
	processData: called with the list from the next batch
	done: called when you're finished processing all data
*/
function fetchNextBatch(getURL, processData, done) {
	$.getJSON(getURL, function(output) {
		processData(output.list);
		if (output.list.length <= 0) {
			return done(null);
		}

		getURL = updateQueryStringParameter(getURL, "ts", output.ts);
		fetchNextBatch(getURL, processData, done);
	})
	.fail(function() {
		return done(new Error("getJSON failed for URL: " + getURL));
	});
}

/************** FETCH BATCH WISE DATA ON SCROLL ********************/
var gSessionID = 0;
function startFetchOnScroll(getURL, processData, done) {
	gSessionID = Math.random();
	fetchNextBatchOnScroll(getURL, processData, done, gSessionID);
}

/*
	Fetch batchwise data from the given getURL
	Data is fetched only if the user is scrolling beyond 90% scroll position
	processData: called with the list from the next batch
	done: called when you're finished processing all data
*/
function fetchNextBatchOnScroll(getURL, processData, done, sessionID) {
	if (sessionID != gSessionID) {
		return done(new Error("Ending session mid-way"));
	}

	$.getJSON(getURL, function(output) {
		if (sessionID != gSessionID) {
			return done(new Error("Ending session mid-way"));
		}

		processData(output.list);
		if (output.list.length <= 0) {
			return done(null);
		}

		var bodyHeight = $(document).height() - $(window).height();
		if (bodyHeight <= 0) {
			//If the content is not able to fill the entire page, fetch more content
			getURL = updateQueryStringParameter(getURL, "ts", output.ts);
			fetchNextBatchOnScroll(getURL, processData, done, sessionID);
		} else {
			//content is fitting the page, so now rely on scroll events to decide when to fetch more content
			$(window).scroll(function() {
				// Fetch variables

				var scrollTop = $(document).scrollTop();
				var bodyHeight = $(document).height() - $(window).height();
				var scrollPercentage = (scrollTop / bodyHeight);
				// if the scroll is more than 90% from the top, load more content.
				if(scrollPercentage > 0.9) {
					// Load content
					$(window).unbind('scroll');

					getURL = updateQueryStringParameter(getURL, "ts", output.ts);
					fetchNextBatchOnScroll(getURL, processData, done, sessionID);
				}
			});
		}
	})
	.fail(function() {
		return done(new Error("getJSON failed for URL: " + getURL));
	});
}