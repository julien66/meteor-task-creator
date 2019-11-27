/**
 * @file
 * JS Taskboard
 * Basically Task main model.
 */

Task = new Mongo.Collection('task');
import * as Parameters from './param.js';
import * as Validator from './imports/validateTask';
var Param = Parameters.param;

Template.taskBoard.helpers({
	getTaskDistance : function() {
		var task = Task.findOne();
		if (task && task.opti) {
			return Math.round(task.opti['distance']/10)/100 + 'Km';
		}
	},
	turnpoints : function() {
		return Turnpoints.find();
	},
	fillColor : function(type) {
		return Param.turnpoint.fillColor[type.toLowerCase()];
	},
	roundDistance : function(distance) {
		if (distance) {
			return Math.round(distance/10)/100 + ' Km';
		}
		else {return};
	},
	shortName : function(type) {
		return Param.turnpoint.shortName[type.toLowerCase()];
	},
	noTurnpoints : function() {
		return Turnpoints.find().fetch().length == 0;
	}
});

Template.taskBoard.onRendered( function onTaskBoardRendered() {
	Task.find({'_id' : Session.get('taskId')}).observe({
		'changed' : function(task) {
			if (task.opti) {
				setLegsDistances(task, task.opti.legs);
			}
			else {
				setLegsDistances(task);
			}
		}
	});
	
	$("ul").sortable({
    		start: function(event, ui) {
		},
    		stop: function(event, ui) {
			// Getting new turnpoint order.
			var tpsId = $('li.taskboard-item').map(function () {
  				return $(this).attr("rel");
			}).get();
			// Getting task and sorting array turnpoints.
			var task = Task.findOne();
			var tps = task.turnpoints;
			tps.sort(function(a, b){ 
  				return tpsId.indexOf(a['_id']) - tpsId.indexOf(b['_id']);
			});
			Task.update({_id : Session.get('taskId')}, {'$set' : {turnpoints : tps,}});
			Meteor.call('task.optimiser', Session.get('taskId'), Session.get('processId'));
			Validator.check();
		}
  	});
});

Template.taskBoard.onCreated = function onTaskBoardCreated() {
	var T = Template.instance();
}


var setLegsDistances = function(task, legs) {
	// Set new distance to next turnpoint.
	for (var j = 0; j < task.turnpoints.length; j++) {
		Turnpoints.update( {'_id' : task.turnpoints[j]['_id']}, {'$set' : 
			{
				next : legs ? legs[j] : 0,
				previous : ((legs && (j-1 >= 0)) ? legs[j-1] : 0) 
			}
		});
	}
};

Template.taskBoard.events({
	'click li span' : function(e) {
		var tpId = $(e.target).parent().attr('rel');
		var turnpoint = Turnpoints.findOne({_id : tpId});
		Blaze.renderWithData(Template.turnpoint, turnpoint, document.body);
	},
	'click #fullBoard' : function(e) {
		var task = Task.findOne({_id : Session.get('taskId')});
		Blaze.renderWithData(Template.fullboard, task, document.body);
	},
});
