$(document).ready(function(){
  	createLoginHeader();

  	setupMainItem();

  	setupSidebars();

  	setupTabs();

  	keepSidebarVisible();
});

function setupMainItem() {
	//set up the main item
	var mainElement = createMainElement(entry, "main");
	$("#main").empty().append(mainElement);
}

function setupTabs() {
	var tabGroup = createNewTabGroup(entry.id);
	$("#tabs").append(tabGroup);

	setupCommentsTab();

	setupTabRedirection(entry.id);
}

function setupSidebars() {
	if (entry.sourceType == "challengeId") {
		//add the challenge sidebar element
		createChallengeSidebar(entry.sourceId, function(sidebar) {
			if (sidebar) {
				$("#rightTopSidebar").append(sidebar);
				//add another sidebar element to prompt user to post another entry into that challenge
		  		createChallengeCaptionSidebar(entry.sourceId, function(sidebar) {
			  		if (sidebar) {
			  			$("#rightMiddleSidebar").append(sidebar);
			  		}
				});
			}
		});
  	} else if (entry.sourceType == "designId") {
  		createDesignSidebar(entry.sourceId, function(sidebar) {
  			if (sidebar) {
	  			$("#rightTopSidebar").append(sidebar);
	  			//add another sidebar element to prompt user to post another entry into that challenge
		  		createDesignCaptionSidebar(entry.sourceId, function(sidebar) {
			  		if (sidebar) {
			  			$("#rightMiddleSidebar").append(sidebar);
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
	var tabDiv = appendNewTab(entry.id, "comments", "Comments");
	//note: setting the contentTag to "main" below as we want the comments to be associated with the main element
	createAndAppendCommentsContainer(tabDiv, entry.id, "main", "/api/comments?entityId=" + entry.id);
}
