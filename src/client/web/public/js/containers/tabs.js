function createNewTabGroup(id) {
	var tabGroup = $("<div>", {id: id});
	tabGroup.append($("<ul>", {class: "nav nav-tabs", id: id + "Tabs"}));
	tabGroup.append($("<div>", {class: "tab-content"}));
	tabGroup.append("<br>");//adding some space at the bottom of the tab

	return tabGroup;
}

function appendNewTab(tabGroupId, id, title) {
	var active = false;
	if ($("#" + tabGroupId + " ul li").length == 0) {
		active = true;
	}

	var li = $("<li>", {class: active ? "active" : ""}).append($("<a>", {"data-toggle" : "tab", href: "#" + id}).text(title));
	$("#" + tabGroupId + " ul").append(li);

	var div = $("<div>", {id: id, class: "tab-pane fade" + (active ? " in active" : "")});
	$("#" + tabGroupId + " .tab-content").append(div);

	div.append("<br>"); //add space before first item
	return div;
}
