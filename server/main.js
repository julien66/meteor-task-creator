import { Meteor } from 'meteor/meteor';

Meteor.startup(() => {
  	// code to run on server at startup
	
	// Do not require acccounts-password and make guests anonymous.
	// @see https://atmospherejs.com/artwells/accounts-guest
	AccountsGuest.anonymous = true;

	var fs = Npm.require('fs');
	var JSONStream = require('JSONStream')
	var basePath = '/home/julien/meteor-task-creator/server/igclib';	
	// Progress Collection stores IGCLib Progress to report to client.
	Progress = new Mongo.Collection('progress');
	Progress._ensureIndex({uid: 1, pid: 1});
	// RaceEvents Collection stores Imported Races from crawler
	RaceEvents = new Mongo.Collection('raceEvents');
	// Task store a single and current Task.
	Task = new Mongo.Collection('task');
	// SnapRace store all snapshot of a Race as returned by IGCLib
	SnapRace = new Mongo.Collection('snapRace');
	SnapRace._ensureIndex({compId: 1, task: 1});
	
	// Publish all RaceEvent given a provider and a year.
	Meteor.publish('raceEvent', function(provider, year) {
  		return RaceEvents.find({provider : provider, year : year}); 
	});

	// Publish a Task given userId.
	Meteor.publish('Task', function() {
		return Task.find({uid : Meteor.userId()});
	});

	// Publish Progress given userId.
	Meteor.publish('Progress', function() {
		return Progress.find({uid : Meteor.userId()});
	});

	// Given a compId and a taskIndex return x SnapRace from a given Time. 
	Meteor.publish('SnapRace', function(compId, task, time) {
		//console.log(compId, task, time);
		/* @todo
		30 is hard coded. Could be better to set more or less.
		Too much means bigger data to push to client.
		Too few means smaller but more frequent push to client.
		Don't know which is better.
		*/
		return SnapRace.find({compId : compId, task : task, time : {$gte : time}}, {sort :{time : 1}, limit : 15});
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
			// @todo call it directly with task encoded.
			var uid = Meteor.userId();
			var child = igclib('optimize', {task : '/tmp/toOptimize.xctsk'});
			child.stdout.on('data', Meteor.bindEnvironment(function(data) {
  				Task.update({_id : taskId, uid : uid}, {'$set' : {'IGCLibOpti' : JSON.parse(data.toString())}});
			}));
			child.stderr.on('data', Meteor.bindEnvironment(function(data) {
				// IGCLib return Progress on stderr.
				// It return an optimised track each time a bit more precise.
				// The object returned is different from full opti above.
				// Looked like quite bad unfortunatly. More bug like.
				//console.log("stderr : " + data.toString());
				/*try {
					var parse = JSON.parse(data.toString());
  					console.log('success : ' + parse + ' JSONlength : ' + data.toString().length);
					Task.update({_id : taskId, uid : uid}, {'$set' : {'IGCLibOpti.points' : parse}});
				}
				catch(e) {
					// Parse Error [opti] [opti] spread by a space is not a valid JSON object. 
					var string = data.toString()
					var parse = string.substring(0, (string.indexOf(']')));
					Task.update({_id : taskId, uid : uid}, {'$set' : {'IGCLibOpti.points' : parse}});
				}*/
			}));
			child.on('close', Meteor.bindEnvironment(function() {
				// On process close, clean all Progress document for this uid, this processId and this type.
			})); 
		},
		'task.request' : function(provider, year, processId) {
			// Method called from autoImporter.js after the form is submitted.
			// Keeping track of the request uid
			var uid = Meteor.userId();
			//Spawn child to igclib.
			var child = igclib('crawl', {provider: provider, year : year});
			child.on('error', Meteor.bindEnvironment(function(err) {
				console.log(err);
			}));
			// On data received...
			child.stdout.on('data', Meteor.bindEnvironment(function(data) {
				// insert ImportedTask.
				if (data) {
					let json = JSON.parse(data.toString());
					// @todo Find a way to return an error to client when data is not parsable.
					// May use a Collection Error with proper pid and action 'crawl' 'replay' 'race' ?
					// Sounds good!
					console.log('stdout : ' + json);
					for (raceEvent in json) {
						var comp = json[raceEvent];
						var query = RaceEvents.findOne({provider : comp.provider, year : comp.year, event : comp.event, tasks : {$size : comp.tasks.length}});
						if (!query) {
							RaceEvents.insert(json[raceEvent]);
						}
					}
				}
			}));
			child.stderr.on('data', Meteor.bindEnvironment(function(data) {
				// Keep track of process progress via "Progress Collection".
				// IGCLib return Progress on stderr.
				Progress.insert({uid : uid, pid : processId, type : 'crawler', created : new Date().toISOString(), progress : data.toString()});
				//console.log('stderr : ' + data);
			}));
			child.on('close', Meteor.bindEnvironment(function() {
				// On process close, clean all Progress document for this uid, this processId and this type.
				// Clean all importedTasks as well.
				Progress.remove({uid : uid, pid : processId, type : 'crawler'});
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
		'task.replay' : function(commands, compId, taskIndex, processId) {
			var uid = Meteor.userId();
			var param = {
				task : '/tmp/toOptimize.xctsk',
				//flights : '/tmp/flights',
				output : '/tmp/replay.igclib',
			};
			// If this race has a raceEvents _id... Then switch the output to store the file properly.
			if (compId) {
				// .igclib extension will create both .json and .pkl file.
				commands.output = '/tmp/replay_' + compId + '_' + taskIndex + '.igclib';
			}
			
			// Check if this task hasn't been replayed already
			var query = SnapRace.findOne({compId : compId, task : taskIndex});
			if (!query) {
				// If not, then proceed with igclib to "Replay".
				// Merge defaut and custom parameters with Object.assign.
				var child = igclib('replay', Object.assign(param, commands));
				child.stdout.on('data', Meteor.bindEnvironment(function(data) {
					// Nothing here. Too much data. File Written directly on server.
				}));
				child.stderr.on('data', Meteor.bindEnvironment(function(data) {
					// Keep track of process progress via "Progress Collection".
					// IGCLib return Progress on stderr.
					Progress.insert({uid : uid, type : 'replay', pid : processId, created : new Date().toISOString(), progress : data.toString()});
					console.log('stderr : ' + data);
				}));	
				child.on('close', Meteor.bindEnvironment(function() {
					//On process close, clean all Progress document for this uid.
					Progress.remove({uid : uid, pid : processId, type : 'replay'});
					// Stream full race to database.
					// Remove all past snapRace docs for this task...
					SnapRace.remove({compId : compId, task : taskIndex});
					// Read replay .json File.
					var read = fs.createReadStream('/tmp/replay_' + compId + '_' + taskIndex +'.json');
					// Use JSONStream.
					var stream = JSONStream.parse( ["race", {'emitKey' : true}]);	
					// Pipe streams.
					read.pipe(stream).on('data', Meteor.bindEnvironment(function(data) {
						// Convert hh:mm:ss to timestamp as s from midnight.
						var time = new Date('1970-01-01T' + data['key']);
						// Insert json Snapshots into mongodb SnapRace collection.
						//console.log('insert : ' + compId + '_' + taskIndex + '_' + time);
						SnapRace.insert({compId : compId, task : taskIndex, time : time, snapshot :  data['value']});
					})).on('header', Meteor.bindEnvironment(function(data) {
						/*var ranking = data.ranking;
						var up = {'$set' : {}};
						// uid <--> name mapping.
						up['$set']['tasks.' + taskIndex + '.task.ranking'] = ranking;
						// @todo insert time at turnpoint (timeline display).
						RaceEvents.update({'_id' : compId}, up);*/
					})).on('close', Meteor.bindEnvironment(function() {
						// Ready.
						// if any source provided. Update RaceEvent Collection :
						console.log('end stream replay');
						var update = {'$set' : {}};
						// Raced attribute so we know tis task has been processed.
						update['$set']['tasks.' + taskIndex + '.task.replay'] = true;
						// Directly go for a Race analysis.
						Meteor.call('task.race', {'path' : '/tmp/compid_'+ compId + '_' + taskIndex + '.pkl'}, compId, taskIndex, processId);
					}));
				}));
			}
		},
		'task.race' : function(commands, compId, taskIndex, processId) {
			var uid = Meteor.userId();
			// Default params for IGCLIB Race.
			var param = {
				path : '/tmp/replay.pkl',
				//flights : '/tmp/flights',
				output : '/tmp/race.igclib',
			};
			// If this race has a raceEvents _id... Then switch the output to store the file properly.
			if (compId) {
				// .igclib extension will create both .json and .pkl file.
				commands.path = '/tmp/replay_' + compId + '_' + taskIndex + '.pkl'
				commands.output = '/tmp/race_' + compId + '_' + taskIndex + '.igclib';
			}
			
			// Check if this task has been raced already
			var query = SnapRace.findOne({compId : compId, task : taskIndex});
			if (query) {
				// If it's the case, then proceed with igclib to "Race".
				// Merge defaut and custom parameters with Object.assign.
				var child = igclib('race', Object.assign(param, commands));
				child.stdout.on('data', Meteor.bindEnvironment(function(data) {
					// Nothing here. Too much data. File Written directly on server.
				}));
				child.stderr.on('data', Meteor.bindEnvironment(function(data) {
					// Keep track of process progress via "Progress Collection".
					// IGCLib return Progress on stderr.
					Progress.insert({uid : uid, type : 'race', pid : processId, created : new Date().toISOString(), progress : data.toString()});
					console.log('stderr : ' + data);
				}));
				child.on('close', Meteor.bindEnvironment(function() {
					//On process close, clean all Progress document for this uid.
					Progress.remove({uid : uid, pid : processId, type : 'race'});
					// Let's stream full race to database.
					// Read Files.
					var read = fs.createReadStream('/tmp/race_' + compId + '_' + taskIndex +'.json');
					// Use JSONStream.
					var stream = JSONStream.parse( ["race", {'emitKey' : true}]);
					// Pipe streams.
					read.pipe(stream).on('data', Meteor.bindEnvironment(function(data) {
						// Convert hh:mm:ss to timestamp as s from midnight.
						var time = new Date('1970-01-01T' + data['key']);
						// Update json Snapshots into mongodb SnapRace collection.
						SnapRace.update({compId : compId, task : taskIndex, time : time}, {$set : {snapshot :  data['value']}});
					})).on('header', Meteor.bindEnvironment(function(data) {
						var ranking = data.ranking;
						var up = {'$set' : {}};
						// uid <--> name mapping.
						up['$set']['tasks.' + taskIndex + '.task.ranking'] = ranking;
						// @todo insert time at turnpoint (timeline display).
						RaceEvents.update({'_id' : compId}, up);
					})).on('close', Meteor.bindEnvironment(function() {
						// Ready.
						// if any source provided. Update RaceEvent Collection :
						console.log('end stream race');
						var update = {'$set' : {}};
						// Raced attribute so we know tis task has been processed.
						update['$set']['tasks.' + taskIndex + '.task.raced'] = true;
						RaceEvents.update({'_id' : compId}, update);
						// @todo... Get rid of replay files ???
					}));
				}));
			}
		},
		'task.watch' : function(id, compId, taskId, processId) {
			var uid = Meteor.userId();
			var child = igclib('watch', {path : '/tmp/race_' + compId + '_' + taskId + '.pkl', pilot : id});
			child.stdout.on('data', Meteor.bindEnvironment(function(data) {
				// Nothing here. Too much data. File Written directly on server.
				console.log('stdout : ' + data);
			}));
			child.stderr.on('data', Meteor.bindEnvironment(function(data) {
				console.log('stderr : ' + data);
			}));
			child.on('close', Meteor.bindEnvironment(function() {
				console.log('watch close');
			}));
		} 
	});
});
