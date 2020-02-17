/**
 * @file
 * Waypoint file parser module for the task creator.
 */
import * as openair from './formats/openair'
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
import * as Validator from './validateTask';

	var formats = [openair, pwca, oziOld, ozi, cup, igc, geoJson, tsk, xctsk, gpx, zip]; 
	var parse = function(text, source) {
 	var result = formatCheck(text, source);
 	var format = result.format;

    	var fileInfo = format.parse(text, source);
    	var parseInfo = {};
	
	Files.insert({filename : source, format : format.name, infos : fileInfo});

    	if (fileInfo.waypoints) {
		// We destroy past waypoints if there is a task to display.	
		// Or maybe better to keep past Waypoints anyway?
		if (fileInfo.task) {
			Waypoints.remove({});
		}
		// Now inserting current Waypoints.
      		for (var i = 0; i < fileInfo.waypoints.length; i++) {
			// Prevent insert same waypoint multiple time.
			var waypoint = fileInfo.waypoints[i];
			if (!Waypoints.find({lat : waypoint.lat, lon : waypoint.lon}).fetch().length > 0) {
				Waypoints.insert(waypoint);
			}
		}
	}
   
	if (fileInfo.airspaces) {
      		for (var i = 0; i < fileInfo.airspaces.length; i++) {
			var airspace = fileInfo.airspaces[i];
			Airspaces.insert(airspace);
		}
	}
   	
	if (fileInfo.tracks) {
      		for (var i = 0; i < fileInfo.tracks.length; i++) {
        		Tracks.insert(fileInfo.tracks[i]);
      		}
    	}
   
    	if (fileInfo.task) {
		// Task reference from parser.
      		var task = fileInfo.task;
		// Cache for Mongo turnpoints documents.
		var turnpointsArray =[];
		// If there are turnpoints.
      		if (task.turnpoints.length > 0) {
			// Remove all past turnpoints. We want to rebuild a task.
			Turnpoints.remove({});
			Task.update({_id : Session.get('taskId')}, {$set : {turnpoints : []}});
			// for Each turnpoints into new task.
			task.turnpoints.forEach(function (turnpoint) {
				// Find the matching waypoint.
				var waypoint = Waypoints.findOne({lat : turnpoint.wp.lat, lon : turnpoint.wp.lon});
				// Store waypoints id as reference.
				turnpoint.wp._id = waypoint._id;
				// Insert turnpoint into Mongo.
				Turnpoints.insert(turnpoint, function(error, result) {
					// Get full document turnpoint.
					var T = Turnpoints.findOne(result);
					// Cache full document Turnpoint.
					turnpointsArray.push(T);
					// When all document turnpoints are correctly cached into turnpoints Array.
					if (turnpointsArray.length == task.turnpoints.length) {
						// Update whole Task document.
						Task.update({_id: Session.get('taskId')}, {'$set' : {
							close : task.close,
							end : task.end,
							open : task.open,
							start : task.start,
							turnpoints : turnpointsArray
						}});
						// Run a Validator check on the Task
						Validator.check();
						// Call the optimizer.
						Meteor.call('task.optimiser', Session.get('taskId'), Session.get('processId'));
					}
				});
			});	
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
