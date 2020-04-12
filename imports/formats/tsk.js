/**
  @file
  TSK Task importer / Exporter.
  **/
	import './export/tsk.html';  

	var check = function(text, source) {
    		if (source.split('.').pop() == 'tsk') {
      			return true;
    		}
    	return false;
  	}

  	var parse = function(text, source) {
    		if (window.DOMParser) {
      			var parser = new DOMParser();
      			var xmlDoc = parser.parseFromString(text, "text/xml");
    		}

    		var rtetp = xmlDoc.getElementsByTagName("rtept");
    		var tps = [];
    		var wps = [];
    		var array = ['close', 'finish', 'index', 'direction', 'open', 'radius', 'role'];
    
    		for (var i = 0; i < rtetp.length; i++) {
      			var tp = {};
      			for (var y = 0; y < array.length; y++) {
        			var e = array[y]
        			tp[e] =  rtetp[i].getElementsByTagName(e)[0].childNodes[0] ? rtetp[i].getElementsByTagName(e)[0].childNodes[0].nodeValue : 0;
      			}
      
      			var wp = {  
        			source : source, //rtetp[i].getElementsByTagName('filename')[0].childNodes[0].nodeValue,
        			name : rtetp[i].getElementsByTagName('id')[0].childNodes[0].nodeValue,
        			description : rtetp[i].getElementsByTagName('description')[0].childNodes[0].nodeValue,
        			lat : rtetp[i].getAttribute('lat'),
        			lon : rtetp[i].getAttribute('lon'),
        			altitude : rtetp[i].getElementsByTagName('altitude')[0].childNodes[0].nodeValue,
      			}
      			wps.push(wp);
      			tp.wp = wp;
			tp = Object.assign(tp, wp);
      			tps.push(tp);
    		} 

    	return {
      		'task' : {
        		'date' : xmlDoc.getElementsByTagName('date')[0].childNodes[0] ? xmlDoc.getElementsByTagName('date')[0].childNodes[0].nodeValue : "",
        		'style' : xmlDoc.getElementsByTagName('style')[0].childNodes[0] ? xmlDoc.getElementsByTagName('style')[0].childNodes[0].nodeValue : "",
        		'number' : xmlDoc.getElementsByTagName('number')[0].childNodes[0] ? xmlDoc.getElementsByTagName('number')[0].childNodes[0].nodeValue : "",
        		'turnpoints' : tps,
      		},
      		'waypoints' : wps,
    	}
  }
  
  var exporter = function(task) {
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
