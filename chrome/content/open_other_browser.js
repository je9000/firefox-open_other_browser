window.addEventListener("load",function(){open_other_browser.init();},false); // call this function on opening a window
var open_other_browser={
pref: Components.classes['@mozilla.org/preferences-service;1'].getService(Components.interfaces.nsIPrefService),
defaultpath: "C:\\",
init: function(){ // sets up event listeners
	document.getElementById("contentAreaContextMenu").addEventListener("popupshowing", function(){open_other_browser.context();}, false); // call context() when the context menu is opened
	window.addEventListener("DOMContentLoaded", function(aEvent){open_other_browser.always(aEvent);}, false); // call always() when a page is loaded
    this.compile_re();
},
getCharPref: function(prefname, value){
	try {value=this.pref.getCharPref(prefname);} // get pref
	catch(e) {this.pref.setCharPref(prefname, value);} // if pref doesnt exist, create it
	return value;
},
getBoolPref: function(prefname, value){
	try {value=this.pref.getBoolPref(prefname);} // get pref
	catch(e) {this.pref.setBoolPref(prefname, value);} // if pref doesnt exist, create it
	return value;
},
launch: function (href, override){ // launch page in Google Chrome
	if(this.getBoolPref("open_other_browser.close", false)) { //||override) { // if pref is set to close tab automatically or this site is on the always list
		if(gBrowser.browsers.length<2) window.close(); // if there are less than 2 tabs, close the window
		else gBrowser.removeCurrentTab(); // remove tab
	}
	var targetFile=Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
	targetFile.initWithPath(this.getCharPref("open_other_browser.path", this.defaultpath)); // load path from pref into object
	if (!targetFile.exists()) // if file doesn't exist display message
	{
		alert("Executable does not exist.");
		return;
	}
	var process=Components.classes['@mozilla.org/process/util;1'].createInstance(Components.interfaces.nsIProcess);
	var extra=this.getCharPref("open_other_browser.extra", ""); // extra parameters
	var param=new Array();
	if(extra!="") {// add parameters if pref is not blank
		var start=(extra[0]=='"'); // true if params start with a quote
		extra=extra.split('"'); // split based on quotes
		// if the first parameter is a quote, extra[0] will be blank, and extra[1] will be in quotes. if the first parameter is not a quote, extra[0] will not be in quotes, but extra[1] will. either way, the odd index positions will always be in qutoes. just skip the blank extra[0] if start is true.
		for(var x=(start?1:0); x<extra.length; x++) { // loop through array. if start is true, extra[0] will be blank, so start at 1. otherwise, start at 0
			if(x%2!=0) param.push(extra[x]); // if in quotes, load into param array
			else {// if not in quotes
				var extra2=extra[x].split(' '); // split by space
				for(var y=0; y<extra2.length; y++) param.push(extra2[y]); // load into param array
			}
		}
	}
	param.push(href); // add address
	process.init(targetFile);
	process.run(false, param, param.length, {}); // launch executable
},
context: function(){ // control which context menu item is show
	document.getElementById("openpagecontext").hidden=gContextMenu.isTextSelected||gContextMenu.onLink||gContextMenu.onImage||gContextMenu.onTextInput; 
	document.getElementById("openlinkcontext").hidden=!gContextMenu.onLink; // no link, no item
	if(gContextMenu.onLink) document.getElementById("openlinkcontext").setAttribute("disabled", gContextMenu.getLinkURL().indexOf("javascript:")==0); // disable javascript: link
},
always: function (aEvent){ // launch pages on always list
    if(!aEvent.target || !(aEvent.target instanceof HTMLDocument)) return;
	var url=gBrowser.currentURI.spec;
    if(this.last_opened_url && url == this.last_opened_url) return;
    this.last_opened_url = url;

    if (!this.compiled_res) {
    	var list=this.getCharPref("open_other_browser.always", "").split("\t"); // always list
    	for(var x = 0; list[x]; x++)
        {
            try {
                var re = new RegExp(list[x]);
                if (re.test(url)) {
                    this.launch(url, true);
                    return;
                }
            } catch(e) {
                alert("Invalid regular expression: " + list[x]);
            }
    	}
    } else {
    	for(var x = 0; this.compiled_res[x]; x++)
        {
            if (this.compiled_res[x].test(url)) {
                this.launch(url, true);
                return;
            }
    	}
    }
},
startup: function(){ // fill in fields in options menu
	document.getElementById('chromeloc').value=this.getCharPref("open_other_browser.path", this.defaultpath); // fill in location
	document.getElementById('params').value=this.getCharPref("open_other_browser.extra", ""); // fill in parameters

	var listbox=document.getElementById("alwayslist");
	var list=this.getCharPref("open_other_browser.always", "").split("\t");
	for(var x=0; list[x]; x++) listbox.appendItem(list[x]); // load list into box

	document.getElementById('autoclose').checked=this.getBoolPref("open_other_browser.close", false); // set autoclose checked state
},
accept: function(){ // save options
	if(document.getElementById('chromeloc').value.length>0) this.pref.setCharPref("open_other_browser.path", document.getElementById('chromeloc').value); // save path to pref
	else this.pref.setCharPref("open_other_browser.path", this.defaultpath); // if blank, set to default
	this.pref.setCharPref("open_other_browser.extra", document.getElementById('params').value); // save parameters

	var listbox=document.getElementById("alwayslist");
	var rows=listbox.getRowCount();
	var result=[];
	for(var x=0; x<rows; x++) result[x]=listbox.getItemAtIndex(x).label; // loop through rows and put into array
	this.pref.setCharPref("open_other_browser.always", result.join("\t")); // add delimiters and load into pref
	this.pref.setBoolPref("open_other_browser.close", document.getElementById('autoclose').checked); // save autoclose status
    this.compile_re();
},
picker: function(){ // browse menu
	var picker=Components.classes["@mozilla.org/filepicker;1"].getService(Components.interfaces.nsIFilePicker);

	picker.init(window, "Choose Executable", 0);
	picker.appendFilters(64);
	picker.appendFilters(1);

	if(picker.show()==0) document.getElementById('chromeloc').value=picker.file.target; // load path into field
},
updatebutton: function(){ // update status of add and delete buttons
	document.getElementById("deletealwaysitem").disabled=document.getElementById("alwayslist").selectedItems.length<1; // if no items are selected, disable delete button
	document.getElementById("addalwaysitem").disabled=document.getElementById("newalwaysitem").value.length<1; // if field is blank, disable add button
},
deleteitems: function(){ // remove items from always list
	var listbox=document.getElementById("alwayslist");
	var selected=listbox.selectedItems; // selected fields
	var index=new Array();
	for(var x=0; x<selected.length; x++) index[x]=listbox.getIndexOfItem(selected[x]); // compile array of indexes
	index.sort(function(a,b){return b-a;}); // sort array to delete from the bottom up
	for(var x=0; x<index.length; x++) listbox.removeItemAt(index[x]); // remove items
	this.updatebutton(); // update delete button status
},
additems: function(){ // add items to always list
	var listbox=document.getElementById("alwayslist");
	listbox.appendItem(document.getElementById("newalwaysitem").value); // add item to list
	document.getElementById("newalwaysitem").value=""; // blank add field
	this.updatebutton(); // update button status
},
compile_re: function() {
	var list=this.getCharPref("open_other_browser.always", "").split("\t"); // always list
    this.compiled_res = new Array();
    
	for(var x = 0; list[x]; x++)
    {
        try {
            this.compiled_res.push(new RegExp(list[x]));
        } catch(e) {
            alert("Invalid regular expression: " + list[x]);
        }
	}
}
}
