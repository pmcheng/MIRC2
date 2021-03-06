function loaded() {
	if (ui == "classic") {
		var tools = new Array();
		tools[tools.length] = new PopupTool("/icons/save.png", "Create the MIRCdocument and open it in the editor", null, save);
		tools[tools.length] = new PopupTool("/icons/home.png", "Return to the home page", "/query", null);
		setPopupToolPanel( tools );
	}
	templateChanged();
}
window.onload = loaded;

function templateChanged() {
	var selectElement = document.getElementById("templatename");
	var options = selectElement.getElementsByTagName("OPTION");
	var filename = tokens[selectElement.selectedIndex];

	var img = document.getElementById("tokenIMG");
	img.src = "/aauth/token?file="+encodeURIComponent(filename);
}

//Submit the request
function save() {
	checkText("name");
	checkText("affiliation");
	checkText("contact");

	var selectElement = document.getElementById("libSelect");
	if (selectElement) ssid = selectElement.value;

	var form = document.getElementById("formID");
	form.action = "/aauth/"+ssid;
	if (ui == "integrated")
		form.target = "_self";
	else
		form.target = "editor";

	form.submit();
}

//Process a single text input field,
//making sure that it is well-formed.
function checkText(id) {
	var elem = document.getElementById(id);
	if (elem) elem.value = filter(elem.value);
}

//Fix up <br> and <hr> elements to make them well-formed.
//Escape any angle brackets in element value text.
function filter(text) {
	var t = text;
	t = t.replace(/<br[\s]*>/g,"<br/>").replace(/<\/br[\s]*>/g,"");
	t = t.replace(/<hr[\s]*>/g,"<hr/>").replace(/<\/hr[\s]*>/g,"");
	t = t.replace(/\&/g,"&amp;");
	var s = "";
	var tag;
	while ((tag = findTag(t)) != null) {
		s += t.substring(0,tag.index).replace(/>/g,"&gt;").replace(/</g,"&lt;") + tag[0];
		t = t.substring(tag.index + tag[0].length);
	}
	return s + t.replace(/>/g,"&gt;").replace(/</g,"&lt;");
}

function findTag(s) {
	var tagExp = /<[\/]?[A-Za-z][\w\-]*(\s+[A-Za-z][\w\-]*\s*=\s*\"[^\"]*\")*\s*[\/]?\s*>/;
	return s.match(tagExp);
}
