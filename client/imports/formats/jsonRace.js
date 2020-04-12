
/**
  @file
  "native" Task importer / Exporter.
**/

var check = function(text, source) {
	if (typeof text === 'object') {
      		return true;
    	}
    	return false;  	
}

var parse = function(text, source) {
	var task = text;
	return {
		waypoints : text.turnpoints,
		task : task,
	};
}
	
let name = 'jsonRace';
let extension = ".jsonRace";

	export {
    		check,
    		exporter,
    		extension,
    		name,
    		parse,
  	}
