/**
 * @file
 * JS file exporter
 */
import * as oziOld from './formats/oziOld';
import * as ozi from './formats/ozi';
import * as cup from './formats/cup';
import * as igc from './formats/igc';
import * as geoJson from './formats/geoJson';
import * as tsk from './formats/tsk';
import * as gpx from './formats/gpx';
import * as xctsk from './formats/xctrack';
import * as kml from './formats/kml';

var wpFormats = [ozi, cup, gpx];
var taskFormats = [xctsk, tsk, kml];

var exportFile = function(type, formatName, wpSelected, server) {
	console.log(formatName);
	var entity = (type === 'waypoints') ? wpFormats : taskFormats;
	console.log(entity);
	var formatObject = $.grep(entity, function(e){ return e.name == formatName; })[0];
	console.log(formatObject);
	if (type === 'waypoints') {
		var waypoints = Waypoints.find({'_id' : {'$in' : wpSelected}}, {sort : {id : 1}}).fetch();
		var blob = formatObject.exporter(waypoints);
	}
	else {
		var task = Task.findOne();
		var blob = formatObject.exporter(task);
	}

	var date = new Date();
	var year = date.getFullYear();
	var month = date.getMonth() + 1;
	var day = date.getDate();
	var hour = date.getHours();
	var minutes = date.getMinutes();

	if (!server) {
 		var a = document.createElement('a');
  		a.href = URL.createObjectURL(blob);
  		a.download = type + "_" + day + '-' + month + '-' + year + '_' + hour + 'H:' + minutes + formatObject.extension;
  		var event = document.createEvent("MouseEvents");
		event.initMouseEvent("click", true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
		a.dispatchEvent(event);
	}
	else {
		blob.arrayBuffer().then(function(data) {
			console.log(data);
			var buffer = new Uint8Array(data);
			Meteor.call('task.writeTask', buffer, 'optimize');
		});
	}
}
export {
	exportFile,
}
