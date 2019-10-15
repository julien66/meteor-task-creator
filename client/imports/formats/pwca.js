/**
 * @file
 * pwcHtml parser module for the task creator.
 */
var check = function(data, source) {
	if (!source && data.PWCA == true) {
		return true;
	}
	return false;
}  

var parse = function(data, source) {
	var task = data.task;
	var tps = [];
	var wps = [];
	
	console.log(data);
	for (var i = 0; i < task.points.length; i++) {
		var pt = task.points[i];
		var wp = {
			description : pt.id,
			name :  pt.name,
			lat : pt.center[0],
			lon : pt.center[1],
			altitude : 0,
			source : 'PWCA',
		}
		wps.push(wp);
		var tp = {
			radius : (pt.radius == 0) ? pt.radius = 200 : pt.radius,
			role : convertType(pt),
			wp : wp,
		}
	        tp = Object.assign(tp, wp);	
		if (tp.type === "end-of-speed-section") {
			tp.close = task.details.end + ':00';
			tp.goalType = '';
		} 
			
		if (tp.type === 'start') {
			tp.open = task.details.start + ':00';
			tp.mode = '';
		}

		tps.push(tp);
	}

    	return {
		task : {
			date : data.task_data,
			type : converter[task.details.race],
			num : task.details.task,
			turnpoints : tps 
		}, 
		waypoints : wps 
    	}
 }

var convertType = function (pt) {
	if (pt.id == 'TO') {
		return 'TAKEOFF';
	} 

	if (pt.id == 'GOAL') {
		return 'GOAL';
	}

	if (pt.ss == 'ES') {
		return 'ESS';
	}
	
	if (pt.ss == 'SS') {
		return 'START';
	}

	return 'TURNPOINT';
}

var converter = {
	'Race to Goal' : 'RACE',
}

let name = 'pwca';

export {
    check,
    name,
    parse,
 }
