import { Meteor } from 'meteor/meteor';
import {DecompressZip} from 'decompress-zip';

Meteor.startup(() => {
  	// code to run on server at startup
	
	// Do not require acccounts-password and make guests anonymous.
	// @see https://atmospherejs.com/artwells/accounts-guest
	AccountsGuest.anonymous = true;

	var fs = Npm.require('fs');
	var nodePickle = require('node-pickle');
	var DecompressZip = require('decompress-zip');
	var basePath = '/home/julien/meteor-task-creator/server/igclib';	
	Progress = new Mongo.Collection('progress');
	ImportedTasks = new Mongo.Collection('importedTasks');
	Task = new Mongo.Collection('task');
	
	//ZipProgress = new Mongo.Collection('zipProgress');
	
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
		var command = 'igclib --progress ratio --mode ' + mode;
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
					ImportedTasks.insert({
						uid: uid, 
						provider : provider, 
						year :  year, 
						data: JSON.parse(data.toString()), 
					});
					//console.log('stdout : ' + data);
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
				ImportedTasks.remove({uid : uid});
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
                
                		// At progress... Store Progress collection.
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
			/*var child = fs.createReadStream('/tmp/race.pkl');
			child.on('data', function(data) {
				//console.log(data);
				nodePickle.load(data).then(function(j) {
					// json is a JSON object here
					console.log(j);
				});
			});*/
		},
		'task.race' : function() {
			var uid = Meteor.userId();
			var child = igclib('race', {task : '/tmp/toOptimize.xctsk', flights : '/tmp/flights', output: '/tmp/race.pkl' });
			child.stdout.on('data', Meteor.bindEnvironment(function(data) {
				// Nothing here.
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
				//
			}));
		}
	});
});
