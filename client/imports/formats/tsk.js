/**
  @file
  TSK Task importer / Exporter.
  **/
  

	import './export/tsk.html';  

	var check = function(text, filename) {
    if (filename.split('.').pop() == 'tsk') {
      return true;
    }
    return false;
  }

  var parse = function(text, filename) {
    if (window.DOMParser) {
      var parser = new DOMParser();
      var xmlDoc = parser.parseFromString(text, "text/xml");
    }

    var rtetp = xmlDoc.getElementsByTagName("rtept");
    var tps = [];
    var wps = [];
    var array = ['close', 'goaltype', 'index', 'mode', 'open', 'radius', 'type'];
    
    for (var i = 0; i < rtetp.length; i++) {
      var tp = {};
      for (var y = 0; y < array.length; y++) {
        var e = array[y]
        tp[e] =  rtetp[i].getElementsByTagName(e)[0].childNodes[0] ? rtetp[i].getElementsByTagName(e)[0].childNodes[0].nodeValue : 0;
      }
      
      if (tp.type == 'endofspeedsection' || tp.type == 'end of speed section' || tp.type == 'ess') {
        tp.type = 'end-of-speed-section';
      } 

      var wp = {  
        filename : filename, //rtetp[i].getElementsByTagName('filename')[0].childNodes[0].nodeValue,
        id : rtetp[i].getElementsByTagName('id')[0].childNodes[0].nodeValue,
        name : rtetp[i].getElementsByTagName('name')[0].childNodes[0].nodeValue,
        x : rtetp[i].getAttribute('lat'),
        y : rtetp[i].getAttribute('lon'),
        z : rtetp[i].getElementsByTagName('z')[0].childNodes[0].nodeValue,
      }
      wps.push(wp);
      tp.wp = wp;
      tps.push(tp);
    } 

    return {
      'task' : {
        'date' : xmlDoc.getElementsByTagName('date')[0].childNodes[0] ? xmlDoc.getElementsByTagName('date')[0].childNodes[0].nodeValue : "",
        'type' : xmlDoc.getElementsByTagName('type')[0].childNodes[0] ? xmlDoc.getElementsByTagName('type')[0].childNodes[0].nodeValue : "",
        'num' : xmlDoc.getElementsByTagName('num')[0].childNodes[0] ? xmlDoc.getElementsByTagName('num')[0].childNodes[0].nodeValue : "",
        'turnpoints' : tps,
      },
      'waypoints' : wps,
    }
  }
  
  var exporter = function(task) {
		console.log(task);
    var data = Blaze.toHTMLWithData(Template.exportTSK, {turnpoints : task.turnpoints, taskInfo : task.taskInfo});
    return new Blob([data], {'type': "text/xml"});
  }

	let name = 'TSK';
	let extension = ".tsk";

  export {
    check,
    exporter,
		extension,
    name,
    parse,
  }
