//The Integrated UI implementation
//
var user = null;
var encodedUsername = ""
var prefs = null;
var split = null;
var collectionID = null;
var collectionQuery = null;
var confTreeManager = null;
var fileTreeManager = null;
var currentTable = "";
var firstResult = 1;
var maxResults = 25;
var queryIsActive = false;

var expandURL = "/mirc/images/expand.png";
var collapseURL = "/mirc/images/collapse.png";
var closeboxURL = "/icons/closebox.gif";

var fileMenuBar;
var confMenuBar;

var logTime = false;
var timing = "";

function loaded() {

	//listCookies();
	user = new User();
	if (user.isLoggedIn) {
		encodedUsername = encodeURIComponent(user.name);
		prefs = new Prefs();
		replaceContent("usernameSpan", prefs.name);
		replaceContent("loginoutAnchor", "Logout");
		show("myAccount", "inline");
	}
	else {
		replaceContent("usernameSpan", "Guest");
		hide("myAccount");
		replaceContent("loginoutAnchor", "Login");
	}

	//leftDiv, sliderDiv, rightDiv, fillHeight, sliderPosition, forceTopForIE, leftMin, rightMin, changeHandler
	split = new HorizontalSplit("left", "center", "right", true, 185, false, 1, 120, resizeScrollableTable);

	setVisibility("MyDocuments", user.hasRole("author"));
	setVisibility("DraftDocuments", user.hasRole("author"));
	setVisibility("AuthorTools", user.hasRole("author"));
	setVisibility("FileCabinets", user.isLoggedIn);
	setVisibility("ApprovalQueue", user.hasRole("publisher"));
	setVisibility("Admin", user.hasRole("admin"));
	setVisibility("CaseOfTheDay", (codURL != ""));

	confMenuBar = new SingleMenuBar("confMenuBar", confMenu);
	confMenuBar.display();
	setConfEnables();

	if (user.isLoggedIn) {
		fileMenuBar = new SingleMenuBar("fileMenuBar", fileMenu);
		fileMenuBar.display();
		setFileEnables();
	}

	var freetext = document.getElementById("freetext");
	freetext.focus();
	freetext.onclick = freetextClick;
	window.onresize = resize;
	createServersPopup();

	setState();

	setModifierValues();

	loadConferences();

	if (user.isLoggedIn) loadFileCabinets();

	loadAdvancedQueryPopup();

	queryAllNew();
}
window.onload = loaded;

function resize() {
	if (split) split.positionSlider();
	resizeScrollableTable();
	resizeFilesDiv();
}

//************************************************
//Utilities
//************************************************
function replaceContent(id, text) {
	var parent = document.getElementById(id);
	replaceNodeContent(parent, text);
}
function replaceNodeContent(parent, text) {
	if (parent) {
		while (parent.firstChild) parent.removeChild(parent.firstChild);
		parent.appendChild( document.createTextNode(text) );
	}
}

function setVisibility(id, showObject) {
	if (showObject) show(id, "block");
	else hide(id);
}
function hide(id) {
	var node = document.getElementById(id);
	hideNode(node);
}
function hideNode(node) {
	if (node) {
		node.style.visibility = "hidden";
		node.style.display = "none";
	}
}
function show(id, type) {
	var node = document.getElementById(id);
	showNode(node, type);
}
function showNode(node, type) {
	if (node) {
		node.style.visibility = "visible";
		if (type == null) type="block"
		node.style.display = type;
	}
}

//************************************************
//Advanced Query Popup
//************************************************
var sortOrder = "lmdate";
var displayFormat = "";
var backgroundColor = "";
var icons = false;
var unknown = false;

var current_page;
var current_tab;

function loadAdvancedQueryPopup() {
	current_page = document.getElementById('div1');
	current_tab = document.getElementById('page1tab');
	selectTab(current_tab);
}

function showAdvancedQueryPopup() {
	var aqPopupID = "AdvancedQueryPopup";
	var div = document.getElementById("AdvancedQuery");
	div.style.display = "block";
	var title = "Advanced Search";
	var closebox = "/icons/closebox.gif";
	showDialog(aqPopupID, 800, 345, title, closebox, null, div, null, null);
}

function setBreedList() {
	var ptSpecies = document.getElementById("pt-species");
	var ptBreed = document.getElementById("pt-breed");
	ptBreed.options.length = 0;
	var choice = ptSpecies.selectedIndex;
	var breedlist = breeds[choice];
	ptBreed.options[0] = new Option("","");
	for (var i=0; i<breedlist.length; i++) {
		 ptBreed.options[i+1] = new Option(breedlist[i], breedlist[i]);
	}
}

function bclick(next_page_Id, theEvent) {
	var clicked_tab = getSource(theEvent);
	var next_page = document.getElementById(next_page_Id);
	if (current_page != next_page) {
		current_page.style.visibility="hidden";
		current_page.style.display="none";
		current_page = next_page;
		current_page.style.visibility="visible";
		current_page.style.display="block";
		deselectTab(current_tab);
		current_tab = clicked_tab;
		selectTab(current_tab);
	}
}

function selectTab(tab) {
	tab.style.backgroundColor = "#2977b9";
	tab.style.color = 'white';
}

function deselectTab(tab) {
	tab.style.backgroundColor = 'white';
	tab.style.color = "#2977b9";
}

function setModifierValues() {
	maxResults = parseInt(getSelectedOption("maxresults"));
	sortOrder = getSelectedOption("orderby");
	displayFormat = getSelectedOption("display");
	backgroundColor = getSelectedOption("bgcolor");
	icons = getCBValue("icons");
	unknown = getCBValue("unknown");
	setCookies();

	function getSelectedOption(id) {
		var sel = document.getElementById(id);
		if (sel) return sel.value;
		else return "";
	}

	function getCBValue(id) {
		var cb = document.getElementById(id);
		if (cb) return cb.checked;
		else return false;
	}
}

function doAdvancedQuery() {
	deselectAll();
	var mods = getBaseQuery();
	mods +=	"&firstresult=" + firstResult;
	mods += "&maxresults=" + maxResults;
	mods += "&orderby=" + sortOrder;
	if (displayFormat != "") mods += "&display=" + displayFormat;
	if (backgroundColor != "") mods += "&bgcolor=" + backgroundColor;
	if (unknown) mods += "&unknown=yes";
	if (icons) mods += "&icons=no";
	mods +=	getServerIDs();

	var name = "";
	var query = "";

	var pages = document.getElementById("querypages");
	var inputs = pages.getElementsByTagName("INPUT");
	for (var i=0; i<inputs.length; i++) {
		if (inputs[i].type == "text") {
			text = trim( inputs[i].value );
			name = inputs[i].name;
			if ((name != "aqfreetext") && (text != "")) {
				query += "&"+name+"=" + encodeURIComponent(text);
			}
		}
	}
	var selects = pages.getElementsByTagName("SELECT");
	for (var i=0; i<selects.length; i++) {
		var index = selects[i].selectedIndex;
		name = selects[i].name;
		var opts = selects[i].getElementsByTagName("OPTION");
		text = trim( opts[index].value );
		if (text != "") query += "&"+name+"=" + encodeURIComponent(text);
	}

	collectionQuery = doAdvancedQuery;
	setCookies();
	deselectAll();
	var req = new AJAX();
	setStatusLine("Searching...");
	showSearchingPopup();
	queryIsActive = true;
	req.POST("/query", mods+query+"&"+req.timeStamp(), processQueryResults);
}


//************************************************
//Login/Logout
//************************************************
function loginLogout() {
	if (user.isLoggedIn) logout('/query');
	else showLoginPopup('/query');
}

//************************************************
//Modifiers
//************************************************
function clearModifiers() {
	firstResult = 1;
	var freetext = document.getElementById("freetext");
	freetext.value = "";
	repeatSearch();
}

function getModifiers() {
	var mods = "";
	mods +=	"&firstresult=" + firstResult;
	mods += "&maxresults=" + maxResults;
	mods += "&orderby=" + sortOrder;
	if (displayFormat != "") mods += "&display=" + displayFormat;
	if (backgroundColor != "") mods += "&bgcolor=" + backgroundColor;
	if (unknown) mods += "&unknown=yes";
	if (icons) mods += "&icons=no";
	mods +=	getServerIDs();

	var freetext = document.getElementById("freetext");
	var text = trim(freetext.value);
	if (text == "Search...") text = "";
	if (text != "") mods += "&document=" + encodeURIComponent(text);
	return mods;
}

function freetextClick() {
	var freetext = document.getElementById("freetext");
	var text = freetext.value;
	text = trim(text);
	if (text == "Search...")  freetext.value = "";
}

function keyClicked(event) {
	event = event ? event : window.event;
	if (event.keyCode == 13) repeatSearch();
}

function getServerIDs() {
	var ids = "";
	var sel = document.getElementById("serverselect");
	if (sel) {
		var ids = getOptions(sel);
		if (ids != "") ids = "&server=" + ids;
	}
	return ids;
}

function getLocalServerIDs() {
	var ids = "";
	for (var i=0; i<allServers.length; i++) {
		if (allServers[i].isLocal) {
			if (ids != "") ids += ":";
			ids += i;
		}
	}
	return ids;
}

//************************************************
//Collection queries
//************************************************
function deselectAll() {
	deselectCollection("MyDocuments");
	deselectCollection("AllDocuments");
	deselectCollection("DraftDocuments");
	deselectCollection("ApprovalQueue");
	deselectLink("Download");
	if (confTreeManager) confTreeManager.closePaths();
	if (fileTreeManager) fileTreeManager.closePaths();
	deselectAuthorTools();
}

function deselectLink(id) {
	var x = document.getElementById(id);
	if (x) x.firstChild.style.fontWeight = "normal";
}

function deselectCollection(id) {
	if (id == collectionID) {
		collectionID = null;
		collectionQuery = null;
	}
	var x = document.getElementById(id);
	if (x) x.firstChild.style.fontWeight = "normal";
}

function deselectAuthorTools() {
	var ats = document.getElementById("AuthorTools");
	if (ats) {
		var aTags = ats.getElementsByTagName("A");
		for (i=0; i<aTags.length; i++) {
			aTags[i].style.fontWeight = "normal";
		}
	}
}

function selectCollection( theCollectionQuery, theCollectionID ) {
	if (theCollectionID) {
		var x = document.getElementById(theCollectionID);
		if (x) {
			x.firstChild.style.fontWeight = "bold";
			collectionQuery = theCollectionQuery;
			collectionID = theCollectionID;
		}
	}
}

function search() {
	firstResult = 1;
	if (collectionQuery) collectionQuery();
	else queryAll();
}

function repeatSearch() {
	if (collectionQuery) collectionQuery();
	else queryAll();
}

function getBaseQuery() {
	return "xml=yes";
}

function queryMineNew() {
	firstResult = 1;
	queryMine();
}

function queryMine() {
	if (user.isLoggedIn) {
		doQuery(getBaseQuery() + "&owner="+encodedUsername);
		selectCollection(queryMine, "MyDocuments");
	}
	else queryAll();
}

function queryAllNew() {
	firstResult = 1;
	queryAll();
}

function queryAll() {
	doQuery(getBaseQuery());
	selectCollection(queryAll, "AllDocuments");
}

function queryAllTemp() {
	firstResult = 1;
	queryTemp();
}

function queryTemp() {
	doQuery(getBaseQuery() + "&temp=yes");
	selectCollection(queryTemp, "DraftDocuments");
}

function approvalQueueNew() {
	firstResult = 1;
	approvalQueue();
}

function approvalQueue() {
	var query = getBaseQuery();
	query += "&firstresult=" + firstResult;
	query += "&maxresults=" + maxResults;
	query += "&orderby=" + sortOrder;
	query += "&server=" + getLocalServerIDs();

	var freetext = document.getElementById("freetext");
	var text = trim(freetext.value);
	if (text == "Search...") text = "";
	if (text != "") query += "&document=" + encodeURIComponent(text);
	query += "&pubreq=yes";

	deselectAll();
	var req = new AJAX();
	setStatusLine("Searching...");
	queryIsActive = true;
	req.POST("/query", query+"&"+req.timeStamp(), processQueryResults);
	selectCollection(approvalQueue, "ApprovalQueue");
}

function firstPage() {
	if (collectionQuery) {
		firstResult = 1;
		repeatSearch();
	}
}

function nextPage() {
	if (collectionQuery) {
		firstResult += maxResults;
		repeatSearch();
	}
}

function prevPage() {
	if (collectionQuery) {
		firstResult -= maxResults;
		if (firstResult < 1) firstResult = 1;
		repeatSearch();
	}
}

//************************************************
//Column sort handlers
//************************************************
function sortOnTitle() {
	sortOrder = "title";
	search();
}

function sortOnAuthor() {
	sortOrder = "author";
	search();
}

function sortOnLibrary() {
	sortOrder = "library";
	search();
}

function sortOnSpecialty() {
	sortOrder = "specialty";
	search();
}

function sortOnLMDate() {
	sortOrder = "lmdate";
	search();
}

function sortOnPubDate() {
	sortOrder = "pubdate";
	search();
}

//************************************************
//Main query
//************************************************
function doQuery(query) {
	setCookies();
	deselectAll();
	query += getModifiers();
	var req = new AJAX();
	setStatusLine("Searching...");
	showSearchingPopup();
	queryIsActive = true;
	req.POST("/query", query+"&"+req.timeStamp(), processQueryResults);
}

//************************************************
//Query results
//************************************************
//Note: this table is used for both query results and conferences
var scrollableTable = null;
var blanks = "\u00A0\u00A0";

function processQueryResults(req) {
	if (queryIsActive && req.success()) {
		var xml = req.responseXML();
		var qr = xml ? xml.firstChild : null;
		if (qr) {
			var pane = document.getElementById("right");
			while (pane.firstChild) pane.removeChild(pane.firstChild);

			var mds = qr.getElementsByTagName("MIRCdocument");
			if (mds.length > 0) {
				pane.appendChild( makeLinks(true) );
				scrollableTable = setScrollableTable(pane, resultsTableHeadings);
				for (var i=0; i<mds.length; i++) {
					var md = mds[i];
					appendDocument(scrollableTable.tbody, md);
				}
				selectAll();
				scrollableTable.rationalize();
				resizeScrollableTable();
				scrollableTable.bodyTable.parentNode.onresize = resizeScrollableTable;
			}
			else right.appendChild(document.createTextNode("No results found."));
		}
		hidePopups();
		resize();
		resizeScrollableTable();
		setStatusLine("");
		showSessionPopup();
	}
}

function resizeScrollableTable() {
	if (scrollableTable) {
		var bodyTable = scrollableTable.bodyTable;
		var scrollDiv = bodyTable.parentNode;
		var container = scrollDiv.parentNode;
		var containerPos = findObject(container);
		var scrollDivPos = findObject(scrollDiv);
		var bodyTablePos = findObject(bodyTable);
		var h = containerPos.h - (scrollDivPos.y - containerPos.y);
		scrollDiv.style.height = ((h>0) ? h : 1);
		scrollableTable.sync();
	}
}

function appendDocument(tbody, doc) {
	var tr = document.createElement("TR");
	tr.md = doc;
	appendTDCB(tr);
	appendTDA(tr, doc, "title", doc.getAttribute("docref"));
	appendTDLocation(tr, doc);
	appendTDAuthor(tr, doc);
	appendTD(tr, doc, "category")
	appendTD(tr, doc, "lmdate", "center")
	appendTD(tr, doc, "pubdate", "center")
	appendTD(tr, doc, "access");
	tbody.appendChild(tr);
}

function appendTDCB(tr, handler) {
	var td = document.createElement("TD");
	td.className = "tableCB";
	var cb = document.createElement("INPUT");
	cb.type = "checkbox";
	if (handler) cb.onclick = handler;
	td.appendChild(cb);
	tr.appendChild(td);
}
function appendTDA(tr, doc, tag, href) {
	var td = document.createElement("TD");
	var img = document.createElement("IMG");
	img.src = expandURL;
	img.className = "spaceRight";
	img.onclick = toggleDetails;
	td.appendChild(img);
	var a = document.createElement("A");
	a.href = href;
	if (IE || CHROME) a.target = "shared";
	else a.target = "_blank";
	a.className = "TitleLink";
	var text = "";
	var node = doc.getElementsByTagName(tag);
	if (node.length) {
		node = node[0].firstChild;
		if (node) text = node.nodeValue;
	}
	a.appendChild( document.createTextNode(text) );
	td.appendChild(a);
	tr.appendChild(td);
}
function appendTDText(tr, text) {
	if (trim(text) == "") text = blanks;
	var td = document.createElement("TD");
	td.appendChild( document.createTextNode(text) );
	tr.appendChild(td);
}
function appendTDAuthor(tr, doc) {
	var td = document.createElement("TD");
	var text = ""
	var authors = doc.getElementsByTagName("author");
	var empty = true;
	for (var i=0; i<authors.length; i++) {
		var names = authors[i].getElementsByTagName("name");
		for (var k=0; k<names.length; k++) {
			var name = names[k].firstChild;
			if (name) {
				var text = name.nodeValue;
				td.appendChild( document.createTextNode(text) );
				td.appendChild( document.createElement("BR") );
				empty = false;
			}
		}
	}
	if (empty) td.appendChild( document.createTextNode(blanks) );
	tr.appendChild(td);
}
function appendTDLocation(tr, doc) {
	var td = document.createElement("TD");

	//Get the server name. First look for a server child.
	//If there isn't one, get it from the parent.
	var server = doc.getElementsByTagName("server");
	if (server.length == 0) server = doc.parentNode.getElementsByTagName("server");

	var text = blanks;
	if (server.length != 0) text = server[0].firstChild.nodeValue;
	while (text.length < 10) text += blanks;
	td.appendChild( document.createTextNode( text ) );
	tr.appendChild(td);
}
function appendTD(tr, doc, tag, className) {
	var td = document.createElement("TD");
	if (className) td.className = className;
	var text = "";
	var node = doc.getElementsByTagName(tag);
	if (node.length) {
		node = node[0].firstChild;
		if (node) text = node.nodeValue;
	}
	if (trim(text) == "") text = blanks;
	td.appendChild( document.createTextNode(text) );
	tr.appendChild(td);
}

function setScrollableTable(pane, headings) {
	pane.style.overflow = "hidden";

	var headerTable = document.createElement("TABLE");
	headerTable.id = "headerTable";
	var thead = document.createElement("THEAD");
	thead.id = "resultsTableHead";
	headerTable.appendChild(thead);
	var tr = document.createElement("TR");
	thead.appendChild(tr);
	headings(tr);
	thead.appendChild(tr);
	pane.appendChild(headerTable);

	var scrollDiv = document.createElement("DIV");
	scrollDiv.id = "scrollDiv";
	scrollDiv.className = "scrollDiv";

	var resultsTable = document.createElement("TABLE");
	resultsTable.id = "resultsTable";
	var tbody = document.createElement("TBODY");
	resultsTable.id = "resultsTableBody";
	resultsTable.appendChild(tbody);
	scrollDiv.appendChild(resultsTable);

	pane.appendChild(scrollDiv);

	return new ScrollableTable( headerTable, resultsTable );
}

function resultsTableHeadings(tr) {
	appendTHCB(tr, toggleSelect);
	appendTHTitle(tr, "sortOnTitle", "title");
	appendTH(tr, "Library", "sortOnLibrary", "library");
	appendTH(tr, "Author", "sortOnAuthor", "author");
	appendTH(tr, "Specialty", "sortOnSpecialty", "specialty");
	appendTH(tr, "Date Modified", "sortOnLMDate", "lmdate");
	appendTH(tr, "Date Created", "sortOnPubDate", "pubdate");
	//appendTH(tr, "Rating");
	appendTH(tr, "Access");
}

function appendTH(tr, text, sortMethod, sort) {
	var th = document.createElement("TH");
	var textNode = document.createTextNode(text);
	if (sortMethod) {
		if (sort == sortOrder) th.className = "sort";
		var a = document.createElement("A");
		a.href = "javascript:"+sortMethod+"();";
		a.appendChild(textNode);
		th.appendChild(a);
	}
	else th.appendChild(textNode);
	tr.appendChild(th);
}
function appendTHTitle(tr, sortMethod, sort) {
	var th = document.createElement("TH");
	if (sort == sortOrder) th.className = "sort";
	var img = document.createElement("IMG");
	img.src = expandURL;
	img.className = "spaceRight";
	img.onclick = toggleExpandCollapse;
	img.id = "expandCollapseImg";
	img.title = "Expand/Collapse";
	th.appendChild(img);
	var textNode = document.createTextNode("Title");
	if (sortMethod) {
		var a = document.createElement("A");
		a.href = "javascript:"+sortMethod+"();";
		a.appendChild(textNode);
		th.appendChild(a);
	}
	else th.appendChild(textNode);
	tr.appendChild(th);
}
function appendTHCB(tr, handler) {
	var th = document.createElement("TH");
	var cb = document.createElement("INPUT");
	cb.type = "checkbox";
	cb.id = "tableHeaderCB";
	if (handler) cb.onclick = handler;
	cb.title = "Select/Deselect";
	th.appendChild(cb);
	tr.appendChild(th);
}

//************************************************
//Command links
//************************************************
function makeLinks(includeNextPrev) {
	var div = document.createElement("DIV");
	div.className = "links";
	if (includeNextPrev) {
		div.appendChild( makeLink(firstPage, "/icons/go-first.png", "First Page") );
		div.appendChild( makeLink(prevPage, "/icons/go-previous.png", "Previous Page") );
		div.appendChild( makeLink(nextPage, "/icons/go-next.png", "Next Page") );
	}
	div.appendChild( makeUnknownsLink() );
	div.appendChild( makeLink(displayCN, "/mirc/images/film-projector.gif", "Display the selected cases in the Case Navigator") );

	if (user.isLoggedIn && user.hasRole("admin")) {
		var myr = makeLink(getQuizSummary, "/mirc/images/quizsummary.png", "Quiz summary for the selected local cases");
		div.appendChild( myr );
	}

	if (user.isLoggedIn && prefs.myrsna) {
		var myr = makeLink(sendToMyRSNA, "/mirc/images/myrsna.png", "Export the selected local cases to myRSNA Files");
		myr.style.marginLeft = "5px";
		div.appendChild( myr );
	}
	return div;
}

function makeLink(func, src, title) {
	var img = document.createElement("IMG");
	img.src = src;
	img.title = title;
	img.onclick = func;
	return img;
}

function makeUnknownsLink() {
	var img = document.createElement("IMG");
	img.id = "toggleQueryTitles";
	img.src = "/mirc/images/toggletitles.png";
	img.title = (unknown ? "Display titles as knowns" : "Display titles as unknown");
	img.onclick = toggleTitles;
	return img;
}

function toggleTitles() {
	unknown = !unknown;
	var img = document.getElementById("toggleQueryTitles");
	if (img) img.title = (unknown ? "Display titles as knowns" : "Display titles as unknowns");
	var unk = document.getElementById("unknown");
	if (unk) unk.checked = unknown;
	repeatSearch();
}

function toggleExpandCollapse() {
	var img = document.getElementById("expandCollapseImg");
	if (img.src.indexOf(expandURL) == -1) {
		collapseAll();
		img.src = expandURL;
	}
	else {
		expandAll();
		img.src = collapseURL;
	}
}

function setExpandCollapse() {
	var tbody = document.getElementById("resultsTableBody");
	var cbs = tbody.getElementsByTagName("INPUT");
	var isExpanded = false;
	for (var i=0; i<cbs.length; i++) {
		var cb = cbs[i];
		if (cb.type == "checkbox") {
			var td = cb.parentNode.nextSibling;
			var tr = td.parentNode;
			var img = td.firstChild;
			isExpanded |= (img.src.indexOf(expandURL) == -1);
		}
	}
	var img = document.getElementById("expandCollapseImg");
	if (!isExpanded) {
		img.src = expandURL;
	}
	else {
		img.src = collapseURL;
	}
}

function expandAll() {
	var tbody = document.getElementById("resultsTableBody");
	var cbs = tbody.getElementsByTagName("INPUT");
	for (var i=0; i<cbs.length; i++) {
		var cb = cbs[i];
		if (cb.type == "checkbox") {
			var td = cb.parentNode.nextSibling;
			var tr = td.parentNode;
			var img = td.firstChild;
			var tbody = tr.parentNode;
			expandDetails(tbody, tr, td, img);
		}
	}
}

function collapseAll() {
	var tbody = document.getElementById("resultsTableBody");
	var cbs = tbody.getElementsByTagName("INPUT");
	for (var i=0; i<cbs.length; i++) {
		var cb = cbs[i];
		if (cb.type == "checkbox") {
			var td = cb.parentNode.nextSibling;
			var tr = td.parentNode;
			var img = td.firstChild;
			var tbody = tr.parentNode;
			collapseDetails(tbody, tr, td, img);
		}
	}
}

function toggleDetails(event) {
	var evt = getEvent(event);
	var img = getSource(evt);
	var visible = (img.src.indexOf(expandURL) == -1);
	var td = img.parentNode;
	var tr = td.parentNode;
	var tbody = tr.parentNode;

	if (visible) collapseDetails(tbody, tr, td, img);
	else expandDetails(tbody, tr, td, img);
}

function expandDetails(tbody, tr, td, img) {
	var visible = (img.src.indexOf(expandURL) == -1);
	if (!visible) {
		var nTD = tr.getElementsByTagName("TD").length;
		var newTR = document.createElement("TR");
		var blankTD = document.createElement("TD");
		blankTD.className = "blankTD";
		newTR.appendChild(blankTD);
		var detailsTD = document.createElement("TD");
		detailsTD.className = "detailsTD";
		detailsTD.colSpan = nTD - 1;

		var abs = tr.md.getElementsByTagName("abstract");
		if (abs.length > 0) {
			importSpecial(detailsTD, abs[0]);
		}

		var docref = tr.md.getAttribute("docref");
		var basepath = docref.substring( 0, docref.lastIndexOf("/")+1 );
		var images = tr.md.getElementsByTagName("images");
		if (images.length > 0) {
			images = images[0].getElementsByTagName("image");
			if (images.length > 0) {
				var p = document.createElement("P");
				for (var i=0; i<images.length; i++) {
					var image = document.createElement("IMG");
					image.className = "detailsIMG";
					image.src = basepath + images[i].getAttribute("src");
					detailsTD.appendChild(image);
				}
			}
		}

		newTR.appendChild(detailsTD);
		tbody.insertBefore(newTR, tr.nextSibling);
		img.src = collapseURL;
		var titleimg = document.getElementById("expandCollapseImg");
		titleimg.src = collapseURL;
	}
}

function collapseDetails(tbody, tr, td, img) {
	var visible = (img.src.indexOf("expand") == -1);
	if (visible) {
		tbody.removeChild(tr.nextSibling);
		img.src = expandURL;
	}
	setExpandCollapse();
}

function importSpecial(dest, node) {
	var type = node.nodeType;
	if (type == 1) {
		var tag = node.tagName.toLowerCase();
		var target = dest;
		if (tag == "p") {
			var p = document.createElement("P");
			dest.appendChild(p);
			target = p;
		}
		else if (tag == "a") {
			var a = document.createElement("A");
			a.href = node.getAttribute("href");
			dest.appendChild(a);
			target = a;
		}
		var child = node.firstChild;
		while (child) {
			importSpecial(target, child);
			child = child.nextSibling;
		}
	}
	else if (type == 3) {
		dest.appendChild( document.createTextNode( node.nodeValue ) );
	}
}

function selectAll() {
	var right = document.getElementById("right");
	var cbs = right.getElementsByTagName("INPUT");
	for (var i=0; i<cbs.length; i++) {
		var cb = cbs[i];
		if (cb.type == "checkbox") cb.checked = true;
	}
}

function selectNone() {
	var right = document.getElementById("right");
	var cbs = right.getElementsByTagName("INPUT");
	for (var i=0; i<cbs.length; i++) {
		var cb = cbs[i];
		if (cb.type == "checkbox") cb.checked = false;
	}
}

function toggleSelect() {
	var cb = document.getElementById("tableHeaderCB");
	if (cb) {
		if (cb.checked) selectAll();
		else selectNone();
	}
}

function displayCN() {
	if (scrollableTable) {
		var tbody = scrollableTable.tbody;
		var cbs = tbody.getElementsByTagName("INPUT");
		var urls = "";
		for (var i=0; i<cbs.length; i++) {
			var cb = cbs[i];
			if ((cb.type == "checkbox") && cb.checked) {
				var td = cb.parentNode.nextSibling;
				var a = td.getElementsByTagName("A")[0];
				var url = a.getAttribute("href");
				if (urls != "") urls += "|";
				urls += url;
			}
		}
		if (urls != "") {
			window.open("/casenav?suppressHome=yes&urls="+encodeURIComponent(urls), "shared");
		}
	}
}

function getQuizSummary() {
	if (scrollableTable) {
		var tbody = scrollableTable.tbody;
		var cbs = tbody.getElementsByTagName("INPUT");
		var urls = "";
		var count = 0;
		for (var i=0; i<cbs.length; i++) {
			var cb = cbs[i];
			if ((cb.type == "checkbox") && cb.checked) {
				var td = cb.parentNode.nextSibling;
				var a = td.getElementsByTagName("A")[0];
				var url = a.getAttribute("href");
				if (urls != "") urls += "|";
				urls += url;
				count++;
			}
		}
		if (count > 0) {
			window.open("/quizsummary?suppressHome=yes&urls="+encodeURIComponent(urls), "shared");
		}
	}
}

function sendToMyRSNA() {
	if (scrollableTable) {
		var tbody = scrollableTable.tbody;
		var cbs = tbody.getElementsByTagName("INPUT");
		var urls = "";
		var count = 0;
		for (var i=0; i<cbs.length; i++) {
			var cb = cbs[i];
			if ((cb.type == "checkbox") && cb.checked) {
				var td = cb.parentNode.nextSibling;
				var a = td.getElementsByTagName("A")[0];
				var url = a.getAttribute("href");
				if (urls != "") urls += "|";
				urls += url;
				count++;
			}
		}
		if (count > 5) {
			if (!confirm("You have selected "+count+" documents.\n"
					   + "Are you sure you want to proceed?")) return;
		}
		if (count > 0) {
			var req = new AJAX();
			req.GET("/myrsna", "urls="+encodeURIComponent(urls)+"&"+req.timeStamp(), null);
			if (req.success()) {
				alert(req.responseText());
			}
			else alert("Unable to export to myRSNA");
		}
	}
}

//************************************************
//Conferences
//************************************************
function loadConferences() {
	confTreeManager =
		new TreeManager(
			"confs",
			"/confs/tree",
			"/mirc/images/plus.gif",
			"/mirc/images/minus.gif");
	confTreeManager.load();
	confTreeManager.display();
	//confTreeManager.expandAll();
}

//************************************************
//File Cabinets
//************************************************
function loadFileCabinets() {
	fileTreeManager =
		new TreeManager(
			"cabs",
			"/files/tree",
			"/mirc/images/plus.gif",
			"/mirc/images/minus.gif");
	fileTreeManager.load();
	fileTreeManager.display();
	//fileTreeManager.expandAll();
}

//************************************************
//Preferences
//************************************************
function preferences() {
	queryIsActive = false;
	var right = document.getElementById("right");
	while (right.firstChild) right.removeChild(right.firstChild);
	var iframe = document.createElement("IFRAME");
	iframe.src = "/prefs?pageui=integrated";
	right.appendChild(iframe);
}

//************************************************
//Download Service
//************************************************
function downloadService() {
	queryIsActive = false;
	deselectAll();
	var linkDiv = document.getElementById("Download");
	if (linkDiv) linkDiv.firstChild.style.fontWeight = "bold";
	var right = document.getElementById("right");
	while (right.firstChild) right.removeChild(right.firstChild);
	var iframe = document.createElement("IFRAME");
	iframe.src = "/download?ui=integrated";
	right.appendChild(iframe);
}

//************************************************
//Author Tools
//************************************************
//Submit Service
function submitService(ssid) {
	startAuthoring(ssid, "submit", "ssvc");
}

//Zip Service
function zipService(ssid) {
	startAuthoring(ssid, "zip", "zsvc");
}

//Basic Author Tool
function basicAuthorTool(ssid) {
	startAuthoring(ssid, "bauth", "bat");
}

//Advanced Author Tool
function advAuthorTool(ssid) {
	startAuthoring(ssid, "aauth", "aat");
}

function showAuthorSummary(ssid) {
	startAuthoring(ssid, "summary", "srpt");
}

function startAuthoring(ssid, context, id) {
	queryIsActive = false;
	deselectAll();
	var linkDiv = document.getElementById(id);
	if (linkDiv) linkDiv.firstChild.style.fontWeight = "bold";
	var right = document.getElementById("right");
	while (right.firstChild) right.removeChild(right.firstChild);
	var iframe = document.createElement("IFRAME");
	iframe.src = "/"+context+"/"+ssid+"?ui=integrated";
	right.appendChild(iframe);
}

//************************************************
//Libraries classes
//************************************************
function LocalLibrary(id, title, authenb, subenb, zipenb ) {
	this.id = id;
	this.title = title;
	this.authenb = authenb;
	this.subenb = subenb;
	this.zipenb = zipenb;
}
LocalLibrary.prototype.toString = function() {
	var s = "id      = "+this.id+"\n" +
			"title   = "+this.title+"\n" +
			"authenb = "+this.authenb+"\n" +
			"subenb  = "+this.subenb+"\n" +
			"zipenb  = "+this.zipenb+"\n";
	return s;
}

function Library(enb, def, addr, svrname, local) {
	this.enabled = (enb=='yes');
	this.deflib = (def=='yes');
	this.address = addr;
	this.name = svrname;
	this.isLocal = (local=='yes');
}

//************************************************
//Cookie functions
//************************************************
function setState() {
	if (user.isLoggedIn) {
		var cookies = getCookieObject();
		setSelectFromCookie("serverselect", cookies);
		setSelectFromCookie("maxresults", cookies);
		setSelectFromCookie("display", cookies);
		setCheckboxFromCookie("icons", cookies);
		setCheckboxFromCookie("unknown", cookies);
	}
	//always include the default libraries
	var svrsel = document.getElementById("serverselect");
	var opts = svrsel.getElementsByTagName("OPTION");
	for (var i=0; i<allServers.length; i++) {
		if (allServers[i].deflib) opts[i].selected = true;
	}
}

function setCookies() {
	if (user.isLoggedIn) {
		setSelectCookie("serverselect");
		setSelectCookie("maxresults");
		setSelectCookie("display");
		setSelectCookie("bgcolor");
		setCheckboxCookie("icons");
		setCheckboxCookie("unknown");
	}
}

function setTextCookie(id) {
	var el = document.getElementById(id);
	if (el != null) {
		var text = el.value;
		setCookie(id, text);
	}
}

function setSelectCookie(id) {
	var el = document.getElementById(id);
	if (el != null) setCookie(id, getOptions(el));
}

function getOptions(el) {
	var text = "";
	var opts = el.getElementsByTagName("OPTION");
	for (var i=0; i<opts.length; i++) {
		if (opts[i].selected) {
			if (text != "") text += ":";
			text += i;
		}
	}
	return text;
}

function setCheckboxCookie(id) {
	var el = document.getElementById(id);
	if (el != null) setCookie(id, el.checked);
}

function setTextFromCookie(id, cookies) {
	var ctext = cookies[id];
	var el = document.getElementById(id);
	if ( (el != null) && (ctext != null) ) {
		el.value = ctext;
	}
}

function setSelectFromCookie(id, cookies) {
	var ctext = cookies[id];
	if (ctext == null) return false;
	var ints = ctext.split(":");
	for (var i=0; i<ints.length; i++) {
		ints[i] = parseInt(ints[i]);
	}
	var el = document.getElementById(id);
	if (el == null) return false;
	var opts = el.getElementsByTagName("OPTION");
	for (var i=0; i<opts.length; i++) {
		opts[i].selected = false;
	}
	for (var i=0; i<ints.length; i++) {
		var k = ints[i];
		if ((k >= 0) && (k < opts.length)) {
			opts[k].selected = true;
		}
	}
	return true;
}

function setCheckboxFromCookie(id, cookies) {
	var ctext = cookies[id];
	var el = document.getElementById(id);
	if ( (el != null) && (ctext != null) ) {
		el.checked = (ctext == "true");
	}
}

function clearQueryFields() {
	var div = document.getElementById("AdvancedQuery");
	var inputs = div.getElementsByTagName("INPUT");
	for (var i=0; i<inputs.length; i++) {
		if (inputs[i].type == "text") inputs[i].value = "";
		else if ((inputs[i].type == "checkbox") &&
				 (inputs[i].name != "showimages") &&
				 (inputs[i].name != "unknown") &&
				 (inputs[i].name != "icons")) inputs[i].checked = false;
	}
	var selects = div.getElementsByTagName("SELECT");
	for (var i=0; i<selects.length; i++) {
		if ((selects[i].name != "serverselect") &&
			(selects[i].name != "orderby") &&
			(selects[i].name != "maxresults") &&
			(selects[i].name != "display") &&
			(selects[i].name != "bgcolor")) selects[i].selectedIndex = 0;
	}
}

