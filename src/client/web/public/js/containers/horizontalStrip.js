//Append content to an existing grid table
function createHorizontalStrip(entityId, contentTag, list, allowSelection = false, allowHover = false, defaultSelectedID = 0, selectionCallback = null) {
	var table = $("<table>", {id: entityId + contentTag + "HorizontalStrip"});
	
	var numRows = 1;
	var numCols = list.length;
	var tdWidth = 100 / numCols;

	var i = 0;


	for (var row = 0; row < numRows; row ++) {
		var tr = $("<tr>");
		for (var col = 0; col < numCols; col ++) {
			var td = $("<td>", {class: "gridCell", width: tdWidth + "%"});
			if (i < list.length) {
				var data = list[i++];
				var element = createHorizontalStripElement(data, contentTag);

				if (allowHover) {
					element.addClass("elementHover");
				}

				if (allowSelection) {
					element.click({id: data.id, element: element}, function(e) {
						table.find(".active").removeClass("active");
						e.data.element.addClass("active"); //now make the selection
						console.log("click called for id: " + data.id);
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

function createHorizontalStripElement(data, contentTag) {
	var element = $("<div>", {class: "horizontalStripElement"});

	var imageElement = $("<img>", {id: data.id, src: data.image});
	element.append(imageElement);

	var captionSection = $("<div>", {class: "captionSection", id: contentTag + data.id + "CaptionSection"});

	var caption = $("<span>", {text: data.caption});
	captionSection.append(caption);
	element.append(captionSection);

	return element;
}