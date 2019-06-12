/**
 @file
 Task importer / exporter for XCTrack
 **/
import './export/xctrack.html';

	var converter = {
    "race-to-goal" : "RACE",
    "entry" : "ENTER"
  };
  
  var check = function(text, filename) {
    if (filename.split('.').pop() == 'xctsk') {
      return true;
    }
    return false;
  };

  var parse = function(text, filename) {
    return false;
  };
  
  var exporter = function(task) {
    var xcInfo =  {};
		console.log(task);
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
    var data = Blaze.toHTMLWithData(Template.exportXCtrack, {	task : task, xcInfo : xcInfo});
    return new Blob([data], {'type': "text/plain"});
  };
	
	let name = "XCtrack";
	let extension = '.xctsk';

	Template.exportXCtrack.helpers({
		'semicolon' : function(index) {
			console.log(Template.instance().data);
			return '';
			//return index < (Template.instance().data.turnpoints.length - 1);
		},
	});

  export {
    check,
    exporter,
    extension,
    name,
    parse,
  };
