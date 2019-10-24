/**
 * @file
 * JS paragliding task optimiser
 * Adapted from Teo Bouvard's optimizer
 * https://github.com/teobouvard/igclib/blob/master/igclib/utils/optimizer.py
 */
import * as Parameters from '../param.js';

var param = Parameters.param;

// Main export.
var optimize = function(google, map, turnpoints) {
	var infos = get_fast_waypoints(google, turnpoints);
	return infos;
}

// Get heading from a to another with google map geometric library.
function get_heading(wptA, wptB) {
	return google.maps.geometry.spherical.computeHeading(wptA.LatLng, wptB.LatLng);
}

// Get offset (projected point) from a point to a given distance and heading with google map geometric library.
function get_offset(wpt, heading, dist) {
	return google.maps.geometry.spherical.computeOffset(wpt.LatLng, dist, heading);
}

// Get distance from two points with google map geometric library.
function get_distance(wptA, wptB) {
	return  google.maps.geometry.spherical.computeDistanceBetween(wptA.LatLng, wptB.LatLng);
}

// Add google map LatLng object to turnpoints.
function latLng(wpt) {
	if (typeof wpt.lat !== "function") {
		var latLng = new google.maps.LatLng(wpt.lat, wpt.lon);
		wpt.LatLng = latLng;
	};
	return wpt;
}

// Main magic.
function get_fast_waypoints(google, turnpoints) {
	//Pushing current position as a fast waypoint, initializing current distance at zero
	var fast_waypoints = [latLng(turnpoints[0])];
	var optimized_distance = 0;
	var legDistances = [];
        
	// Consider your position (one) the next two turnpoints (two, three)
        for (var i = 0; i < turnpoints.length; i++) {
		var one = fast_waypoints[fast_waypoints.length-1];
		var two = null;
		var three = null;
		var heading = null;

		if(turnpoints[i + 1]) {
			two = latLng(turnpoints[i + 1]);
		}
		else {
			// There is only one turnpoint. Nothing to do.
			// @todo... fast_waypoint should stop on the edge of the cylinder?
			fast_waypoints.push(latLng(turnpoints[turnpoints.length - 1]));
			break;
		}

		if (turnpoints[i + 2]) {
			three = latLng(turnpoints[i + 2]);
		} else {
			// If there is no turnpoints 3 then act as if 3 was again a turnpoint 2.
			three = two;
		}
	
		in_heading = get_heading(two, one);
		in_distance = get_distance(one, two);
       		out_distance = get_distance(two, three);
		
		// two next turnpoints are identical
		if (two.LatLng.equals(three.LatLng) && i < turnpoints.length - 2) {
			next_target = find_next_not_concentric(two, turnpoints)
			out_heading = get_heading(two, next_target)
                	angle = out_heading - in_heading
                	// we want to go at half the median angle to go out, half the median angle to go back in
                	leg_heading = in_heading + 0.5 * angle;
                	leg_distance = two.radius;
		}	
            	else {
                	out_heading = get_heading(two, three)
                	angle = out_heading - in_heading
                	leg_heading = in_heading + 0.5 * angle
                	leg_distance = (2 * in_distance * out_distance * Math.cos((angle * 0.5) * (Math.PI / 180))) / (in_distance + out_distance)
		}
            	
		min_leg_distance = Math.min(leg_distance, two.radius);
		fast_wp = {LatLng : get_offset(two, leg_heading, min_leg_distance)};
		fast_waypoints.push(fast_wp);
            	var opti_leg = get_distance(one, fast_wp);
		legDistances.push(opti_leg);
		optimized_distance += opti_leg;
	}
        
	// We only return LatLng object for google map.
	//console.log(fast_waypoints.map(function(item) {return item['LatLng'].lat() + ' ' + item['LatLng'].lng()}));
	onlyLat = fast_waypoints.map(function(item) {return item['LatLng']});
	
	return {
		distance : optimized_distance,
		points : onlyLat,
		legs : legDistances,
	}
}

// From a given turnpoint this function seek the next turnpoint that is not concentric.
function find_next_not_concentric(wpt, turnpoints) {
	var index = turnpoints.findIndex( function(tps) {
		return wpt.LatLng.equals(tps.LatLng);
	});
	
	while (wpt.LatLng.equals(turnpoints[index].LatLng) && index < turnpoints.length - 1) {
        	index += 1;
	}
    	
	return latLng(turnpoints[index]);
}

export {
	optimize,
}
