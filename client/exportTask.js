/**
 * @file
 * JS Task Exporter
 */
import  * as fileExporter from './imports/exporter';

Template.exportTask.helpers({
	'formats' : function() {
		return ['XCtrack', 'TSK', 'KML'];
	}
});

Template.exportTask.onRendered(function onExportTaskRendered() {
	// Keeping this for further reference.
	var tmp = this;
	// Listen when modal box is hidden...
	$('#taskExporterModal').on('hidden.bs.modal', function () {
		// Blaze remove 'this' (above) template view.
		Blaze.remove(tmp.view);
	});
	$('#taskExporterModal').modal('show');
});

Template.exportTask.events({
	'submit Form' : function(e) {
		e.preventDefault();
		var format = e.target.format.value;
		fileExporter.exportFile('task', format, null);
		$('#taskExporterModal').modal('hide');
	}
});
