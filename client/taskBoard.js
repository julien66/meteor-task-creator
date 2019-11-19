/**
 * @file
 * JS Taskboard
 * Basically Task main model.
 */

Task = new Mongo.Collection('task');
import * as Parameters from './param.js';
import * as Validator from './imports/validateTask.js';

var Param = Parameters.param;

Template.taskBoard.helpers({
	getTaskDistance : function() {
		var task = Task.findOne();
		if (task && task.IGCLibOpti) {
			return Math.round(task.IGCLibOpti['distance']/10)/100;
		}
	},
	turnpoints : function() {
		return Turnpoints.find();
	},
	fillColor : function(type) {
		return Param.turnpoint.fillColor[type.toLowerCase()];
	},
	isShown : function() {
		return Turnpoints.find().fetch().length > 0;
	},
	roundDistance : function(distance) {
		return Math.round(distance/10)/100;
	},
	shortName : function(type) {
		return Param.turnpoint.shortName[type.toLowerCase()];
	},
});

Template.taskBoard.onRendered( function onTaskBoardRendered() {
	$("#taskboard ul").sortable({
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
			Task.update({}, {'$set' : {
				turnpoints : tps,
			}});
		}
  	});
});

Template.taskBoard.onCreated = function onTaskBoardCreated() {
	var T = Template.instance();
	console.log(T);
}

Template.taskBoard.events({
	'click li span' : function(e) {
		var tpId = $(e.target).parent().attr('rel');
		var turnpoint = Turnpoints.findOne({_id : tpId});
		Modal.show('turnpoint', turnpoint);
	},
	'click button' : function(e) {
		Modal.show('fullboard');
	},
});

Task.find().observe({
	inserted : function(task) {Validator.check(task)},
	changed : function(task) {Validator.check(task)}		
});
