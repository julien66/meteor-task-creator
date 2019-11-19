/**
 * @file
 * Perform basic validation on task format.
 */

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
		return (t.valid.get()) ? 'success' : 'danger';
	},
	'report' : function() {
		var t = Template.instance();
		return t.report.get();
	},
	'notValid' : function() {
		var t = Template.instance();
		return !t.valid.get();
	},
	'missZip' : function() {
		var t = Template.instance();
		return t.valid.get() && (!Session.get('trackFile') && !Session.get('importTrack')) && !RaceEvents.find().fetch().length > 0;
	},	
	'opti' : function() {
		return Session.get('requestOpti');
	},
	'ready' : function() {
		var T = Template.instance();
		return (Session.get('trackFile') || Session.get('importTrack')) && T.valid.get();
	},
	'getProgress' : function() {
		var T = Template.instance();
		var uid = Meteor.userId();
		var query = Progress.findOne({uid : uid, pid : Session.get('processId'), type : "replay"}, {sort : {created : -1}});
		if (query) {
			// Return Progress to be displayed.
			var percent = parseInt(query.progress.substring(0, query.progress.indexOf('%')));
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
		return T.replayIndex.get() < 2;
	}
}); 


Template.validateTask.onCreated (function validateOnCreated() {
	$('#validateTask').hide();
	this.percentThreshold = false;
	this.replayIndex = new ReactiveVar(0);
	this.replayStatus = ['Downloading Tracks', 'Reading Tracks', 'Streaming to database'];
	this.valid = new ReactiveVar(false);
	this.report = new ReactiveVar('');
	var t = Template.instance();
	
	Session.set('valudTask', false);

	Task.find({_id : Session.get('taskId')}).observe({
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
	});
});

var check = function () {
	var task = Task.findOne();
	var report = '';
	var valid = true;
	
	// One and only one TAKEOFF, START ESS, GOAL
	var test = [];
	var roles = ['TAKEOFF', 'START', 'ESS', 'GOAL'];
	for (var i = 0; i < task.turnpoints.length; i++) {
		var tp = task.turnpoints[i];
		(test[tp.role]) ? test[tp.role].push(tp) : test[tp.role] = [];
	}

	for (var i = 0; i < roles.length; i++) {
		var key = roles[i];
		if (!test[key]) {
			valid = false;
			report += 'No ' + key + ' detected. \n';
			continue;
		};
	
		if (test[key].length > 1) {
			valid = false;
			report += test[key].length + ' ' + key + ' detected. \n';
		};

	}

	//console.log(valid, report);
	return {
		valid : valid,
		report : report 
	}
	// @toDo START TIME and ESS TIME set and start lower than ESS.
}

export {
	check,
}

