

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
var gSessionList = new Map();

/*
	Start a new Fetching on Scroll session
	sessionKey is a string that identifies the particular workflow.  It will be ensured
	that no more than one session can co-exist for the same sessionKey at any time.
	This is to avoid redundant client/server communication.
*/
function startFetchOnScroll(getURL, processData, done, sessionKey) {
	var sessionID = Math.random();
	gSessionList.set(sessionKey, sessionID);
	fetchNextBatchOnScroll(getURL, processData, done, sessionKey, sessionID);
}

function endFetchOnScrollSession(sessionKey) {
	gSessionList.delete(sessionKey);
}

function logMapElements(value, key, map) {
    console.log(`m[${key}] = ${value}`);
}
/*
	Fetch batchwise data from the given getURL
	Data is fetched only if the user is scrolling beyond 90% scroll position
	processData: called with the list from the next batch
	done: called when you're finished processing all data
*/
function fetchNextBatchOnScroll(getURL, processData, done, sessionKey, sessionID) {
	//console.log("fetchNextBatchOnScroll, sessionKe: " + sessionKey + ", sessionID: " + sessionID + ", map:");
	//gSessionList.forEach(logMapElements);

	if (sessionID != gSessionList.get(sessionKey)) {
		return done(new Error("Ending session mid-way"));
	}

	$.getJSON(getURL, function(output) {
		if (sessionID != gSessionList.get(sessionKey)) {
			return done(new Error("Ending session mid-way"));
		}

		//console.log('calling processData with list: ' + JSON.stringify(output.list));
		processData(output.list);
		if (output.list.length <= 0) {
			endFetchOnScrollSession(sessionKey);
			return done(null);
		}

		var bodyHeight = $(document).height() - $(window).height();
		if (bodyHeight <= 0) {
			//If the content is not able to fill the entire page, fetch more content
			getURL = updateQueryStringParameter(getURL, "ts", output.ts);
			fetchNextBatchOnScroll(getURL, processData, done, sessionKey, sessionID);
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
					fetchNextBatchOnScroll(getURL, processData, done, sessionKey, sessionID);
				}
			});
		}
	})
	.fail(function() {
		return done(new Error("getJSON failed for URL: " + getURL));
	});
}