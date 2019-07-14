/**
 * @file
 * JS Taskboard
 */
import * as Parameters from './param.js';

var Param = Parameters.param;

Template.taskBoard.helpers({
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
	shortName : function(type) {
		return Param.turnpoint.shortName[type.toLowerCase()];
	},
});

Template.taskBoard.onRendered( function onTaskBoardRendered() {
	$("#taskboard ul").sortable({
    start: function(event, ui) {
      ui.item.startIndex = ui.item.index();
    },
    stop: function(event, ui) {
      var oldIndex = ui.item.startIndex;
      var index = ui.item.index();
			// Getting task and inverting array turnpoints.
			var task = Task.findOne();
			var tps = task.turnpoints;
			var memo  = tps[oldIndex];
			tps[oldIndex] = tps[index];
			tps[index] = memo;
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
