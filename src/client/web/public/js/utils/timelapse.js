/**************************** TIME LAPSE VIEW ***************************/

function createTimeLapseProgressSectionElement(data) {
	var timelapseProgressSection = $("<div>", {id: data.id + "TimeLapseProgressSection", class: "timelapseProgressSection"});
	var rangeSelector = $("<input>", {id: data.id + "TimelapseRange", class: "timelapseRange", type: "range", min:"0", max:""})
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
function startTimelapse(entityId, data) {
	$("#" + entityId + "TimelapseButton").prop("disabled", true);

	timelapseIndexMap[entityId] = 0;
	rangeUpdateCountMap[entityId] = 0;

	//show the slider view
	$("#" + entityId + "TimeLapseProgressSection").show();
	$("#" + entityId + "TimelapseRange").attr("max", "" + (data.length - 1) * 2000)

	//start the ball rolling
	nextTimelapse(entityId, data);

	timelapseTimerMap[entityId] = window.setInterval(function() {nextTimelapse(entityId, data);}, 2000); //progress frames every 2 seconds
	rangeUpdateTimerMap[entityId] = window.setInterval(function() {updateTimelapseRange(entityId)}, 10); //update range progress every 10 milliseconds (for smoother movement)
}

/*
	Timer callback that updates the progress / range
*/
function updateTimelapseRange(entityId) {
	rangeUpdateCountMap[entityId] += 10;
	$("#" + entityId + "TimelapseRange").val(rangeUpdateCountMap[entityId]);
}

/*
	Utility function to show a "fade in" effect when moving from frame to frame
*/
function fadeToImage(imageId, newSrc) {
	$("#" + imageId).attr("src", newSrc);
}

/*
	Timer callback that updates the frames, and keeps a track of the range progress
*/
function nextTimelapse(entityId, data) {
	console.log("nextTimeLapse: timelapseIndexMap: " + JSON.stringify(timelapseIndexMap));
	if (data[timelapseIndexMap[entityId]].imageType == "url") {
		fadeToImage(entityId + "EntityImage", data[timelapseIndexMap[entityId]].imageData);
	} else {
		fadeToImage(entityId + "EntityImage", "data:image/jpeg;base64," + data[timelapseIndexMap[entityId]].imageData);
	}
	
	//set the range input
	$("#" + entityId + "TimelapseRange").val(timelapseIndexMap[entityId] * 2000);
	timelapseIndexMap[entityId] ++;

	if (timelapseIndexMap[entityId] == data.length) {
		window.clearInterval(timelapseTimerMap[entityId]);
		delete timelapseTimerMap[entityId];
		window.clearInterval(rangeUpdateTimerMap[entityId]);
		delete rangeUpdateTimerMap[entityId];

		//let the last frame play before hiding the controls
		window.setTimeout(function() {stopTimelapse(entityId, data);}, 2000);
	}
}

/*
	Stop the timelapse timers, and reset counters, etc.
*/
function stopTimelapse(entityId, data) {
	$("#" + entityId + "TimeLapseProgressSection").hide();

	//reset values
	delete timelapseIndexMap[entityId];
	delete rangeUpdateCountMap[entityId];

	$("#" + entityId + "TimelapseButton").prop("disabled", false);
}
