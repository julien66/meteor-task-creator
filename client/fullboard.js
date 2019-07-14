/**
 * @file
 * JS file for fullboard.
 */
Template.fullboard.helpers({
	'tp' : function(type) {
		return Turnpoints.find({'type' : type});
	},
	'hasCylinder' : function(goalType) {
		return goalType !== 'line';
	},
	'time' : function(type, mode) {
		var tp = Turnpoints.findOne({type : type});
		if (typeof tp !== 'undefined') {
			return tp[mode];
		}
		return '00:00:00';
	}
});

Template.fullboard.events({
	'click #export-task' : function(e) {
		Session.set('callExport', true);
		Modal.hide(Template.instance());
	},
	'click #delete-task' : function(e) {
		Turnpoints.remove({});
		Modal.hide(Template.instance());
	},
});

Template.fullboard.onDestroyed(function onMarkerDestroyed() {
	if (Session.get('callExport') === true) {
		Session.set('callExport', false);
		Modal.show('exportTask');
	}
})
