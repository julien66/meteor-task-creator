/**
 * @file
 * JS waypoints exporter
 */
import  * as fileExporter from './imports/exporter';

Template.exportWaypoints.helpers({
	waypoints: function() {
		return Waypoints.find({}, {sort : {name : 1}});
	},
	exportFormat : function() {
		return ['GPX', 'OziExplorer', 'CUP'];
	},
	indexIt : function(i) {
		return i + 1;
	}
});

Template.exportWaypoints.onRendered(function onExportWaypointRendered() {
	// Keeping this for further reference.
	var tmp = this;
	// Listen when modal box is hidden...
	$('#waypointsExporter').on('hidden.bs.modal', function () {
		// Blaze remove 'this' (above) template view.
		Blaze.remove(tmp.view);
	});
	// onRendered trigger modal 'show'.
	$('#waypointsExporter').modal('show')
});

Template.exportWaypoints.events({
	'submit Form' : function(e) {
		e.preventDefault();
		var wpSelected = [];
		$('input.export-single-wp:checked').each(function() {
			wpSelected.push($(this).attr('name'));
    		});
		var format = e.target.formatWp.value;
		fileExporter.exportFile('waypoints', format, wpSelected);
		$('#waypointsExporter').modal('hide');
	},
	'focusout' : function(e) {
		var _id = $(e.target).attr('wpId');
		var tag = $(e.target).attr('name');
		var value = e.target.value;	
		if (_id) {
			var valid = validate(_id, e.target, tag, value);
			// All is good. Go update waypoints.
			if (valid) {
				Waypoints.update({_id : _id}, {'$set' : {[tag] : value}});
			}
		}
	},
});

var validate = function(_id, target, tag, value) {
	// Disallow empty string.
	if (!value || value == '') {
		$(target).addClass('is-invalid');
		$('#help-' + tag + '-' + _id).html('Incorrect ' + tag);
		return false;
	}
	// Value is ok. remove is-invalid class.
	$(target).removeClass('is-invalid');
	// Value is ok. set help text to empty.
	$('#help-' + tag + '-' + _id).html('');
		
	if (tag == 'name') {
		// if others ('$ne') Waypoints are found with this name.
		if (Waypoints.findOne({'_id' : {'$ne' : _id }, name : value})) {
			// set to field to is-invalid as Bootstrap 4.
			$(target).addClass('is-invalid');
			// Fullfill #help-name to inform user this waypoint is used.
			$('#help-name-' + _id).html('This name is already used.');
			return false;
		}
		else {
			// No duplicate, name is ok. Removing is-invald class.
			$(target).removeClass('is-invalid');
			// Removing help text.
			$('#help-name-' + _id).html('');
		}
	}
	return true;
}
