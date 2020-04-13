/**
 * @file
 * Waypoint file parser module for the task creator.
 */
import * as openair from '../../imports/formats/openair'
import * as oziOld from '../../imports/formats/oziOld';
import * as ozi from '../../imports/formats/ozi';
import * as cup from '../../imports/formats/cup';
import * as igc from '../../imports/formats/igc';
import * as geoJson from '../../imports/formats/geoJson';
import * as tsk from '../../imports/formats/tsk';
import * as gpx from '../../imports/formats/gpx';
import * as xctsk from '../../imports/formats/xctrack';
import * as zip from '../../imports/formats/zip';
import * as pwca from '../../imports/formats/pwca';
import * as jsonRace from '../../imports/formats/jsonRace';
import * as Validator from './validateTask';

	var formats = [jsonRace, openair, pwca, oziOld, ozi, cup, igc, geoJson, tsk, xctsk, gpx, zip]; 
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
				waypoint.source = source;
				Waypoints.insert(waypoint);
			}
		}
	}
   
	if (fileInfo.airspaces) {
      		for (var i = 0; i < fileInfo.airspaces.length; i++) {
			var airspace = fileInfo.airspaces[i];
			// Insert is done only localy. _collection ensure it's not push to the server.
			Airspaces._collection.insert(airspace);
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
				var waypoint = Waypoints.findOne({lat : turnpoint.lat, lon : turnpoint.lon});
				// Store waypoints id as reference.
				turnpoint.wp = waypoint;
				// Set role to uppercase.
				turnpoint.role = turnpoint.role.toUpperCase();
				// Set turnpoint source.
				turnpoint.source = source;
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
							close : task.takeoff ? task.takeoff.close : null,
							end : task.goal ? task.goal.close : null,
							open : task. takeoff ? task.takeoff.open : null,
							start : task.start ? task.start.open : null,
							turnpoints : turnpointsArray,
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
