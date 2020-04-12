/**
 * @file
 * JS file for fullboard.
 */
import * as Helper from './imports/helper';

Template.fullboard.helpers({
	'tp' : function(role) {
		return Turnpoints.find({'role' : role});
	},
	'hasCylinder' : function(finish) {
		return finish !== 'line';
	},
	'time' : function(role, direction) {
		var tp = Turnpoints.findOne({role : role.toUpperCase()});
		if (typeof tp !== 'undefined') {
			return Helper.secondsToHH(tp[direction]);
		}
		return '00:00:00';
	}
});

Template.fullboard.onCreated(function onFullBoardCreated() {
	// at creation data is Task!
	console.log(Template.instance().data);
});

Template.fullboard.onRendered(function onFullBoardRendered() {
	// Keeping this for further reference.
	var tmp = this;
	// Listen when modal box is hidden...
	$('#fullBoardModal').on('hidden.bs.modal', function () {
		// Blaze remove 'this' (above) template view.
		Blaze.remove(tmp.view);
	});
	$('#fullBoardModal').modal('show');
});

Template.fullboard.events({
	'click #export-task' : function(e) {
		$('#fullBoardModal').modal('hide');
		Blaze.render(Template.exportTask, document.body);
	},
	'click #delete-task' : function(e) {
		Turnpoints.remove({});
		Task.update({"_id" : Session.get('taskId')}, {$set : {turnpoints : []}});
		$('#fullBoardModal').modal('hide');
	}
});

