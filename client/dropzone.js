/**
 * @file
 * Task-creator Dropzone
 */
import  * as fileParser from './imports/parser';

var reader = new FileReader();
var filename;

reader.onload = function(e) {
	var data = reader.result;
	if (data instanceof ArrayBuffer) {
		// If data is an ArrayBuffer, send to server we'll replicate the zip there.
		var buffer = new Uint8Array(data);
		$('.dz-message').html('<i class="fa fa-inbox fa-3x"></i> Unzipping.');
	
		Meteor.call('task.newZip', buffer, function(error, result) {
			if (result) {
				$('.dz-message').html('Drop files (or click) here')
				Session.set('trackFile', true);
				// @todo check if task is valid
				if (Session.get('validTask')) {
					Meteor.call('task.race', function(error, result) {
						//console.log("race");
					});
				}
			}
		});
	}
	else {
		// For other data type (text) -> Parse directly
		parse(data);
	}
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
				reader.readAsArrayBuffer(file);
				dzMessage = $('dz.message').html();
				$('.dz-message').html('<i class="fa fa-cog fa-spin fa-3x"></i> Uploading.');
			}
			else {
				reader.readAsText(file);
			}
			reader.addEventListener('progress', handleProgress);
			self.dropzone.removeFile(file);
		});
	}
});

function handleProgress(event) {
	var percent = (event.loaded*100)/event.total;
}
