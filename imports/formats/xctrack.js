/**
 @file
 Task importer / exporter for XCTrack
 **/
import './export/xctrack.html';

	var converter = function (key, opposite) {
		var conv = {
    			"RACE" : "RACE",
    			"ENTER" : "ENTER",
			"START" : "SSS",
		}
		if (opposite) {
			var test = Object.keys(conv).find(entry => conv[entry] === key);
			return (test) ? test : key.toLowerCase(); 
		}
		return (conv[key]) ? conv[key] : key;
  	};
  
  	var check = function(text, source) {
    		if (source.split('.').pop() == 'xctsk') {
      			return true;
    		}
    		return false;
  	};

  	var parse = function(text, source) {
		var data = JSON.parse(text);
		var wps = [];
    		var tps = data.turnpoints.map(function(elem, index){
			var wp = {
				description : elem.waypoint.name,
				name :  elem.waypoint.description,
				lat : elem.waypoint.lat,
				lon : elem.waypoint.lon,
				altitude : elem.waypoint.altSmoothed,
				source : source,
			}
				
			var tp = {
				radius : elem.radius,
				role : (elem.type) ? converter(elem.type, true).toUpperCase() : 'TURNPOINT',
				wp : wp,
			}
			tp = Object.assign(tp, wp);
			if (tp.role === "ESS") {
				tp.close = data.goal.deadline.slice(0, -1);
				tp.finish = data.goal.type;
			} 
			
			if (tp.type === 'START') {
				tp.open = data.sss.timeGates[0].slice(0, -1);
				tp.direction = data.sss.type;
			}
			wps.push(wp);
			return tp; 
    		});
		return {
			task : {
				date : "",
				style : data.sss.race,
				number : 1,
				turnpoints : tps 
			}, 
			waypoints : wps 
		};
  	};
  
  	var exporter = function(task) {
		var xcInfo =  {};
    		for (var i = 0; i < task.turnpoints.length; i++) {
      			if (task.turnpoints[i].role == "START") {
        			xcInfo.timeGates = task.turnpoints[i].open;
        			//xcInfo.type = converter[taskInfo.type] ? converter[taskInfo.type] : taskInfo.type;
        			xcInfo.direction = converter[task.turnpoints[i].direction] ? converter[task.turnpoints[i].direction] : task.turnpoints[i].direction;

      			}
    		}
    
		for (var i = 0; i < task.turnpoints.length; i++) {
      			if (task.turnpoints[i].role == "GOAL") {
        			xcInfo.deadline = task.turnpoints[i].close;
        			xcInfo.goalType = converter[task.turnpoints[i].finish] ? converter[task.turnpoints[i].finish] : task.turnpoints[i].finish;
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
