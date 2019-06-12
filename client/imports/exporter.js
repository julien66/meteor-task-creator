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

console.log(xctsk.name);
console.log(kml.name);
console.log(kml);
console.log(xctsk);

var exportFile = function(type, formatName, wpSelected) {
	var entity = (type === 'waypoints') ? wpFormats : taskFormats;
	var formatObject = $.grep(entity, function(e){ console.log(e.name, formatName);return e.name == formatName; })[0];
	
	if (type === 'wps') {
		var waypoints = Waypoints.find({'_id' : {'$in' : wpSelected}}).fetch();
		var blob = formatObject.exporter(waypoints);
	}
	else {
		var task = Task.findOne();
		var blob = formatObject.exporter(task);
	}

  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = "waypoints" + formatObject.extension;
  var event = document.createEvent("MouseEvents");
	event.initMouseEvent("click", true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
	a.dispatchEvent(event);
}

export {
	exportFile,
}
