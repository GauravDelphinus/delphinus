function createLoginHeader() {

	if (!$("#userLoginHeader").length) {
		$("<div>", {id: "userLoginHeader"}).attr("class", "userLoginHeader").prependTo("body");
	}
	
	if (user) {
		$("<div>", {class : "userLoginHeader"}).appendTo("#userLoginHeader").append($("<span>", {id : "dropbtn", class : "dropbtn"}));

		$("<a>", {text: user.displayName, href : "/user/" + user.id}).attr("class", "userNameHeader").appendTo("#userLoginHeader");

		var img = $("<img>");
		img.attr("src", user.image);
		img.attr("class", "userImageHeader");
		img.appendTo("#userLoginHeader");

		$("<a>", {text: "Sign Out", href : "/auth/logout"}).attr("class", "signOutTextHeader").appendTo("#userLoginHeader");

	} else {
		$("<a>", {text: "Sign in", href : "/auth"}).attr("class", "signInTextHeader").appendTo("#userLoginHeader");
	}
}