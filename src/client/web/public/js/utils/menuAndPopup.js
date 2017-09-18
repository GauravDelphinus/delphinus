function createMenu(menuButton) {
	var menu = $("<div>", {class: "dropdown DropDown"});
	$(menuButton).addClass("class", "dropdown-toggle");
	$(menuButton).attr("data-toggle", "dropdown");
	var menuList = $("<ul>", {class: "dropdown-menu", role: "menu", "aria-labelledby" : $(menuButton).attr("id")});

	menu.append(menuButton);
	menu.append(menuList);

	return menu;
}

function appendMenuItemButton(menu, menuItemButton) {
	var menuList = menu.find(".dropdown-menu");

	//var button = $("<button>", {id: prefix + menuItemTag, class: "btn itemDropdownButton", type: "button"}).append(menuItemIcon).append(menuItemLabel);
	menuList.append($("<li>").append(menuItemButton));
}

/*
	Good looking alert box that fades away after a certain number of seconds
*/
function showAlert(message, secondsToFade) {
	var popupHeader = $("<h2>").append("Alert");
	var popupBody = $("<p>", {class: "alert-message"}).append(message);
	var element = createPopupElement("AlertPopup", "modal-narrow", null, null, popupBody, function() {
		$("#AlertPopup").remove();
	});
	$("body").append(element);
	$("#AlertPopup").show();
	setTimeout(function() {
		$("#AlertPopup").fadeOut(2000, function() {
			$("#AlertPopup").hide();
			$("#AlertPopup").remove();
		});
	}, secondsToFade * 1000);
}

function createPopupElement(id, classes, headerContent, footerContent, bodyContent, closeCallback) {
	var element = $("<div>", {id: id, class: "modal"});
	
	var content = $("<div>", {class: "modal-content"});
	if (classes) {
		content.addClass(classes);
	}

	var closeButton = $("<span>", {id: id + "PopupClose", class: "close"}).append("&times;");
	closeButton.click(function() {
		closeCallback();
	});

	
	if (headerContent) {
		var header = $("<div>", {class: "modal-header"}).append(closeButton);
		header.append(headerContent);
		content.append(header);
	}

	
	if (bodyContent) {
		var body = $("<div>", {class: "modal-body"});
		body.append(bodyContent);
		content.append(body);
	}

	
	if (footerContent) {
		var footer = $("<div>", {class: "modal-footer"});
		footer.append(footerContent);
		content.append(footer);
	}

	element.append(content);

	return element;
}
