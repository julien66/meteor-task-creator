/**
 @file
 Task importer / exporter for XCTrack
 **/
import './export/xctrack.html';

	var converter = function (key, opposite) {
		var conv = {
    			"race-to-goal" : "RACE",
    			"entry" : "ENTER",
			"start" : "SSS",
			"end-of-speed-section" : "ESS"
		}
		if (opposite) {
			var test = Object.keys(conv).find(entry => conv[entry] === key);
			return (test) ? test : key.toLowerCase(); 
		}
		return (conv[key]) ? conv[key] : key;
  	};
  
  	var check = function(text, filename) {
    		if (filename.split('.').pop() == 'xctsk') {
      			return true;
    		}
    		return false;
  	};

  	var parse = function(text, filename) {
		var data = JSON.parse(text);
		var wps = [];
    		var tps = data.turnpoints.map(function(elem, index){
			var wp = {
				name : elem.waypoint.name,
				id :  elem.waypoint.description,
				x : elem.waypoint.lat,
				y : elem.waypoint.lon,
				z : elem.waypoint.altSmoothed,
				filename : filename,
			}
			
			var tp = {
				radius : elem.radius,
				type : converter(elem.type, true),
				wp : wp,
			}

			if (tp.type === "end-of-speed-section") {
				tp.close = data.goal.deadline.slice(0, -1);
				tp.goalType = data.goal.type;
			} 
			
			if (tp.type === 'start') {
				tp.open = data.sss.timeGates[0].slice(0, -1);
				tp.mode = data.sss.type;
			}
			wps.push(wp);
			return tp; 
    		});
		return {
			task : {
				date : "",
				type : data.sss.race,
				num : 1,
				turnpoints : tps 
			}, 
			waypoints : wps 
		};
  	};
  
  	var exporter = function(task) {
		var xcInfo =  {};
    		for (var i = 0; i < task.turnpoints.length; i++) {
      			if (task.turnpoints[i].type == "start") {
        			xcInfo.timeGates = task.turnpoints[i].open;
        			//xcInfo.type = converter[taskInfo.type] ? converter[taskInfo.type] : taskInfo.type;
        			xcInfo.direction = converter[task.turnpoints[i].mode] ? converter[task.turnpoints[i].mode] : task.turnpoints[i].mode;
      			}
    		}
    
		for (var i = 0; i < task.turnpoints.length; i++) {
      			if (task.turnpoints[i].type == "goal") {
        			xcInfo.deadline = task.turnpoints[i].close;
        			xcInfo.goalType = converter[task.turnpoints[i].goalType] ? converter[task.turnpoints[i].goalType] : task.turnpoints[i].goalType;
      			}
    		}
		if (!xcInfo.timeGates) {xcInfo.timeGates = '12:30:00'};
		if (!xcInfo.deadline) {xcInfo.deadline = '18:30:00'};
		if (!xcInfo.direction) {xcInfo.direction = 'EXIT'};
		if (!xcInfo.type) {xcInfo.type = 'RACE'};
    		
		var data = Blaze.toHTMLWithData(Template.exportXCtrack, {task : task, xcInfo : xcInfo});
    		return new Blob([data], {'type': "text/plain"});
  	};
	
	let name = "XCtrack";
	let extension = '.xctsk';

	Template.exportXCtrack.helpers({
		'isLast' : function(index) {
			return index === Template.instance().data.task.turnpoints.length - 1;
		},
		'upperCase' : function(text) {
			if (text) {
				return converter(text).toUpperCase();
			}
		}
	});

  	export {
    		check,
    		exporter,
    		extension,
    		name,
    		parse,
  	};
