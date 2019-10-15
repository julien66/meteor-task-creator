/**
 * @file
 * JS waypoints exporter
 */
import  * as fileExporter from './imports/exporter';

Template.exportWaypoints.helpers({
	waypoints: function() {
		return Waypoints.find({}, {sort : {id : 1}});
	},
	exportFormat : function() {
		return ['GPX', 'OziExplorer', 'CUP'];
	},
	indexIt : function(i) {
		return i + 1;
	}
});

Template.exportWaypoints.events({
	'submit Form' : function(e) {
		e.preventDefault();
		var wpSelected = [];
		$('input.export-single-wp:checked').each(function() {
			wpSelected.push($(this).attr('description'));
    		});
		var format = e.target.formatWp.value;
		fileExporter.exportFile('waypoints', format, wpSelected);
	},
	'focusout' : function(e) {
		var _id = $(e.target).attr('wpId');
		var attribute = e.target.description;
		var value = e.target.value;
		var obj = {};
		obj[attribute] = value;
		// If focusout is on a good element with waypoint Id
		if (_id) {
			// Disallow empty string.
			// @To do... Need to check if others waypoints have the same name or id.
			if (value == null || value == '') {
				$(e.target).addClass('has-error');
				return;
			}
			console.log(_id, obj);	
			// All is good. Go update waypoints.
			Waypoints.update({_id : _id}, {'$set' : obj});
		}
	},
});
