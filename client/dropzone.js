/**
 * @file
 * Task-creator Dropzone
 */
import  * as fileParser from './imports/parser';

var reader = new FileReader();
var filename;

reader.onload = function(e) {
	var text = reader.result;
	parse(text);
}
  
var parse = function(text) {
 	var parseInfo = fileParser.parse(text, filename);
	if (parseInfo.waypoints) {
		var e = document.createEvent("CustomEvent");
    	e.initCustomEvent('newWaypointFile', false, false, {
			waypoints : parseInfo.waypoints,
    	});
    	document.dispatchEvent(e);
  	}
    
 	if (parseInfo.tracks) {
		var e = document.createEvent("CustomEvent");
    	e.initCustomEvent('newTrackFile', false, false, {
			tracks : parseInfo.tracks,
    	});
    	document.dispatchEvent(e); 
  	}

	if (parseInfo.task) {
		var e = document.createEvent("CustomEvent");
    e.initCustomEvent('newTask', false, false, {
      waypoints : parseInfo.waypoints,
      task : parseInfo.task,
    });
    document.dispatchEvent(e); 
	}
};

Template.dropzone.onRendered(function () {
	var options = _.extend( {}, Meteor.Dropzone.options, this.data );  
	// if your dropzone has an id, you can pinpoint it exactly and do various client side operations on it.
 	if (this.data.id) {
		var self = this;
		this.dropzone.on('addedfile', function(file) {
			filename = file.name;
			if (filename.split('.').pop().toLowerCase() == 'zip') {
				// Don't read !! Send to server.
				console.log('go to server');
				console.log(file);
			}
			else {
				reader.readAsText(file);
			}
			self.dropzone.removeFile(file);
		});
	}
});
