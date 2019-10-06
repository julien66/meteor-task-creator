/**
 * @file
 * JS Taskboard
 */
import * as Parameters from './param.js';

var Param = Parameters.param;

Template.taskBoard.helpers({
	getTaskDistance : function() {
		return Math.round(Session.get('taskDistance')/10)/100;
	},
	turnpoints : function() {
		return Turnpoints.find();
	},
	fillColor : function(type) {
		return Param.turnpoint.fillColor[type.toLowerCase()];
	},
	isShown : function() {
		return (!Turnpoints.find().fetch().length > 0) ? 'hidden' : '';
		//return (!Turnpoints.find().fetch().length > 0) : 'hidden' : '';
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
