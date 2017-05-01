function createLoginHeader() {
	
	if (user) {
		$("<div>", {id: "dropdown", class : "dropdown pull-right"}).appendTo("#navbar");
		$("<a>", {href: "#", id: "dropdownmenu", class: "dropdown-toggle", "data-toggle" : "dropdown", text: user.displayName}).appendTo("#dropdown");
		$("<b>", {class: "caret"}).appendTo("#dropdownmenu");

		$("<ul>", {id: "dropdownlist", class: "dropdown-menu", role: "menu", "aria-labelledby" : "dropdownmenu"}).appendTo("#dropdown");

		$("<li>").append($("<a>", {text: "Profile", href: "/user"})).appendTo("#dropdownlist");
		$("<li>").append($("<a>", {text: "Sign Out", href: "/auth/logout"})).appendTo("#dropdownlist");

	} else {
		$("<a>", {text: "Sign in", href : "/auth"}).attr("class", "pull-right").appendTo("#navbar");
	}
}