import Parameters from './param';
//import Optimiser from './imports/betterOptimiser.js';
import Optimiser from './imports/teoOptimiser.js';
import  * as fileExporter from './imports/exporter';


Template.map.onCreated( function onGmap() {
	Session.set('taskDistance', null);
	// We can use the `ready` callback to interact with the map API once the map is ready.
	GoogleMaps.ready('raceMap', function(map) {
		var param = Parameters.param;
		var markers = [];
		var circles = [];
		var fastTrack = null;

		var bounds = new google.maps.LatLngBounds();
		
		var elevator = new google.maps.ElevationService();
		var geocoder = new google.maps.Geocoder;
		
		Waypoints.find().observe({  
			added: function(waypoint) {
				// Create a marker for this waypoints
				var marker = new google.maps.Marker({
					label: {
						text : waypoint.name,
						color : "#000",
						fontSize: "11px",
						fontWeight: "bold",
						'text-shadow': "0px 0px 10px #000",
					},
					icon : {
						path: 'M 0,0 C -2,-20 -10,-22 -10,-30 A 10,10 0 1,1 10,-30 C 10,-22 2,-20 0,0 z M -2,-30 a 2,2 0 1,1 4,0 2,2 0 1,1 -4,0',
						fillColor: "#FE7569",
						fillOpacity: 1,
						strokeColor: '#CB4236',
						strokeWeight: 1,
						scale: 1,
						labelOrigin : new google.maps.Point(0, 10),
					}, 
					position: new google.maps.LatLng(waypoint.lat, waypoint.lon),
					map: map.instance,
					// Store waypoints _id on the marker. 
					id: waypoint._id,
					wp : waypoint,
				});
				// Store this marker instance within the markers object.
				markers[waypoint._id] = marker;
				google.maps.event.addListener(marker, 'click', function() {
					Modal.show('waypoint', marker.wp);
				});
				// Fit map bounds to markers.
				bounds.extend(marker.position);
				bounds.justChanged = true;
				map.instance.fitBounds(bounds);
			},
			changed : function(waypoint) {
				var marker = markers[waypoint._id];
				// Change marker reference to this waypoint.
				marker.wp = waypoint;
				// Set new label.
        			marker.label.text = waypoint.name;
        			marker.setLabel(marker.label);
			},
			removed: function(waypoint) {
				//Remove the marker from the map
				markers[waypoint._id].setMap(null);
				// Clear the event listener
				google.maps.event.clearInstanceListeners(markers[waypoint._id]);
				// Remove the reference to this marker instance
				delete markers[waypoint._id];
				bounds = new google.maps.LatLngBounds();
				Object.keys(markers).forEach(function(key, index) {
					bounds.extend(this[key].position);
				}, markers);
				bounds.justChanged = true;
				// Only update maps if there is at least a marker left;
				if (markers.length > 0) {
					map.instance.fitBounds(bounds);
				}
			},
		});
		
		google.maps.event.addListener(map.instance, 'bounds_changed', function(event) {
			if (this.getZoom() > 14 && bounds.justChanged === true) {
				this.setZoom(14);
			}
			bounds.justChanged = false;
		});


		Turnpoints.find().observe({
			added : function(turnpoint) {
				if (turnpoint.role !== 'goal' || turnpoint.finish !== 'line') {
					var circleOptions = {
						strokeColor: param.turnpoint.strokeColor[turnpoint.role.toLowerCase()],
						strokeOpacity: 0.8,
						strokeWeight: 2,
						fillColor: param.turnpoint.fillColor[turnpoint.role.toLowerCase()],
						fillOpacity: 0.35,
						map: map.instance,
						center: new google.maps.LatLng(turnpoint.lat, turnpoint.lon),
						radius: parseInt(turnpoint.radius),
						tp: turnpoint,
					};
					var circle = new google.maps.Circle(circleOptions);
					circles[turnpoint._id] = circle;
				}	
				google.maps.event.addListener(circle, 'click', function() {
					Modal.show('turnpoint', circle.tp);
				});
			},
			changed : function(turnpoint) {
				var circle = circles[turnpoint._id];
				circle.setOptions({
					strokeColor: param.turnpoint.strokeColor[turnpoint.role.toLowerCase()],
					fillColor: param.turnpoint.fillColor[turnpoint.role.toLowerCase()],
					radius : parseInt(turnpoint.radius),
					tp : turnpoint,
				});
			},
			removed : function(turnpoint) {
				circles[turnpoint._id].setMap(null);	
				google.maps.event.clearInstanceListeners(circles[turnpoint._id]);
				delete circles[turnpoint._id];
				Task.update({}, {'$pull' : {'turnpoints' : {'wp._id' : turnpoint.wp._id}}});
			},
		});

		var checkTaskChange = function(task, pastTask) {
			if (task.turnpoints.length != pastTask.turnpoints.length) {
				return true;
			}
			for (var i = 0; i < task.turnpoints.length; i++) {
				var e = task.turnpoints[i];
				var t = pastTask.turnpoints[i];
				if ((e.radius !== t.radius) || (e.description !== t.description) || (e.name !== t.name)) {
					return true;
				} 
			};
		};

		Task.find().observe({
			changed : function(task, pastTask) {
				// If the task has really changed. Not just an IGCLibOpti added...
				console.log(checkTaskChange(task, pastTask));
				if (checkTaskChange(task, pastTask)) {
					// Export task a XC Track format to get Server side optimizer.
					fileExporter.exportFile('task', 'XCtrack', null, true);
					// Use client side optimizer	
					var opti = Optimiser.optimize(google, map.instance, task.turnpoints);
					if (opti && opti.points) {
						drawOpti(opti.points);
						setLegsDistances(task, opti.legs);
					}
				}
				else if (task.IGCLibOpti){
				// The task is the same, an opti has been returned from igclib! 
					var fastWaypoints = [];
					task.opti.points.forEach(function(el) {
						var latLng = new google.maps.LatLng(el.lat, el.lon);
						fastWaypoints.push(latLng);
					}) 
					drawOpti(fastWaypoints);
					setLegsDistances(task, task.opti.legs);
				}
				// Store total distances into session.
				//Session.set('taskInfos',  infos);
			},
		});

		var drawOpti = function(fastWaypoints) {
			if (fastTrack) fastTrack.setMap(null);
			fastTrack = new google.maps.Polyline({
				path: fastWaypoints,
				geodesic: true,
				strokeColor: param.task.courseColor.fast,
				strokeOpacity: 1.0,
				strokeWeight: 2,
				icons: [{
					icon: {path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW},
					offset: '0',
					repeat: '100px'
				}],
				map: map.instance,
			});
		};

		var setLegsDistances = function(task, legsDistances) {
			// Set new distance to next turnpoint.
			for (var j = 0; j < task.turnpoints.length; j++) {
				Turnpoints.update( {'_id' : task.turnpoints[j]['_id']}, {'$set' : 
					{
						next : legsDistances[j],
						previous : ((j-1 >= 0) ? legsDistances[j-1] : 0) 
					}
				});
			}
		};

		Tracker.autorun(function() {
			var customWp = Session.get('customWaypoint');
			if (customWp) {
				map.instance.setOptions({draggableCursor:'pointer'});
			} else {
				map.instance.setOptions({draggableCursor:null});
			}
		});
		
		google.maps.event.addListener(map.instance, 'click', function(e) {
			var customWp = Session.get('customWaypoint');
			if (customWp) {
				var lat = Math.round(e.latLng.lat()*100000 + 0.5) / 100000;
				var lng = Math.round(e.latLng.lng()*100000 + 0.5) / 100000;
				elevator.getElevationForLocations({'locations' : Array(e.latLng)}, function(results, status) {
					var alt = Math.round(results[0].elevation);
					var adress = results[1] ? results[1].address_components[0].short_name : 'Unknown';
					geocoder.geocode({'location': {lat, lng}}, function(results, status) { 
						var wp = {
							name : 'TP' + Number(Waypoints.find().fetch().length + 1),
							source : 'custom',
							description : adress,
							lat : lat,
							lon : lng,
							altitude : alt, 
						};
						Waypoints.insert(wp);
					});
				});
				//map.instance.setOptions({draggableCursor:'pointer'});
			}
		});
	});
});