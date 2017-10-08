$(document).ready(function(){
  	createLoginHeader();

  	setupMainItem();

  	setupSidebars();

  	setupTabs();

  	keepSidebarVisible();
});

function setupMainItem() {
	$.getJSON('/api/entries/' + entryId, function(data) {
		var mainElement = createMainElement(data, "main");
		$("#main").append(mainElement);
	}).fail(function() {
		window.location.replace("/error");
	});
}

function setupTabs() {
	var tabGroup = createNewTabGroup(entryId);
	$("#tabs").append(tabGroup);

	setupCommentsTab();

	setupTabRedirection(entryId);
}

function setupSidebars() {
	if (challengeId != 0) {
  		createChallengeSidebar(challengeId, function(sidebar) {
	  		if (sidebar) {
	  			$("#rightTopSidebar").append(sidebar);

	  			createChallengeCaptionSidebar(challengeId, function(sidebar) {
	  				if (sidebar) {
	  					$("#rightMiddleSidebar").append(sidebar);
	  				}
	  			});
	  		} else {
	  			createIndependentCaptionSidebar(function(sidebar) {
	  				if (sidebar) {
	  					$("#rightTopSidebar").append(sidebar);
	  				}
	  			});
	  		}
	  	});
  	} else {
  		createIndependentCaptionSidebar(function(sidebar) {
			if (sidebar) {
				$("#rightTopSidebar").append(sidebar);
			}
		});
  	}
}

function setupCommentsTab() {
	var tabDiv = appendNewTab(entryId, "comments", "Comments");
	createAndAppendContentContainer(tabDiv, entryId, "comments", [{type: "comments"}], [{type: "date", url: "/api/comments/?entityId=" + entryId + "&sortBy=reverseDate"}]);
}
