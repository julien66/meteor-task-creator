/**
 * @file
 * Waypoint JS for the task-creator
 * 
 **/
Template.waypoint.onCreated(function markerCreated(data) {
	// Waypoint data are : _id altitude description lat lon name source. See  https://gist.github.com/julien66/6c7934f1dd2f670f2c0ca0bed9dd64f5
});

Template.waypoint.onRendered(function markerRendered(data) {
	// onRendered trigger modal 'show'.
  	$('#waypointModal').modal('show');
});
	
Template.waypoint.events({
	'hidden.bs.modal #waypointModal': function(event, template) {
		// Listen when modal box is hidden and remove template.
		Blaze.remove(template.view);
 	},
	'click button[data-action="remove"]' : function(e) {
		// When remove Button is clicked. 
		// Getting waypoint id.
		var _id = Template.instance().data._id;
 		// Removing from waypoints collection.
		Waypoints.remove({'_id' : _id});
 		//Hiding modal.
		$('#waypointModal').modal('hide');
	},
	'submit form' : function(e) {
		// Submitting form on Edit and Add to task input.
		// Prevent browser default behavior.
		e.preventDefault();
		// Getting waypoint id.
		var _id = Template.instance().data._id;
		// checkValue for name input. @see checkValue().
		var name = checkValue(e.target.name.value, 'name');
		// checkValue for description input. @see checkValue().
		var description = checkValue(e.target.description.value, 'description');
		
		// Disallow waypoint name duplicate.
		// if name is set 
		if (name) {
			// if others ('$ne') Waypoints are found with this name.
			if (Waypoints.findOne({'_id' : {'$ne' : _id }, name : name})) {
				// set to field to is-invalid as Bootstrap 4.
				$('input[name="name"]').addClass('is-invalid');
				// Fullfill #help-name to inform user this waypoint is used.
				$('#help-name').html('This name is already used.');
				// Set name to false so it wont update below;
				name = false;
			}
			else {
				// No duplicate, name is ok. Removing is-invald class.
				$('input[name="name"]').removeClass('is-invalid');
				// Removing help text.
				$('#help-name').html('');
			}
		}

		// If name and id are correctly set and not false. (return by checkValue() and duplicate checked).
		if (name && description) {
			// Updating waypoint with _id and set name and description
			Waypoints.update({_id : _id}, {'$set' : {name : name, description : description,}});
			// hiding Modal.
			$('#waypointModal').modal('hide');
		}
	},
	'click button[data-action="add"]' : function(e) {
		// hiding Modal.
		$('#waypointModal').modal('hide');
		// getting turnpoint basic data from current waypoint.
		var turnpointData = Template.instance().data;
		// Deleting id from waypoint. We don't want the future turnpoint to have the same id on its template.
		delete turnpointData['_id'];
		// Render new turnpoint modal with turnpoint Data inherited from waypoint (minus _id we just deleted).
		Blaze.renderWithData(Template.turnpoint, turnpointData, document.body);
	}
});

// Helper function to check if value is properly formatted.
// No [null / false / empty / unkown] value.
var checkValue = function(value, tag) {
	// if value is false, empty, unknown...
	if (!value || value == '') {
		// Add class is-invalid from bootstrap 4 to input.
		$('input[name="' + tag + '"]').addClass('is-invalid');
		// Fullfill help text.
		$('#help-' + tag).html('Incorrect ' + tag);
		// Return false. This value isn't good.
		return false;
	}
	// Value is ok. remove is-invalid class.
	$('input[name="' + tag + '"]').removeClass('is-invalid');
	// Value is ok. set help text to empty.
	$('#help-' + tag).html('');
	//Return value.
	return value;
}
