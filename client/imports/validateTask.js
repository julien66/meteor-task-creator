/**
 * @file
 * Perform basic validation on task format.
 */
Task = new Mongo.Collection('task', {connection: null});
import { ReactiveVar } from 'meteor/reactive-var'
//Progress = new Mongo.Collection('progress');

Template.validateTask.helpers({
	'display' : function() {
		var task = Task.findOne();
		if (task && task.turnpoints.length > 0) {
			return true;
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
		return t.valid.get() && (!Session.get('trackFile') && !Session.get('importTrack'));
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
		var query = Progress.findOne({uid : uid, type : 'race'}, {sort : {created : -1}});
		if (query) {
			// Return Progress to be displayed.
			var percent = Math.round(eval(query.progress) * 100);
			if (percent < 5 )  {
				T.percentThreshold = true;
				T.racingIndex.set(T.racingIndex.get() + 1);
				T.percentThreshold = false;
			}
			return percent + ' %';
		};
	},
	'getRacingStage' : function() {
		var T = Template.instance();
		console.log(T.racingIndex.get());
		return T.racingStatus[T.racingIndex.get()];
	},
}); 


Template.validateTask.onCreated (function validateOnCreated() {
	$('#validateTask').hide();
	this.percentThreshold = false;
	this.racingIndex = new ReactiveVar(0);
	this.racingStatus = ['Importing Tracks', 'Reading Tracks', 'Validating Tracks', 'Preparing Race'];
	this.valid = new ReactiveVar(false);
	this.report = new ReactiveVar('');
	var t = Template.instance();
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

