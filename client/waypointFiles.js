/**
 * @file
 * JS Waypoints Files Handler.
 */
Template.waypointFiles.helpers({
	waypointFiles : function() {
		var distinctFile = _.uniq(Waypoints.find({}, {
			sort: {filename : 1}, field: {filename : true}
		}).fetch().map(function(x) {
			    return x.filename;
		}), true);
		return distinctFile;
	},
	isShown : function() {
		return (!Waypoints.find().fetch().length > 0) ? 'hidden' : '';
	}
});

Template.waypointFiles.events({
	'click a' : function(e) {
		e.preventDefault();
		var filename = $(e.target).attr('rel');
		Waypoints.remove({filename : filename});
		Turnpoints.remove({'wp.filename' : filename});
	},
	'click button' : function(e) {
		e.preventDefault();
		Modal.show('exportWaypoints');
	}
});
