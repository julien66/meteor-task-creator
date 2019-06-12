/**
 * @file
 * JS waypoints exporter
 */
import  * as fileExporter from './imports/exporter';

Template.exportWaypoints.helpers({
	waypoints	: function() {
		return Waypoints.find();
	},
	exportFormat : function() {
		return ['GPX', 'OziExplorer', 'CUP'];
	}
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
	}
});
