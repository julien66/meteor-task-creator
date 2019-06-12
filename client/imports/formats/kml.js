/**
 * @file
 * KML format for the task creator.
 */
import './export/kml.html';

  var check = function(text, filename) {
    return false;
    // ToDo
  }

  var parse = function(text, filename) {
    // ToDo
  }

  var exporter = function(task) {
    var fastWaypoints = taskInfo.fastWaypoints.map(function(point){
      return point.lng() + ',' + point.lat() + ',' + '1';
    });
   
		var data = '<?xml version="1.0" encoding="utf-8" ?>';
    data += Blaze.toHTMLWithData(Template.exportKML, {task : task});
    return new Blob([data], {'type': "text/xml"});
  }

	let name = 'KML';
	let extnesion = '.kml';

   export {
    check,
    exporter,
    extension,
    name,
    parse,
  }

