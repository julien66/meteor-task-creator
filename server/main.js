import { Meteor } from 'meteor/meteor';

Meteor.startup(() => {
  	// code to run on server at startup
	
	// Do not require acccounts-password and make guests anonymous.
	// @see https://atmospherejs.com/artwells/accounts-guest
	AccountsGuest.anonymous = true;

	var fs = Npm.require('fs');
	var JSONStream = require('JSONStream')
	var basePath = '/home/julien/meteor-task-creator/server/igclib';	
	Progress = new Mongo.Collection('progress');
	RaceEvents = new Mongo.Collection('raceEvents');
	Task = new Mongo.Collection('task');
	SnapRace = new Mongo.Collection('snapRace');
	
	//ZipProgress = new Mongo.Collection('zipProgress');

	Meteor.publish('raceEvent', function(provider, year) {
  		return RaceEvents.find({provider : provider, year : year}); 
	});

	Meteor.publish('Task', function() {
		return Task.find({uid : Meteor.userId()});
	});

	Meteor.publish('Progress', function() {
		return Progress.find({uid : Meteor.userId()});
	});

	Meteor.publish('SnapRace', function(compId, task, time) {
		//console.log(compId, task, time);
		/* @todo
		30 is hard coded. Could be better to set more or less.
		Too much means bigger data to push to client.
		Too few means smaller but more frequent push to client.
		Don't know which is better.
		*/
		return SnapRace.find({compId : compId, task : task, time : {$gte : time}}, {sort :{time : 1}, limit : 30});
	});	
	
	// Child Process for IGCLIB.
	const { spawn } = require('child_process');

	// Helper function to write a file. Ready to be wrapped. 
	var fileWrite = function(path, buffer, callback) {
  		// callback has the form function (err, res) {}
		fs.writeFile(path, buffer, function(error){
			if (!error) {
				callback(null, 'success');
			}
		});
	};	

	// Helper function to command igc lib
	var igclib = function(mode, data, callback) {
		var command = 'igclib ' + mode + ' --progress ratio';
		for (let [key, value] of Object.entries(data)) {
  			command += ' --' + key + ' ' + value;
		};
		console.log(command);
		var child = spawn(command, {shell : true});
		return child;
	}

	// Wrapped function
	var syncFileWrite = Meteor.wrapAsync(fileWrite);

	Meteor.methods({
		'task.writeTask' : function(buffer) {
			// Method called from exporter.js after task is ready to write on xctrack format.
			// We'll send it to igclib for optimisation.
			// Calling wrapped function so the result can be returned to client.	
			var uid = Meteor.userId();	
			var res = syncFileWrite('/tmp/toOptimize.xctsk', new Buffer(buffer));
			return res;
		},
		'task.optimize' : function(taskId) {
			// Method called from exporter.js after task has been succesfully written to server.
			var uid = Meteor.userId();
			var child = igclib('optimize', {task : '/tmp/toOptimize.xctsk'});
			child.stdout.on('data', Meteor.bindEnvironment(function(data) {
				console.log(data);
  				Task.update({_id : taskId, uid : uid}, {'$set' : {'IGCLibOpti' : JSON.parse(data.toString())}});
				console.log(data.toString());
			}));
			child.stderr.on('data', (data) => {
				// Log progress in.
  				console.log(`child stderr:\n${data}`);
			});
		},
		'task.request' : function(provider, year) {
			// Method called from autoImporter.js after the form is submitted.
			// Keeping track of the request uid
			var uid = Meteor.userId();
			//Spawn child to igclib.
			var child = igclib('crawl', {provider: provider, year : year});
			// On data received...
			child.stdout.on('data', Meteor.bindEnvironment(function(data) {
				// insert ImportedTask.
				if (data) {
					console.log(data);
					let json = JSON.parse(data.toString());
					console.log('stdout : ' + json);
					for (raceEvent in json) {
						var comp = json[raceEvent];
						var query = RaceEvents.findOne({provider : comp.provider, year : comp.year, event : comp.event, tasks : {$size : comp.tasks.length}});
						console.log(query);
						if (!query) {
							console.log('insert');
							RaceEvents.insert(json[raceEvent]);
						}
					}
					//data: JSON.parse(data.toString()), 
				}
			}));
			child.stderr.on('data', Meteor.bindEnvironment(function(data) {
				// Keep track of process progress via "Progress Collection".
				// IGCLib return Progress on stderr.
				Progress.insert({uid : uid, type : 'crawler', created : new Date().toISOString(), progress : data.toString()});
				//console.log('stderr : ' + data);
			}));
			child.on('close', Meteor.bindEnvironment(function() {
				//On process close, clean all Progress document for this uid.
				// Clean all importedTasks as well.
				Progress.remove({uid : uid, type : 'crawler'});
				//ImportedTasks.remove({uid : uid});
			})); 
		},
		'task.newZip' : function(buffer) {
			// Get new zip data and write it all on /tmp.
			fs.writeFile('/tmp/flights.zip',new Buffer(buffer), Meteor.bindEnvironment(function(error) {
				console.log(error);
				var unzipper = new DecompressZip('/tmp/flights.zip')
				// Add the error event listener
                		unzipper.on('error', function (err) {
                    			console.log('Caught an error', err);
                		});
                
                		// When everything is extracted. Clean Progress collection.
                		unzipper.on('extract', function (log) {
                    			console.log('Finished extracting', log);
					Progress.remove({uid : uid, type : 'zip'});
                		});
                
                		// On progress... Store Progress collection.
                		unzipper.on('progress', function (fileIndex, fileCount) {
                    			console.log('Extracted file ' + (fileIndex + 1) + ' of ' + fileCount);
					var percent = (fileIndex + 1) / fileCount ;
					Progress.insert({uid: uid, type: 'zip', progress :  percent});
				});

				unzipper.extract({
                    			path: '/tmp/flights'
                		});
			}));
			//
			return true;
		},
		'task.test' : function() {
			SnapRace.remove({});
			RaceEvents.remove({});
			Progress.remove({});
			/*var compId = 'mwBxqYiYnGZDacMEp';
			var taskIndex = 0;	
			var read = fs.createReadStream('/tmp/race_' + compId + '_' + taskIndex +'.json');
			
			var stream = JSONStream.parse( ["race", {'emitKey' : true}]);	
			// Piping streams.
			read.pipe(stream).on('data', Meteor.bindEnvironment(function(data) {
				// Convert hh:mm:ss to timestamp as s from midnight.
				var time = new Date('1970-01-01T' + data['key']);
				// Insert json race into mongodb race collection.
				SnapRace.insert({compId : compId, task : taskIndex, time : time, snapshot :  data['value']});
			})).on('header', Meteor.bindEnvironment(function(data) {
				var ranking = data.ranking;
				var update = {'$set' : {}};
				update['$set']['tasks.' + taskIndex + '.task.ranking'] = ranking;
				RaceEvents.update({'_id' : compId}, update);
			})).on('end', Meteor.bindEnvironment(function() {
			}));*/
			
			
			/*var read = fs.createReadStream('/tmp/race_sadgEvPYAYtmy5BPq_5.json');
			// Using JSONStream.
			//var stream = JSONStream.parse( ["snapshots", {'emitKey' : true}]);	
			var stream = JSONStream.parse( ["race", {'emitKey' : true}]);	
			// Piping streams.
			read.pipe(stream).on('data', Meteor.bindEnvironment(function(data) {
				// Convert hh:mm:ss to timestamp as s from midnight.
				var time = new Date('1970-01-01T' + data['key']);
				// Insert json race into mongodb race collection.
				console.log('insert :' + time);
				SnapRace.insert({compId : 'sadgEvPYAYtmy5BPq', task : taskIndex, time : time, snapshot :  data['value']});
			})).on('end', Meteor.bindEnvironment(function() {
				// Ready.
			}));*/
		},
		'task.race' : function(commands, compId, taskIndex) {
			var uid = Meteor.userId();
			// Default params for IGCLIB Race.
			var param = {
				task : '/tmp/toOptimize.xctsk',
				//flights : '/tmp/flights',
				output : '/tmp/race.json',
			};
			// If this race has a raceEvents _id... Then switch the output to store the file properly.
			if (compId) {
				commands.output = '/tmp/race_' + compId + '_' + taskIndex + '.json';
			}
			
			// Check if this task hasn't been raced already
			var query = SnapRace.findOne({compId : compId, task : taskIndex});
			if (!query) {
				// If not, then proceed with igclib to "Race".
				// Merge defaut and custom parameters with Object.assign.
				var child = igclib('race', Object.assign(param, commands));
				child.stdout.on('data', Meteor.bindEnvironment(function(data) {
					// Nothing here. Too much data. File Written directly on server.
				}));
				child.stderr.on('data', Meteor.bindEnvironment(function(data) {
					// Keep track of process progress via "Progress Collection".
					// IGCLib return Progress on stderr.
					Progress.insert({uid : uid, type : 'race', created : new Date().toISOString(), progress : data.toString()});
					console.log('stderr : ' + data);
				}));
				child.on('close', Meteor.bindEnvironment(function() {
					//On process close, clean all Progress document for this uid.
					Progress.remove({uid : uid, type : 'race'});
					// Stream full race to database.
					// Remove all past snapRace docs for this task...
					SnapRace.remove({compId : compId, task : taskIndex});
					// Read Files.
					var read = fs.createReadStream('/tmp/race_' + compId + '_' + taskIndex +'.json');
					// Use JSONStream.
					var stream = JSONStream.parse( ["race", {'emitKey' : true}]);	
					// Pipe streams.
					read.pipe(stream).on('data', Meteor.bindEnvironment(function(data) {
						// Convert hh:mm:ss to timestamp as s from midnight.
						var time = new Date('1970-01-01T' + data['key']);
						// Insert json Snapshots into mongodb SnapRace collection.
						SnapRace.insert({compId : compId, task : taskIndex, time : time, snapshot :  data['value']});
					})).on('header', Meteor.bindEnvironment(function(data) {
						var ranking = data.ranking;
						var up = {'$set' : {}};
						// uid <--> name mapping.
						up['$set']['tasks.' + taskIndex + '.task.ranking'] = ranking;
						// @todo insert time at turnpoint (timeline display).
						RaceEvents.update({'_id' : compId}, up);
					})).on('end', Meteor.bindEnvironment(function() {
						// Ready.
					}));
					// if any source provided. Update RaceEvent Collection :
					var update = {'$set' : {}};
					// Raced attribute so we know tis task has been processed.
					up['$set']['tasks.' + taskIndex + '.task.raced'] = true;
					RaceEvents.update({'_id' : compId}, update);
				}));
			}
		}
	});
});
