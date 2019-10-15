/**
 * @file
 * JS file for fullboard.
 */
Template.fullboard.helpers({
	'tp' : function(role) {
		return Turnpoints.find({'role' : role});
	},
	'hasCylinder' : function(finish) {
		return finish !== 'line';
	},
	'time' : function(role, direction) {
		var tp = Turnpoints.findOne({role : role});
		if (typeof tp !== 'undefined') {
			return tp[direction];
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
