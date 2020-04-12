import { Meteor } from 'meteor/meteor';

Meteor.startup(() => {
  	// code to run on server at startup	
	// Do not require acccounts-password and make guests anonymous.
	// @see https://atmospherejs.com/artwells/accounts-guest
	AccountsGuest.anonymous = true;

	var fs = Npm.require('fs');
	var oboe = require('oboe');
	// Progress Collection stores IGCLib Progress to report to client.
	Progress = new Mongo.Collection('progress');
	// RaceEvents Collection stores Imported Races from crawler
	RaceEvents = new Mongo.Collection('raceEvents');
	// Task store a single and current Task.
	Task = new Mongo.Collection('task');
	// SnapRace store all snapshot of a Race as returned by IGCLib
	SnapRace = new Mongo.Collection('snapRace');
	SnapRace._ensureIndex({compId: 1, time: 1});
	
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
		return Progress.find({uid : Meteor.userId()}, {sort : {created : -1}, limit : 1});
	});

	// Given a compId and a taskIndex return x SnapRace from a given Time. 
	Meteor.publish('SnapRace', function(compId, task, time, limit) {
		//console.log(compId, task, time);
		/* @todo
		30 is hard coded. Could be better to set more or less.
		Too much means bigger data to push to client.
		Too few means smaller but more frequent push to client.
		Don't know which is better.
		*/
		if (!limit || limit > 30) {
			limit = 30;
		}
		return SnapRace.find({compId : compId, task : task, time : {$gte : time}}, {sort :{time : 1}, limit : limit});
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
		'task.updateTurnpoint' : function(taskId, turnpoint) {
			// Method called from turnpoint.js when turnpoint update form is send.
			// Grab userId.
			var uid = Meteor.userId();
			// Update given Task, for this uid, and replace given turnpoint found by id with new turnpint object.
			Task.update({_id : taskId, uid : uid,  'turnpoints._id' : turnpoint._id}, {'$set' : {'turnpoints.$' : turnpoint}});
		},
		/*'task.writeTask' : function(buffer) {
			// Method called from exporter.js after task is ready to write on xctrack format.
			// We'll send it to igclib for optimisation.
			// Calling wrapped function so the result can be returned to client.	
			var uid = Meteor.userId();	
			var res = syncFileWrite('/tmp/toOptimize.xctsk', new Buffer(buffer));
			return res;
		},*/
		'task.optimiser' : function(taskId, processId) {
			// Method called from exporter.js after task has been succesfully written to server.
			var uid = Meteor.userId();
			var task = Task.findOne({'_id' : taskId});
			// Set opti to false.
			Task.update({'_id' : taskId}, {$set : {opti : false}});
			// Spawn new optimize process to IGCLIB. Only provide b64 turnpoints array.
			var child = igclib('optimize', {
				task : Buffer.from(JSON.stringify(task.turnpoints)).toString('base64'),
				output : '-',
			});
			// On stdout.
			child.stdout.on('data', Meteor.bindEnvironment(function(data) {
  				// Update task opti with good object.
				Task.update({_id : taskId, uid : uid}, {'$set' : {'opti' : JSON.parse(data.toString()).opti}});
			}));
			child.stderr.on('data', Meteor.bindEnvironment(function(data) {
				// IGCLib return Progress on stderr.
				// It return an optimised track each time a bit more precise.
				// The object returned is different from full opti above.
				// Looked like quite bad unfortunatly. More bug like.
				//console.log("stderr : " + data.toString());
				/*try {
					var parse = JSON.parse(data.toString());
  					console.log('success: ' + parse + ' JSONlength : ' + data.toString().length);
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
			child.on('error', Meteor.bindEnvironment(function(err) {
				console.log('error : ' + err);
			}));
		},
		'task.request' : function(provider, year, processId) {
			// Method called from autoImporter.js after the form is submitted.
			// Keeping track of the request uid
			var uid = Meteor.userId();
			//Spawn child to igclib.
			var child = igclib('crawl', {provider: provider, year : year, 'output' : '-'});
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
		/*'task.newZip' : function(buffer) {
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
		},*/
		'task.test' : function() {
			SnapRace.remove({});
			RaceEvents.remove({});
			Progress.remove({});
			Task.remove({});
		},
		'task.replay' : function(compId, taskIndex, processId) {
			var uid = Meteor.userId();
			var race = RaceEvents.findOne({'_id' : compId});
			var task = Buffer.from(JSON.stringify(race.tasks[taskIndex])).toString('base64');
			var param = {
				task : task,
				//flights : '/tmp/flights',
				output : '/tmp/replay.igclib',
			};
			// If this race has a raceEvents _id... Then switch the output to store the file properly.
			if (compId) {
				// will return result on stdout (-) and .pkl file.
				param.output = '- /tmp/race_' + compId + '_' + taskIndex + '.pkl';
			}
			
			// Check if this task hasn't been replayed already
			var query = SnapRace.findOne({compId : compId, task : taskIndex});
			if (!query) {
				// If not, then proceed with igclib to "Replay".
				// Merge defaut and custom parameters with Object.assign.
				var child = igclib('replay', param);
				// Stream full race to database.
				// Remove all past snapRace docs for this task...
				SnapRace.remove({compId : compId, task : taskIndex});
				
				// Initialise Unordered Bulk Operation.
				var bulkOp = SnapRace.rawCollection().initializeUnorderedBulkOp();
				var totalSnap = 0;
				var counter = 0;
				oboe(child.stdout).node('n_snaps', function(data) {
					// On n_snaps.
					console.log('n_snaps : ' + data);
					totalSnap = data;
				}).node('ranking.pilots' , Meteor.bindEnvironment(function(data) {
					// On pilots.
					var update = {'$set' : {}};
					update['$set']['tasks.' + taskIndex + '.task.ranking.pilots'] = data;
					RaceEvents.update({'_id' : compId}, update);
				})).node('race.*', function(data, key) {
					// For each snap race.
					// Convert hh:mm:ss to timestamp as s from midnight.
					var time = new Date('1970-01-01T' + key[1]);
					// Insert json Snapshots into bulk operation.
					bulkOp.insert({compId : compId, task : taskIndex, time : time, snapshot :  data});
					// Dealing with progress again.
					counter++;
				})
				.done(Meteor.bindEnvironment(function() {
					// Insert it all via bulk.
					bulkOp.execute();
					// Remove Progress
					Progress.remove({uid : uid, pid : processId, type : 'replay'});
					// Replay attribute so we know this task has been processed.
					var update = {'$set' : {}};
					update['$set']['tasks.' + taskIndex + '.task.replay'] = true;
					RaceEvents.update({'_id' : compId}, update);
					// Directly go for a Race analysis.
					Meteor.call('task.race', {}, compId, taskIndex, processId);
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
				}));
				child.on('error', Meteor.bindEnvironment(function(err) {
					console.log(err);
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
				commands.path = '/tmp/race_' + compId + '_' + taskIndex + '.pkl'
				commands.output = '- /tmp/race_' + compId + '_' + taskIndex + '.pkl';
			}
			
			// Check if this task has been replayed already
			var query = SnapRace.findOne({compId : compId, task : taskIndex});
			if (query) {
				// If it's the case, then proceed with igclib to "Race".
				// Merge defaut and custom parameters with Object.assign.
				var child = igclib('race', Object.assign(param, commands));
				oboe(child.stdout).node('ranking.pilots', Meteor.bindEnvironment(function(data) {
					var ranking = data.sort(function(a, b) {
						return a['time'] - b['time'];
					});
					console.log(ranking);
					var up = {'$set' : {}};
					// uid <--> name mapping.
					up['$set']['tasks.' + taskIndex + '.task.ranking.pilots'] = ranking;
					up['$set']['tasks.' + taskIndex + '.task.raced'] = true;
					// @todo insert time at turnpoint (timeline display).
					RaceEvents.update({'_id' : compId}, up);
				})).done(function() {
					// @TODO get rid of unused files?
				});
				child.stderr.on('data', Meteor.bindEnvironment(function(data) {
					// Keep track of process progress via "Progress Collection".
					// IGCLib return Progress on stderr.
					Progress.insert({uid : uid, type : 'race', pid : processId, created : new Date().toISOString(), progress : data.toString()});
					console.log('stderr : ' + data);
				}));
				child.on('finish', Meteor.bindEnvironment(function() {
					//On process finish, clean all Progress document for this uid.
					Progress.remove({uid : uid, pid : processId, type : 'race'});
				}));
				child.on('close', Meteor.bindEnvironment(function() {
					//On process close, clean all Progress document for this uid.
					Progress.remove({uid : uid, pid : processId, type : 'race'});
				}));
			}
		},
		'task.watch' : function(id, compId, taskId, processId) {
			var uid = Meteor.userId();
			var child = igclib('watch', {
				path : '/tmp/race_' + compId + '_' + taskId + '.pkl', pilot : 'all',
				output : '-'
			});
			oboe(child.stdout).node('*', function(data) {
			}).done(Meteor.bindEnvironment(function(data) {
				if (data) {
					console.log('stdout : watch');
					var up = {'$set' : {}};
					up['$set']['tasks.' + taskId + '.watch'] = data;
					RaceEvents.update({'_id' : compId}, up);
				}
			}));
			child.stderr.on('data', Meteor.bindEnvironment(function(data) {
				console.log('stderr : ' + data);
				Progress.insert({uid : uid, type : 'watch', pid : processId, created : new Date().toISOString(), progress : data.toString()});
			}));
			child.on('close', Meteor.bindEnvironment(function() {
				Progress.remove({uid : uid, type : 'watch', pid : processId});
				console.log('watch close');
			}));
		} 
	});
});
