/**
 * @file
 * JS pilotPopover
 */
Template.pilotPopover.helpers({
	roundDistance : function(distance) {
		return Math.round(distance);
	},
	getTime : function(time) {
		return time ? time : 'Not in goal!';
	},
});

Template.pilotPopover.onRendered(function onPilotPopoverRender() {
});

Template.pilotPopover.events({
});
