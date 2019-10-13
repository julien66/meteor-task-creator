/**
 * @file
 * pwcHtml parser module for the task creator.
 */
var check = function(data, filename) {
	console.log(data, filename)
	if (!filename && data.PWCA == true) {
		return true;
	}
	return false;
}  

var parse = function(data, filename) {
	console.log(data);
	var task = data.task;
	var tps = [];
	var wps = [];
	
	for (var i = 0; i < task.points.length; i++) {
		var pt = task.points[i];
		var wp = {
			name : pt.id,
			id :  pt.name,
			x : pt.center[0],
			y : pt.center[1],
			z : 0,
			filename : 'PWCA',
		}
		wps.push(wp);
		var tp = {
			radius : (pt.radius == 0) ? pt.radius = 200 : pt.radius,
			type : convertType(pt),
			wp : wp,
		}
		
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
	console.log(tps);

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
		return 'takeoff';
	} 

	if (pt.id == 'GOAL') {
		return 'goal';
	}

	if (pt.ss == 'ES') {
		return 'end-of-speed-section';
	}
	
	if (pt.ss == 'SS') {
		return 'start';
	}

	return 'turnpoint';
}

var converter = {
	'Race to Goal' : 'race-to-goal',
}

let name = 'pwca';

export {
    check,
    name,
    parse,
 }
