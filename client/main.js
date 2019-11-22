import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
// Going for bootstrap.
import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap4-toggle/css/bootstrap4-toggle.min.css';

// All this stuff is only for jquery ui and enabling the taskboard to be draggable...
import 'jquery-ui/themes/base/core.css';
import 'jquery-ui/themes/base/theme.css';
import 'jquery-ui/themes/base/sortable.css';
import 'jquery-ui/ui/widget';
import 'jquery-ui/ui/scroll-parent';
import 'jquery-ui/ui/data';
import 'jquery-ui/ui/widgets/mouse';
import 'jquery-ui/ui/widgets/sortable';

import './main.html';
// Bootstrap 4 plugin. Toggle.
const pkg = require('bootstrap4-toggle');
//Modal.allowMultiple = true;

delete Session.keys['taskInfos'];
var taskId = Task.insert({
	uid : Meteor.userId(),
	turnpoints : [],
});

// Reset Session.
Session.set('requestOpti', false);
Session.set('taskId', taskId);

Turnpoints = new Mongo.Collection('turnpoints', {connection: null});
Waypoints = new Mongo.Collection('waypoints', {connection: null});

Meteor.subscribe('Task');
Meteor.subscribe('Progress');

Meteor.startup(function() {	
	GoogleMaps.load({
		key : 'AIzaSyDNrTc1a1WM07PlACypa2WbEAthHXIk-_A', 
		libraries : 'geometry,elevation', 
	});

});

Template.map.helpers({
	mapOptions: function() {
		// Make sure the maps API has loaded
		if (GoogleMaps.loaded()) {
			// Map initialization options
			return {
				center : new google.maps.LatLng(42.514, 2.040),
				zoom : 8,
				mapTypeId : google.maps.MapTypeId.TERRAIN,
				styles : [
					{elementType: 'labels.text.fill', stylers: [{color: '#746855'}]},    
				],
			};
		}
	}
});
