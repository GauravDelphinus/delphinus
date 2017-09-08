$(document).ready(function(){
	redirectTimer = window.setInterval(redirectTimerCallback, 1000);

	$("#redirectSeconds").text(redirectSecondsRemaining);
});

var redirectTimer;
var redirectSecondsRemaining = 5;

function redirectTimerCallback() {
	redirectSecondsRemaining--;

	if (redirectSecondsRemaining > 0) {
		$("#redirectSeconds").text(redirectSecondsRemaining);
	} else {
		window.clearInterval(redirectTimer);
		window.location.replace(redirectURL);
	}
	
}