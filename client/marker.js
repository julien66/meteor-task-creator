/**
 * @file
 * Marker JS for the task-creator
 * 
 **/

Template.marker.onCreated(function markerCreated() {
});
	
Template.marker.events({
	'click button[data-action="waypoint/remove"]' : function(e) {
		// Remove Button. Getting id, removing from waypoints, closing modal.
		var _id = Template.instance().data['_id'];
		Waypoints.remove({'_id' : _id});
		Modal.hide(Template.instance());
	},
	
	// Edit button. 
	'submit form' : function(e) {
		e.preventDefault();	
		var _id = Template.instance().data._id;
		var name = e.target.name.value;
		var id = e.target.id.value;

		// Disallow empty string on name and id.
		// @To do... Need to check if others waypoints have the same name or id.
		if (name == null || name == '') {
			$('#wp-name').addClass('has-error');
			return;
		}

		if (id == null || id == '') {
			$('#wp-id').addClass('has-error');
			return;
		}
		
		// All is good. Go update waypoints.
		Waypoints.update({_id : _id}, {'$set' : {
			name : name,
			id : id,
		}});
		Modal.hide(Template.instance());
	},
	
	// "Add to task button".
	'click button[data-action="waypoint/callTurnpoint"]' : function(e) {
		Session.set('callTurnpoint', true);
		Modal.hide(Template.instance());
	}
});

Template.marker.onDestroyed(function onMarkerDestroyed() {
	if (Session.get('callTurnpoint') === true) {
		Session.set('callTurnpoint', false);
		Session.set('tempTurnpoint', Template.instance().data);
		Modal.show('turnpoint');
	}
});
