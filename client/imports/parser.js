/**
 * @file
 * Waypoint file parser module for the task creator.
 */
import * as oziOld from './formats/oziOld';
import * as ozi from './formats/ozi';
import * as cup from './formats/cup';
import * as igc from './formats/igc';
import * as geoJson from './formats/geoJson';
import * as tsk from './formats/tsk';
import * as gpx from './formats/gpx';
import * as xctsk from './formats/xctrack';
import * as zip from './formats/zip';
import * as pwca from './formats/pwca';

	var formats = [pwca, oziOld, ozi, cup, igc, geoJson, tsk, xctsk, gpx, zip]; 
	var parse = function(text, source) {
 	var result = formatCheck(text, source);
 	var format = result.format;

    	var fileInfo = format.parse(text, source);
    	var parseInfo = {};

    	if (fileInfo.waypoints) {
		// We destroy past waypoints if there is a task to display.	
		// Or maybe better to keep past Waypoints anyway?
		if (fileInfo.task) {
			Waypoints.remove({});
		}
		// Now inserting current Waypoints.
      		for (var i = 0; i < fileInfo.waypoints.length; i++) {
			// Prevent insert same waypoint multiple time.
			if (!Waypoints.find(fileInfo.waypoints[i]).fetch().length > 0) {
				Waypoints.insert(fileInfo.waypoints[i]);
			}
		}
	}
    
   	/*if (fileInfo.tracks) {
      		var tracksInfos = fileInfo.tracks;
      		var l = tracksInfos.length;
      		var tracksArray = Array();
      		for (var i = 0; i < l; i++) {
        		var track = tracks.addTrack(tracksInfos[i]);
        		tracksArray.push(track);
      		}
      		parseInfo.tracks = tracksArray;
    	}*/
   
    	if (fileInfo.task) {
      		parseInfo.task = fileInfo.task;
      		if (parseInfo.task.turnpoints.length > 0) {
			Turnpoints.remove({});
			for (var i = 0; i < parseInfo.task.turnpoints.length; i++ ) {
				var tp = parseInfo.task.turnpoints[i];
          			var wp = Waypoints.findOne(tp.wp);
				tp.wp._id = wp._id;
				Turnpoints.insert(tp, function(error, result) {
					var T = Turnpoints.findOne(result);
					Task.update({_id: Session.get('taskId')}, {'$push' : {turnpoints : T}});
				});
			}
      		}
    	}
    	return parseInfo;
  }

  var formatCheck = function(text, source) {
    var formatsName = [];
    for (var i = 0; i < formats.length; i++) {
      formatsName.push(formats[i].name);
    }
    
    var result = {
      format : false,
      state : 'error',
      message : 'Waypoints file format unknown. We only support : ' + formatsName.join(" , ") + ' files',
    }

    /*if (waypoints.checkFilename(filename) == false) {
      result.message = 'This file : ' + filename + " is alredy used.";
      result.state = 'warning';
      return result;
    }*/
    
    for (var i = 0; i < formats.length; i++) {
      if (formats[i].check(text, source) == true) {
        result.format = formats[i];
        return result;
      }
    }
    return result;
  }

  export {
    parse,
  }
