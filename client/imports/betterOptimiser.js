/**
 * @file
 * JS paragliding task optimiser
 
 */
 */
 */
import * as Parameters from '../param.js';

var param = Parameters.param;

let optimize = function(google, map, turnpoints) {
	var fastWaypoints = [];
	var distances = [];

	// Pushing center of first turnpoint as a fastWaypoint. 
	if(turnpoints.length > 0) {
		var first = turnpoints[0];
		var latLng = new google.maps.LatLng(first.wp.x, first.wp.y);
		fastWaypoints.push(latLng);
	}

	// Looping turnpoints.
	for (var i = 0; i < turnpoints.length; i++) {
		var one = fastWaypoints[fastWaypoints.length-1];
		var two = null;
		var three = null;
		
		var heading = null;

		if(turnpoints[i + 1]) {
			two = turnpoints[i + 1];
			two.LatLng = new google.maps.LatLng(two.wp.x, two.wp.y);
		}
		else {
			// There is only one turnpoint. Nothing to do.
			var tp = turnpoints[turnpoints.length - 1];
			fastWaypoints.push(new google.maps.LatLng(tp.wp.x, tp.wp.y));
			break;
		}

		if (turnpoints[i + 2]) {
			three = turnpoints[i + 2];
			three.LatLng = new google.maps.LatLng(three.wp.x, three.wp.y);
		} else {
			// If there is no turnpoints 3 then act as if 3 was again a turnpoint 2.
			three = two;
		}

		// Detecting flat lines.
		if (one.equals(two.LatLng) && two.LatLng.equals(three.LatLng) && one.equals(three.LatLng)) {
			// Extreme case. Depend where to go next or any heading can be accepted.
			fastWaypoints.push(three.LatLng);
		}

		if (one.equals(two.LatLng) || two.LatLng.equals(three.LatLng)) {
			//One and two are the same or two and three are the same. Take heading from three to one.
			heading = google.maps.geometry.spherical.computeHeading(three.LatLng, one);
			//console.log(heading);
		}

		if (one.equals(three.LatLng)) {
			// One and three are the same take heading from two to one.
			heading = google.maps.geometry.spherical.computeHeading(two.LatLng, one);
			//console.log(heading);
		}
	
		if(heading) {
			var fastPoint = google.maps.geometry.spherical.computeOffset(two.LatLng, two.radius, heading);
			//fastWaypoints.push(fastPoint);
			continue;
		}
	
		// Now for most regular triangle situation.
		// Go for some bissectrix hack...
		var aHeading = google.maps.geometry.spherical.computeHeading(two.LatLng, one);
		var bHeading = google.maps.geometry.spherical.computeHeading(two.LatLng, three.LatLng);
		// Getting the angle difference between two headings.
		var angle = Math.min((aHeading - bHeading + 360) % 360, (bHeading - aHeading + 360) % 360);
		// Getting the bissectrix heading.
		var legHeading;
		//var test;
		if (((aHeading - bHeading + 360) % 360) > ((bHeading - aHeading + 360) % 360)){
			// We're going counter clockwise
			//test = 'counterclock';
			legHeading = aHeading + (angle * 0.5);
			if (legHeading > 180) {
				legHeading = 360 - legHeading;
			}
		} else {
			// Go Clockwise.
			//test = 'clock';
			legHeading = aHeading - (angle * 0.5);
			if (legHeading < -180) {
				legHeading = legHeading + 360;
			}
		}
		//console.log(two.wp.name, aHeading, bHeading,  angle, legHeading, test);
		// Calculating bissectrix length (2 * AB * Cos(two/2)) / (A+B).
		var aDistance = google.maps.geometry.spherical.computeDistanceBetween(one, two.LatLng);
		var bDistance = google.maps.geometry.spherical.computeDistanceBetween(two.LatLng, three.LatLng);
		var leg = (2 * aDistance * bDistance * Math.cos((angle * 0.5) * (Math.PI /180))) / (aDistance + bDistance);
		var middlePoint =  google.maps.geometry.spherical.computeOffset(two.LatLng, leg, legHeading);
		// Choosing beetween this length or radius length.
		var minLeg = Math.min(leg, two.radius);
		// Finally getting the fastPoint. Projecting the bissectrix.
		var fastPoint = google.maps.geometry.spherical.computeOffset(two.LatLng, minLeg, legHeading);	
		// Storing this hardly gained fastPoint.
		fastWaypoints.push(fastPoint);
		for (i = 0; i < fastWaypoints.length; i++) {
			console.log(i + ':', fastWaypoints[i].lat(), fastWaypoints[i].lng());
			var wp = {
				name : 'custom',
				id : 'Fast ' + i,
				x : fastWaypoints[i].lat(),
				y : fastWaypoints[i].lng(),
				z : 0,
				filename : 'fastWaypoints',  
			};		
			Waypoints.insert(wp);
		}
		/*
		// Debugging block. Displaying middle point on map
		var wp = {
			name : 'custom',
			id : 'M ' + two.wp.name,
			x :	middlePoint.lat(),
			y : middlePoint.lng(),
			z : 0,
			filename : 'middlePoints',
		};
		Waypoints.insert(wp);*/
	}

	return {
		'fastWaypoints': fastWaypoints,
	}
}

export {
	optimize,
}
