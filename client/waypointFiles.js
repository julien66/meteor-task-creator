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
		return Waypoints.find().fetch().length > 0;
	}
});

Template.waypointFiles.events({
	'click a' : function(e) {
		// On click link.
		e.preventDefault();
		// Getting source.
		var source = $(e.target).attr('rel');
		// Removing all Waypoints from this source.
		Waypoints.remove({source : source});
		// Removing all Turnpoints from this source.
		Turnpoints.remove({'source' : source});
		// Removing all Turnpoints into task with this source.
		Task.update({_id : Session.get('taskId')}, {'$pull' : {turnpoints : {source : source}}});
	},
	'click button' : function(e) {
		// On click export Waypoint
		// Prevent browser default behavior.
		e.preventDefault();
		// Render export modal
		Blaze.render(Template.exportWaypoints, document.body);
	}
});
