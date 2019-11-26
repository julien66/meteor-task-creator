/**
 * @file
 * Perform basic validation on task format.
 */
import * as Helper from './helper';

Template.validateTask.helpers({
	'display' : function() {
		var task = Task.findOne();
		if (task && task.turnpoints.length > 0) {
			return !Session.get('raceInfos');
		}
		return false;
	},
	'status' : function() {
		var t = Template.instance();
		var valid = Session.get('validator').valid;
		return (valid) ? 'success' : 'danger';
	},
	'report' : function() {
		var t = Template.instance();
		return Session.get('validator').report;
	},
	'valid' : function() {
		var t = Template.instance();
		return Session.get('validator').valid;
	},
	'missZip' : function() {
		var t = Template.instance();
		var valid = Session.get('validator').valid;	
		return valid && (!Session.get('trackFile') && !Session.get('importTrack')) && !RaceEvents.find().fetch().length > 0;
	},	
	'opti' : function() {
		return Task.findOne({_id : Session.get('taskId')}).needOpti;
	},
	'ready' : function() {
		var T = Template.instance();
		var valid = Session.get('validator').valid;	
		return (Session.get('trackFile') || Session.get('importTrack')) && valid;
	},
	'getProgress' : function() {
		var T = Template.instance();
		var uid = Meteor.userId();
		var query = Progress.findOne({uid : uid, pid : Session.get('processId'), type : "replay"}, {sort : {created : -1}});
		if (query) {
			// Return Progress to be displayed.
			if (query.progress.indexOf('%') > -1) {
				var percent = parseInt(query.progress.substring(0, query.progress.indexOf('%')));
			} else {
				var percent = Math.round(100 * query.progress);
			}
			if (isNaN(percent)) {
				percent = 0;
			}
			if (percent < 5 )  {
				T.percentThreshold = true;
			}
			if (percent == 100 && T.percentThreshold) {
				T.replayIndex.set(T.replayIndex.get() + 1);
				T.percentThreshold = false;
			}
			return percent + ' %';
		};
	},
	'getStage' : function() {
		var T = Template.instance();
		return T.replayStatus[T.replayIndex.get()];
	},
	'isProgress' : function() {
		var T = Template.instance();
		return T.replayIndex.get() < 3;
	}
}); 


Template.validateTask.onCreated (function validateOnCreated() {
	$('#validateTask').hide();
	this.percentThreshold = false;
	this.replayIndex = new ReactiveVar(0);
	this.replayStatus = ['Downloading Tracks', 'Reading Tracks', 'Streaming large data', 'Inserting to database'];
	Session.set('validator', {
		valid : false,
		report : 'No Task defined.',
	});
	this.valid = new ReactiveVar(false);
	this.report = new ReactiveVar('');
	var T = Template.instance();
	 
	/*Task.find({_id : Session.get('taskId')}).observe({
		added : function() {
		},
		changed : function(task, pastTask) {
			var res = check();
			t.valid.set(res.valid);
			t.report.set(res.report);
			Session.set('validTask', res.valid);	
		},
		removed : function() {
		}
	});*/
});

// This function Check task validity.
// It is called directly by task parser (/imports/parser.js), turpoint form (turnpoint.js) and taskBoard reordering ui taskboard.js.
var check = function (task) {
	if (!task) {
		var task = Task.findOne();
	}
	console.log(task);
	var report = [];
	var valid = true;
	
	// One and only one TAKEOFF, START ESS, GOAL
	// Caching object test[roles] = [turnpoint, turnpoint, turnpoint].
	var test = [];
	// All mandatory turnpoints roles ('TURNPOINT' is not mandatory).
	var roles = ['TAKEOFF', 'START', 'ESS', 'GOAL'];
	var index = 0;
	// For each task turnpoints.
	task.turnpoints.forEach(function(turnpoint) {
		// Either push the turnpoint into test[roles] or instanciate the array so test[roles] = [turnpoint]	
		(test[turnpoint.role]) ? test[turnpoint.role].push(turnpoint) : test[turnpoint.role] = [turnpoint];
		if (turnpoint.role == roles[index]) {
			index += 1;
		}
		else {
			if (turnpoint.role != 'TURNPOINT') {
				if (turnpoint.role !== roles[index]) {
					valid = false;
					report.push('Order problem : ' + turnpoint.role + ' found TURNPOINT or ' + roles[index] + ' was excpected.');
				}	
			}
		}
	});
	// Now for each existing roles as defined above.
	roles.forEach(function(key) {
		// If there is no matching element cached.
		if (!test[key]) {
			// Set valid to false;
			valid = false;
			// Add missing mandatory role report.
			report.push('No ' + key + ' detected.');
		};
		// If there is more than a mandatory role. Eg. 2 Takeoff. 3 Goal.
		if (test[key].length > 1) {
			// Set valid to false;
			valid = false;
			// Add multiple role report.
			report.push(test[key].length + ' ' + key + ' detected.');
		};

	});
	
	// If takeoff 'open' is upper or equal takeoff close.
	if (Helper.HHtoSeconds(task.open) >= Helper.HHtoSeconds(task.close) ) {
		// Set valid to false;
		valid = false;
		// Add bad start report.
		report.push('TAKEOFF opening time should be lower than than TAKEOFF closing time.');
	}	
	
	// If takeoff 'open' is upper or equal task start.
	if (Helper.HHtoSeconds(task.open) >= Helper.HHtoSeconds(task.start) ) {
		// Set valid to false;
		valid = false;
		// Add bad start report.
		report.push('TAKEOFF time should be lower than than START time.');
	}	
	
	// If task start is upper or equal task end.
	if (Helper.HHtoSeconds(task.start) >= Helper.HHtoSeconds(task.end) ) {
		// Set valid to false;
		valid = false;
		// Add bad start report.
		report.push('START time should be lower than than ESS close time.');
	}	
	
	Task.update({_id : Session.get('taskId')}, {$set : {isValid : valid}});
	Session.set('validator', {
		valid : valid,
		report : report,
	});
}

export {
	check,
}

