/*
  @js file
  * Map.js
*/

import Parameters from './param';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-polylinedecorator';

Template.map.onRendered( function onLeaf() {
	var param = Parameters.param;
	
	var map = L.map('map', {
    		center: [param.map.startLat, param.map.startLon],
   		 zoom: 13
	});
	
	// create the tile layer with correct attribution
 	//var osmUrl='http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
 	var osmUrl='http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    	var osmAttrib='Map data © <a href="http://openstreetmap.org">OpenStreetMap</a> contributors';
    	var osm = new L.TileLayer(osmUrl, {attribution: osmAttrib});
	map.addLayer(osm);

	var markers = [];
	var circles = [];
	var pilots = {};
	var polyline;
	var decorator;
	
	
	window.addEventListener('newPilots', addPilots);
	window.addEventListener('movePilots', movePilots);
	function addPilots(e) {
		var ids = e.detail.ids;
		var ranking = e.detail.ranking;
		for (var i = 0; i < ids.length -1; i++) {
			if (!pilots[ids[i]]) {
				var name = ids[i];
				var color = "#f0ad4e";
				var darkerColor = '#000';
				var rankObj = ranking[ids[i]];
				if(ranking[ids[i]]) {
					name = rankObj.name;
					color = rankObj.color;
					darkerColor = rankObj.darkerColor
				}
				var pilotIcon = L.divIcon({
   					html: '<i class="fa fa-circle" style="text-shadow:0px 0px 5px ' + darkerColor + ';color:' + color + '"></i><div class="iconLabel">' + name + '</div>',
    					className: 'myDivIcon',
					iconAnchor: [15, 45]
				});
				var marker = L.marker([0, 0], {
  					icon: pilotIcon,
				}).addTo(map);
				pilots[ids[i]] = marker;
			}
		}
	};
		
	function movePilots(e) {
		if (e.detail && e.detail.snap) {
			var snap = e.detail.snap;
			//console.log(snap);
			for (let [id, value] of Object.entries(snap)) {
				if (pilots[id]) {
					pilots[id].setLatLng(new L.LatLng(value.lat, value.lon));
				}
				else {
					//console.log(id);
				}
			}
		}
	}; 	
	
	// @TODO Finding elevation with open elevation or other api is a must.
	map.on('click', function(e) {
		if (Session.get('customWaypoint')) {   
        		var latLng = e.latlng;
			var waypoint = {
				name : 'TP' + Number(Waypoints.find().fetch().length + 1),
				source : 'custom',
				description : 'Unknown',
				lat : e.latlng.lat,
				lon : e.latlng.lng,
				altitude : 0, 
			};
			Waypoints.insert(waypoint);
		}
    	});

	this.autorun(function() {
		if (Session.get('customWaypoint')) {
			$('#map').css('cursor', 'pointer');
		} else {
			$('#map').css('cursor', 'grab');
		}
	});



	Waypoints.find().observe({  
		added: function(waypoint) {
			// Create a marker for this waypoints
			// Here's a custom icon.
			var icon = L.divIcon({
   				html: '<i class="fa fa-4x fa-map-marker" style="color:#FE7569"></i><div class="iconLabel">' + waypoint.name + '</div>',
    				className: 'myDivIcon',
				iconAnchor: [15, 45]
			});
			// here's the marker itself with icon and waypoint as a reference (usefull on click).
			var marker = L.marker([waypoint.lat, waypoint.lon], {
  				icon: icon,
			});
			
			marker.waypoint = waypoint;
			
			// On click show modal and pass the form there all waypoint object.
			marker.on('click', function(e) {
				Blaze.renderWithData(Template.waypoint, this.waypoint, document.body);
			});
			// Keeping track of markers.
			markers[waypoint._id] = marker;
			// Addind it all to map.
			var group = new L.featureGroup(Object.values(markers)).addTo(map);
			// Fitting bounds to waypoints with slight padding to deal with the edges.
			map.fitBounds(group.getBounds().pad(0.05));
		},
		changed : function(waypoint) {
			// Take the marker and update options.
			var marker = markers[waypoint._id];
			// Set reference to the waypoint inside Marker (usefull on click).
			marker.waypoint = waypoint;
			// Set Marker Icon with  Waypoint.name
			marker.setIcon(L.divIcon({
   				html: '<i class="fa fa-4x fa-map-marker" style="color:#FE7569"></i><div class="iconLabel">' + waypoint.name + '</div>',
    				className: 'myDivIcon',
				iconAnchor: [15, 45]
			}));
		},
		removed : function(waypoint) {
			// Get rid of the marker on the map.
			map.removeLayer(markers[waypoint._id]);
			// cleaning local reference.
			delete markers[waypoint._id];
		}
	});

	Turnpoints.find().observe({
		added : function(turnpoint) {	
			var circle = L.circle([turnpoint.lat, turnpoint.lon], {
				radius: turnpoint.radius,
				color: param.turnpoint.strokeColor[turnpoint.role.toLowerCase()],
				fillColor :  param.turnpoint.strokeColor[turnpoint.role.toLowerCase()],
			}).addTo(map);	
			circle.turnpoint = turnpoint;
			circle.on('click', function(e) {
				Blaze.renderWithData(Template.turnpoint, this.turnpoint, document.body);
			});
			circles[turnpoint._id] = circle;
		},
		changed : function(turnpoint) {
			var circle = circles[turnpoint._id];
			circle.turnpoint = turnpoint;
			circle.setRadius(turnpoint.radius);
			circle.setStyle({
				color: param.turnpoint.strokeColor[turnpoint.role.toLowerCase()],
				fillColor: param.turnpoint.strokeColor[turnpoint.role.toLowerCase()],
			});
		},
		removed : function(turnpoint) {
			// Get rid of the marker on the map.
			map.removeLayer(circles[turnpoint._id]);
			// cleaning local reference.
			delete circles[turnpoint._id];
		},
	});

	Task.find().observe({
		changed : function(task) {
			if (polyline) {
				map.removeLayer(polyline);
				map.removeLayer(decorator);
			}

			if (task.opti) {
				console.log(task.opti);
				polyline = L.polyline(task.opti.points, {color: param.task.courseColor.fast}).addTo(map);
			}
			else {
				polyline = L.polyline(Object.values(task.turnpoints), {color: param.task.courseColor.fast}).addTo(map);
			}

			decorator = L.polylineDecorator(polyline, {
    				patterns: [
        				// defines a pattern of arrow.
               		 		{ offset: '0%', repeat: '5%', symbol: L.Symbol.marker({rotate: true, markerOptions: {
						icon : L.divIcon({
   							html: "<i class='fa fa-chevron-up' style='color:darkSlateGrey'></i>",
    							iconSize: [10, 10],
    							className: 'myDivIcon',
							iconAnchor: [6, 6]
                   			 	})
                			}})}
				]
			}).addTo(map);
			
		},
		removed : function(task) {
		}
	});
});

