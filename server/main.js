import { Meteor } from 'meteor/meteor';
import {DecompressZip} from 'decompress-zip';
import {Progress} from 'progress-stream';

Meteor.startup(() => {
  	// code to run on server at startup
	var fs = Npm.require('fs');
	var DecompressZip = require('decompress-zip');
	var progress = require('progress-stream');
	var basePath = '/home/julien/meteor-task-creator/server/igclib';	
	
	//ZipProgress = new Mongo.Collection('zipProgress');
	
	// Child Process for IGCLIB.
	const { exec } = require('child_process');


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
		var command = 'igclib --mode ' + mode;
		for (let [key, value] of Object.entries(data)) {
  			command += ' --' + key + ' ' + value;
		};
		console.log(command);
		exec(command, function(error, stdout, stderr) {
			console.log(error);
			console.log(stdout);
			console.log(stderr);
			if (!error) {
				callback(null, {
					stdout : stdout,
					stderr : stderr,
				});
			}
		});
	}

	// Wrapped function
	var syncFileWrite = Meteor.wrapAsync(fileWrite);
	var syncIgclib = Meteor.wrapAsync(igclib);

	Meteor.methods({
		'task.writeTask' : function(buffer) {
			// Method called from exporter.js after task is ready to write on xctrack format.
			// We'll send it to igclib for optimisation.
			// Calling wrapped function so the result can be returned to client.	
			var res = syncFileWrite('/tmp/toOptimize.xctsk', new Buffer(buffer));
			return res;
		},
		'task.optimize' : function() {
			// Method called from exporter.js after task has been succesfully written to server.
			var res = syncIgclib('optimize', {task : '/tmp/toOptimize.xctsk'});
			return res;
		},
		'task.request' : function(provider, year) {
			// Method called from autoImporter.js after the form is submitted.
			var res = syncIgclib('crawl', {provider: provider, year : year});
			return res;
		},
		'task.newZip' : function(buffer) {
			// Get new zip data and write it all on /tmp.
			fs.writeFile('/tmp/task.zip',new Buffer(buffer),function(error){
				console.log(error);
				var unzipper = new DecompressZip('/tmp/task.zip')
				// Add the error event listener
                		unzipper.on('error', function (err) {
                    			console.log('Caught an error', err);
                		});
                
                		// Notify when everything is extracted
                		unzipper.on('extract', function (log) {
                    			console.log('Finished extracting', log);
                		});
                
                		// Notify "progress" of the decompressed files
                		unzipper.on('progress', function (fileIndex, fileCount) {
                    			console.log('Extracted file ' + (fileIndex + 1) + ' of ' + fileCount);
                		});

				unzipper.extract({
                    			path: 'temp/task'
                		});
			});
			//
			return 1;
		}
	});
});
