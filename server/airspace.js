/**
 * @JS File for the Arispace.
 */
import * as Openair from '../imports/formats/openair.js';

Meteor.startup(() => {
	Airspaces = new Mongo.Collection('airspaces');

	// Deny all client-side updates on the Airspaces collection.
	Airspaces.deny({
		insert() { return true; },
		update() { return true; },
		remove() { return true; },
	});

	Meteor.publish('airspaces', function() {
		return Airspaces.find({}, {sort : {class : 1}});
	});

	var fs = Npm.require('fs');
	const { spawn } = require('child_process');

	Airspaces.remove({});
	// Check environement variable DEFAULT_AIRSPACE to get path.
	var child = spawn('printenv DEFAULT_AIRSPACE', {shell : true});
	child.stdout.on('data', Meteor.bindEnvironment(function(data) {
		// Now get path output.
		var path = JSON.parse(data.toString());
		// Get some file stats.
		fs.stat(path, Meteor.bindEnvironment(function(err, stats) {
			// File birthtime
			var birth = stats.birthtimeMs;
			//Check if an Airspace has this bithdate.
			var airspace = Airspaces.findOne({birthTime: birth});
			// Now if there is no Airspaces from this file...
			if (!airspace) {
				// read file.
				fs.readFile(path, Meteor.bindEnvironment(function(err, data) {
					if (data) {
						var chunk = data.toString();
						// Parse Openair. Same module than client.
						var obj = Openair.parse(chunk, 'FFVV');
						var airspaces = obj.airspaces;
						for (var i in airspaces) {
							var air = airspaces[i];
							if (!air.floor) {
								// No airspace without floor.
								continue;
							}
							// add birth Time to the zone.
							air.birthTime = birth;
							Airspaces.insert(air);
						}
						// We remove all past Airspaces (where birthDate is not current)
						Airspaces.remove({birthTime: {$ne : birth}});
					}
				}));
			}
		}));
	}));
	child.stderr.on('data', function(data) {
		console.log(JSON.parse(data.toString));
	})
});
