import { Meteor } from 'meteor/meteor';
import {DecompressZip} from 'decompress-zip';
import {Progress} from 'progress-stream';

Meteor.startup(() => {
  	// code to run on server at startup
	var fs = Npm.require('fs');
	var DecompressZip = require('decompress-zip');
	var progress = require('progress-stream');
	var basePath = '/home/julien/meteor-task-creator/server/igclib';	
	
	Task = new Mongo.Collection('task');
	//ZipProgress = new Mongo.Collection('zipProgress');
	
	// Child Process for IGCLIB.
	const { exec } = require('child_process');
	/*exec('race_export --task ' + basePath +'/test_data/tasks/task.xctsk --flights ' + basePath + '/test_data/large_tracks  --n_jobs -1 --export ' + basePath + '/test_data/race.pkl', (error, stdout, stderr) => {
		 if (error) {
    			console.error(`exec error: ${error}`);
    			return;
  		}
  		console.log(`stdout: ${stdout}`);
  		console.log(`stderr: ${stderr}`);
  		console.error(`stderr: ${stderr}`);
	});*/
	
	Meteor.methods({
		'task.writeTask' : function(buffer, instruction) {
			fs.writeFile('/tmp/toOptimize.xctsk', new Buffer(buffer), function(error){
				console.log(error);
				if (instruction == 'optimize') {
					exec('igclib --mode optimize --task /tmp/toOptimize.xctsk', function(error, stdout, stderr) {
						if (error) {
							console.log(error);
						}
  						console.log(`stdout: ${stdout}`);
  						console.log(`stderr: ${stderr}`);
  						console.error(`stderr: ${stderr}`);
					});
				}
			});
		},
		'task.request' : function(provider, year) {
			/*exec('igclib -- ' + provider + '--year' + year, function(error, stdout, stderr) => {
				if (error) {
					console.log(error);
				}
  				console.log(`stdout: ${stdout}`);
  				console.log(`stderr: ${stderr}`);
  				console.error(`stderr: ${stderr}`);
			});*/
			console.log(provider, year);
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
	
	/*Meteor.methods({
		'task.sendUpdate' : function(task) {
			pyshell.send(JSON.stringify({
				message : 'newTask',
				data : task
			}));
		}
	});*/
});
