/**
 * @file
 * JS Waypoints Files Handler.
 */
Template.waypointFiles.helpers({
	waypointFiles : function() {
		var distinctFile = _.uniq(Waypoints.find({}, {
			sort: {filename : 1}, field: {filename : true}
		}).fetch().map(function(x) {
			    return x.source;
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
		var source = $(e.target).attr('rel');
		Waypoints.remove({source : source});
		Turnpoints.remove({'wp.source' : source});
	},
	'click button' : function(e) {
		e.preventDefault();
		Modal.show('exportWaypoints');
	}
});
