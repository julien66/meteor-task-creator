/**
 * @file
 * JS Files Handler.
 */
Template.fileManager.helpers({
	allFiles : function() {
		return Files.find().fetch();
	},
	isShown : function() {
		return Files.find().fetch().length > 0;
	}
});

var destroyFromFile = function(file) {
	var infos = file.infos;
	if (infos.waypoints) {
		// Removing all Waypoints from this source.
		Waypoints.remove({source : file.filename});
		// Removing all Turnpoints from this source.
		Turnpoints.remove({source : file.filename});
		// Removing all Turnpoints into task with this source.
		Task.update({_id : Session.get('taskId')}, {'$set' : {opti : false}, '$pull' : {turnpoints : {source : file.filename}}});	
	}

	if (infos.airspaces) {
		// Removing all Waypoints from this source.
		Airspaces.remove({source : file.filename});
	}

	if (infos.tracks) {
		Tracks.remove({source : file.filename});
	}

	Files.remove({filename : file.filename});
}

Template.fileManager.events({
	'click li i' : function(e) {
		// On click link.
		e.preventDefault();
		// Getting file Id.
		var fileId = $(e.target).attr('rel');
		// Getting File from mini mongo.
		var file = Files.findOne({_id : fileId});
		destroyFromFile(file);
	},
	'click button' : function(e) {
		// On click export Waypoint
		// Prevent browser default behavior.
		e.preventDefault();
		// Render export modal
		Blaze.render(Template.exportWaypoints, document.body);
	}
});
