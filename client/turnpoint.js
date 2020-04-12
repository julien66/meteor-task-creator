/**
 * @file
 * Turnpoint JS for the task-creator.
 **/
import * as Validator from './imports/validateTask';
import * as Helper from './imports/helper';

Template.turnpoint.helpers({
	notNew : function() {
		// This template can be used for new turnpoint (when adding a waypoint).
		// Or to Edit / Remove an existing turnpoint.
		// Different button form should be shown then.
		return Template.instance().data._id;
	},
	sel : function(key, value) {
		// "Selecting" option matching current data for the select fields.
		var data = Template.instance().data;
		if (data && data[key] == value) {
			return 'selected';
		}
	},
	default : function(key, value) {
		// "Filling" inputs with current data.
		var data = Template.instance().data;
		if (data && data[key]) {
			if (key === 'open' || key === 'close') {
				return Helper.secondsToHH(data[key]);
			}
			return data[key];
		}
		return value;
	},
});

Template.turnpoint.onCreated(function onTurnpointCreated() {
	// Turnpoints data are : altitude, close, description, direction, finish, lat, lon, name, open, radius, role, source 
	// as detailled here : https://gist.github.com/julien66/6c7934f1dd2f670f2c0ca0bed9dd64f5
	// Addition object are _id and wp // containing docuement turnpoint and waypoint id. 
});

Template.turnpoint.onRendered(function onTurnpointRendered() {
	// Keeping this for further reference.
	var tmp = this;
	// Listen when modal box is hidden...
	$('#turnpointModal').on('hidden.bs.modal', function () {
		// Blaze remove 'this' (above) template view.
		Blaze.remove(tmp.view);
	});
	// onRendered trigger modal 'show'.
  	$('#turnpointModal').modal('show');
	// Set fields properly. @see showHideFields.
	showHideFields($('#tp-finish-select'));
	showHideFields($('#tp-role-select'));
});

// Helper function to hide/show specific turnpoint edition fields based on their role (TAKEOFF START TURNPOINT...)
// eg. No need to set a radius when you select a goal line. No need to set a direction when you set a takeoff. Etc.
// Each select has a data-show data-hide attribute so we know which fields are to be shown and which must be hidden.
var showHideFields = function(target) {
	// Getting data-show attribute.
	var toShow = $('option:selected', target).attr('data-show');
	if (toShow) {
		// Spliting each word.
		toShow = toShow.split(',');
		// Looping through toShow array
		for (var i = 0; i < toShow.length; i++) {
			// Show every corresponding #tp-'word'.
			$('#tp-' + toShow[i]).show();
		}
	}
	// Getting data-hide attribute.
	var toHide = $('option:selected', target).attr('data-hide');
	if (toHide) {
		// Spliting each word.
		toHide = toHide.split(',');
		// Looping through toHide array
		for (var i = 0; i < toHide.length; i++) {
			// Hide every corresponding #tp-'word'.
			$('#tp-' + toHide[i]).hide();
		}
	}
} 

Template.turnpoint.events({
	'change select' : function(e) {
		showHideFields(e.target);
	},
	'submit form' : function(e) {
		// Prevent browser default behavior.
		e.preventDefault();
		// Getting template data (turnpoint).
		var data = Template.instance().data;
		// Getting form values.
		var turnpoint = {
			'close' : (e.target.close) ? e.target.close.value : null,
			'finish' : (e.target.finish) ? e.target.finish.value : null, 
			'direction' : (e.target.direction) ? e.target.direction.value : null,
			'open' :  (e.target.open) ? e.target.open.value : null,
			'radius' : (e.target.radius) ? parseInt(e.target.radius.value) : null,
			'role' : e.target.role.value,
		};
		// If there is already data._id then it's an update.
		if (data._id) {
			turnpoint = Object.assign(data, turnpoint);
			// Updating turnpoints array in task first
			Meteor.call('task.updateTurnpoint', Session.get('taskId'), turnpoint, function() {
				Validator.check();
			});
			// Updating the turnpoint itself then.
			Turnpoints.update({_id : data._id}, turnpoint);
		}
		else { // Without data it is an insert.
			turnpoint = Object.assign(data, turnpoint);
			console.log(turnpoint);
			// Inserting turnpoint.
			var tpId = Turnpoints.insert(turnpoint);
			// Retrieving actual document from Turnpoint collection.
			var turnpointDoc = Turnpoints.findOne({_id : tpId});
			// Updating task and pushing the actual document turnpoint.
			Task.update({'_id' : Session.get('taskId')}, {'$push' : {turnpoints : turnpointDoc}}, function() {
				Validator.check();
			});
		}
		// Call optimiser.
		Meteor.call('task.optimiser', Session.get('taskId'), Session.get('processId'));
		// Closing modal.
		$('#turnpointModal').modal('hide');
	},
	'click button[data-action="turnpoint/remove"]' : function(e) {
		// Preventing default browser behavior.
		e.preventDefault();
		// Getting turnpoint ID.
		var id = Template.instance().data._id;
		// Removing Turnpoint
		Turnpoints.remove({_id : id});
		// Updating Task.
		Task.update({'_id' : Session.get('taskId')}, {'$pull' : {turnpoints : {_id : id}}});
		// Call Optimiser.
		Meteor.call('task.optimiser', Session.get('taskId'), Session.get('processId'));
		// Closing modal.
		$('#turnpointModal').modal('hide');
	},
});
