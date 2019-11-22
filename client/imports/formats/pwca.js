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
	var open = '00:00:00';
	var start = '00:00:00';
	var end = '00:00:00';
	
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
		if (tp.role === "ESS") {
			tp.close = task.details.end + ':00';
			tp.goalType = '';
		} 
			
		if (tp.role === 'START') {
			tp.open = task.details.start + ':00';
			tp.mode = '';
		}
		
		if (tp.role === 'TAKEOFF') {
			tp.open = task.details.open + ':00';
			tp.close = task.details.close + ':00';
		}
		tps.push(tp);
	}
    	return {
		task : {
			close : task.details.close,
			date : data.task_data,
			end : task.details.end,
			num : task.details.task,
			open : task.details.open,
			start : task.details.start,
			turnpoints : tps,
			type : converter[task.details.race],
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
