function createLoginHeader() {

	if (!$("#userLoginHeader").length) {
		$("<div>", {id: "userLoginHeader"}).prependTo("body");
	}
		if (user) {
		var img = $("<img>");
		img.attr("src", user.image);
		img.appendTo("#userLoginHeader");

		$("<p>", {text: user.displayName}).appendTo("#userLoginHeader");
	} else {
		$("<a>", {text: "Sign in", href : "/auth/google"}).appendTo("#userLoginHeader");
	}
}