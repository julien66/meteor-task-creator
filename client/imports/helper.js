/*
 * @file
 * JS Helper
 * Contains helper function for task creator.
 */

// Helper function to convert HH:mm:ss or HH:mm into seconds.
var HHtoSeconds = function(hh) {
	if (!hh) {
		return;
	}
	var mult = [3600, 60, 1];
	var array = hh.split(':');
	return parseInt(array.map(function(elt, index){ return elt * mult[index]}).reduce(function(b, a){ return b + a;}));
}

// Helper function to convert seconds into HH:mm:ss.
var secondsToHH = function(seconds) {
	if (!seconds) {
		return;
	}
	return new Date(seconds * 1000).toISOString().substr(11, 8);
}


export {
	HHtoSeconds,
	secondsToHH,
}
