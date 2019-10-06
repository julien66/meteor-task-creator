
/**
 * @file 
 * ZIP parser module for the task creator.
 */
  
  /**
   * @todo
   */
	var check = function(text, filename) {
    	console.log(text, filename);
		if (filename.split('.').pop() == 'zip') {
			return true;
		}
		return false;
	};

	var parse = function(text, filename) {	
		console.log('send to server');
	};

	let name = 'ZIP';
	let extension = '.zip';

	export {
		check,
		extension,
		name,
		parse,
	}
