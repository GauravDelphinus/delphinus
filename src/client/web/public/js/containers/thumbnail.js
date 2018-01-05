////**************************** GRID / THUMBNAIL VIEW ********************************

//Create an empty grid table for hosting content
function createGrid(entityId, contentTag) {
	var table = $("<table>", {id: entityId + contentTag + "GridTable"});

	return table;
}

//Append content to an existing grid table
function appendGrid(entityId, contentTag, list, allowSelection = false, allowHover = false, defaultSelectedID = 0, selectionCallback = null) {
	var table = $("#" + entityId + contentTag + "GridTable");

	var rowCount = $("#" + entityId + contentTag + "GridTable tr").length;
	var numCols = 0;
	if (rowCount > 0) {
		numCols = table.find("tr:first td").length;
	} else {
		//this is the first row
		if (list.length % 4 == 0) {
			numCols = 4;
		} else if (list.length % 3 == 0) {
			numCols = 3;
		} else if (list.length % 2 == 0) {
			numCols = 2;
		} else {
			numCols = 2;
		}
	}
	
	
	var tdWidth = 100 / numCols;

	var i = 0;
	var numRows = (list.length / numCols) + (((list.length % numCols) > 0) ? 1 : 0);
	for (var row = 0; row < numRows; row ++) {
		var tr = $("<tr>");
		for (var col = 0; col < numCols; col ++) {
			var td = $("<td>", {class: "gridCell", width: tdWidth + "%"});
			if (i < list.length) {
				var data = list[i++];
				var element = createThumbnailElement(data, contentTag, !allowSelection);

				if (allowHover) {
					element.addClass("elementHover");
				}

				if (allowSelection) {
					element.click({id: data.id, element: element}, function(e) {
						$("#" + contentTag + " .thumbnailElement").removeClass("active"); //unselect all first
						e.data.element.addClass("active"); //now make the selection
						if (selectionCallback) {
							selectionCallback(e.data.id);
						}
					});
				}

				//if there's a default selection, make the selection
				if (defaultSelectedID != null && defaultSelectedID != undefined && defaultSelectedID == data.id) {
					element.addClass("active");
				}

				td.append(element);
			}
			tr.append(td);
		}
		table.append(tr);
	}

	return table;
}

function refreshThumbnailView(contentTag) {
	$("#" + contentTag + "GridTable").remove();

	var list = jQuery.data(document.body, contentTag + "List");

	var grid = createGrid(contentTag, list, 3, false, false, null, null);
	$("#" + contentTag + "Container").append(grid);
}