/**************************** TIME LAPSE VIEW ***************************/

function createTimeLapseProgressSectionElement(data, contentTag) {
	var timelapseProgressSection = $("<div>", {id: contentTag + data.id + "TimeLapseProgressSection", class: "timelapseProgressSection"});
	var rangeSelector = $("<input>", {id: contentTag + data.id + "TimelapseRange", class: "timelapseRange", type: "range", min:"0", max:""})
	rangeSelector.prop("disabled", true);
	timelapseProgressSection.append(rangeSelector);
	timelapseProgressSection.hide();
	return timelapseProgressSection;
}

var timelapseIndexMap = {}; //indeces of the frames, mapped by entity id
var timelapseTimerMap = {}; //timer that advances the frames, mapped by entity id
var rangeUpdateTimerMap = {}; //timer that updates the range (progress) indicator, mapped by entity id
var rangeUpdateCountMap = {}; //counter to keep track of range updates, mapped by entity id

/*
	Start the Time Lapse view (usually at the click of a button)
	entityId: ID of entry, etc. that the timelapse view is associated with
	data: data containing the list of images that need to be played
	format of data:
	[
		{
			"imageType" : "url" or "imageData",
			"imageData" : actual url or base64 encoded image data
		}
	]
*/
function startTimelapse(entityId, contentTag, data) {
	//console.log("startTimelapse: entityId = " + entityId + ", data is: " + JSON.stringify(data));
	timelapseIndexMap[entityId] = 0;
	rangeUpdateCountMap[entityId] = 0;

	//console.log("####### startTimeLapse, entityId: " + entityId + ", timelapseIndexMap[entityId] = " + timelapseIndexMap[entityId]);

	//show the slider view
	$("#" + contentTag + entityId + "TimeLapseProgressSection").show();
	$("#" + contentTag + entityId + "TimelapseRange").attr("max", "" + (data.length - 1) * 2000)

	timelapseTimerMap[entityId] = window.setInterval(function() {nextTimelapse(entityId, contentTag, data);}, 2000); //progress frames every 2 seconds
	rangeUpdateTimerMap[entityId] = window.setInterval(function() {updateTimelapseRange(entityId, contentTag)}, 10); //update range progress every 10 milliseconds (for smoother movement)
	
	//set the ball rolling
	nextTimelapse(entityId, contentTag, data);
}

/*
	Timer callback that updates the progress / range
*/
function updateTimelapseRange(entityId, contentTag) {
	rangeUpdateCountMap[entityId] += 10;
	$("#" + contentTag + entityId + "TimelapseRange").val(rangeUpdateCountMap[entityId]);
}

/*
	Utility function to show a "fade in" effect when moving from frame to frame
*/
function fadeToImage(imageId, newSrc) {
	$("#" + imageId).attr("src", newSrc);
}

/*
	Return true if this view is currently in the middle of a TimeLapse operation
*/
function isCurrentlyTimelapsing(entityId, contentTag) {
	if (typeof timelapseIndexMap[entityId] === 'undefined' || timelapseIndexMap[entityId] === null) {
		return false;
	}

	return true;
}
/*
	Timer callback that updates the frames, and keeps a track of the range progress
*/
function nextTimelapse(entityId, contentTag, data) {
	//console.log("***** --- nextTimelapse, entityId: " + entityId + ", timelapseIndexMap[entityId] = " + timelapseIndexMap[entityId] + ", data: " + JSON.stringify(data));
	if (data[timelapseIndexMap[entityId]].type == "imageURL") {
		fadeToImage(contentTag + entityId + "EntityImage", data[timelapseIndexMap[entityId]].imageData);
	} else if (data[timelapseIndexMap[entityId]].type == "dataURI") {
		fadeToImage(contentTag + entityId + "EntityImage", "data:image/jpeg;base64," + data[timelapseIndexMap[entityId]].imageData);
	}
	
	//set the range input
	$("#" + contentTag + entityId + "TimelapseRange").val(timelapseIndexMap[entityId] * 2000);
	timelapseIndexMap[entityId] ++;

	if (timelapseIndexMap[entityId] == data.length) {
		window.clearInterval(timelapseTimerMap[entityId]);
		delete timelapseTimerMap[entityId];
		window.clearInterval(rangeUpdateTimerMap[entityId]);
		delete rangeUpdateTimerMap[entityId];

		//let the last frame play before hiding the controls
		window.setTimeout(function() {stopTimelapse(entityId, contentTag, data);}, 2000);
	}
}

/*
	Stop the timelapse timers, and reset counters, etc.
*/
function stopTimelapse(entityId, contentTag, data) {
	$("#" + contentTag + entityId + "TimeLapseProgressSection").hide();
	//reset values
	delete timelapseIndexMap[entityId];
	delete rangeUpdateCountMap[entityId];
}
