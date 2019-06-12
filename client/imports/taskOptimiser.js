/**
 * @file.
 * Task optimiser module for the task creator.
 */
import * as Parameters from '../param.js';


  // Fast Polyline
  var fastTrack; 
  var fastWaypoints = Array();
  var fastDistance = 0;
  var distances = [];

	var param = Parameters.param;

  let optimize = function(google, map, turnpoints) {
    var headings = Array();
    fastWaypoints = Array();
    fastDistance = 0;
    distances = [];
		for (var i = 0; i < turnpoints.length; i++) {
      // For all turnpoint except the last one.
      if (i < turnpoints.length - 1) {
        // Getting the heading.
				var currentLatLng = new google.maps.LatLng(turnpoints[i].wp.x, turnpoints[i].wp.y);
				var nextLatLng = new google.maps.LatLng(turnpoints[i + 1].wp.x, turnpoints[i + 1].wp.y);
				var heading = google.maps.geometry.spherical.computeHeading(currentLatLng, nextLatLng);
				console.log(heading);
        // Unsure heading is always positive.
        if (heading < 0) heading += 360;
        if (headings.length >= 1) {
          // Switch first heading from 180°.
          var pastHeading = headings[i- 1];
          
          // We need to catch the right angle !!!
          if (pastHeading > heading) {
            pastHeading -= 180;
          }else {
            pastHeading += 180;
          }
           
          // Now we can get the average heading. (Bisectrix).
          var middleHeading = (pastHeading + heading) / 2;  
          
          // If both turnpoints are the same. Keep past heading instead of 0.
          if (currentLatLng.equals(nextLatLng)) {
            middleHeading = pastHeading;
					}
          
          // Offset from the center to the radius to get the intermediary point.
          var fastPoint = google.maps.geometry.spherical.computeOffset(currentLatLng, turnpoints[i].radius, middleHeading); 
        }
        else {
					var fastPoint = google.maps.geometry.spherical.computeOffset(currentLatLng, turnpoints[i].radius, heading); 
        }
        headings.push(heading);
        fastWaypoints.push(fastPoint);
        incrementDistance(google, fastWaypoints);
			} 
    }
    
    // For the last turnpoint if it's a line the point doesn't change.
    // if it's a cylinder just reverse the last heading from the center and offset to the radius.
    if (headings.length >= 1) {
			var previousLatLng = new google.maps.LatLng(turnpoints[i - 1].wp.x, turnpoints[i - 1].wp.y);
      if (turnpoints[i - 1].goalType == "Line" && turnpoints[i - 1].type == "Goal") {
				var newPoint = previousLatLng;
      }
      else {
				var beforeLatLng = new google.maps.LatLng(turnpoints[i - 2].wp.x, turnpoints[i -2].wp.y);
				if (beforeLatLng.equals(previousLatLng)) {
          var newPoint = google.maps.geometry.spherical.computeOffset(previousLatLng, turnpoints[i - 1].radius, headings[headings.length - 2] - 180);
				}
        else {
          var newPoint = google.maps.geometry.spherical.computeOffset(previousLatLng, turnpoints[i - 1].radius, headings[headings.length - 1] - 180);
        }
      }

      fastWaypoints.push(newPoint);
      incrementDistance(google, fastWaypoints);
    }
  
    var lineSymbol = {
      path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW
    };
 
		console.log(fastDistance, distances, fastWaypoints);
    return { 
      distance : fastDistance,
      distances : distances,
      fastWaypoints : fastWaypoints,
     }
  }

  function incrementDistance(google, waypoints) {
    if (waypoints.length > 1) {
      var distance = google.maps.geometry.spherical.computeDistanceBetween(
        waypoints[fastWaypoints.length - 1],
        waypoints[fastWaypoints.length - 2]
      );
      fastDistance += distance;
      distances.push(Math.round(distance / 10)/100);
    }
  }

  export {optimize}
