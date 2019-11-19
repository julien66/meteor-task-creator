import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap4-toggle/css/bootstrap4-toggle.min.css';

import './main.html';

const pkg = require('bootstrap4-toggle');
Modal.allowMultiple = true;

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
