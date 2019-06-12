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

Template.exportTask.events({
	'submit Form' : function(e) {
		e.preventDefault();
		var format = e.target.format.value;
		fileExporter.exportFile('task', format, null);
	}
});
