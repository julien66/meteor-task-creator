/**
 * @file
 * Ozi parser module for the task creator.
 */
import './export/gpx.html';

  /**
   * @todo
   * Poor check : Able to parse xml or not
   */
  var check = function(text, filename) {
    if (window.DOMParser) {
      var parser = new DOMParser();
      var xmlDoc = parser.parseFromString(text, "text/xml");
    }
    /*else {
      xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
      xmlDoc.async = false;
      xmlDoc.loadXML(text);
    }*/

    if (xmlDoc) {
      return true;
    }

    return false;
  }
  
  var parse = function(text, filename) {
    if (window.DOMParser) {
      var parser = new DOMParser();
      var xmlDoc = parser.parseFromString(text,"text/xml");
    }

    var wpts = xmlDoc.getElementsByTagName("wpt");
    var tps = [];
    for (var i = 0; i < wpts.length; i++) {
      var tp = {
        filename : filename,
        id :  wpts[i].getElementsByTagName('name')[0].childNodes[0].nodeValue,
	name : wpts[i].getElementsByTagName('desc')[0].childNodes[0].nodeValue,
        x : wpts[i].getAttribute('lat'),
        y : wpts[i].getAttribute('lon'),
        z : wpts[i].getElementsByTagName('ele')[0].childNodes[0].nodeValue,
      }
      tps.push(tp);
    }

    return {
      'waypoints' : tps,
    }
  }

  var exporter = function(waypoints) {
    var data = Blaze.toHTMLWithData(Template.exportGPX, {waypoints : waypoints});
    var header = '<?xml version="1.0" encoding="UTF-8" standalone="no" ?>';
		return new Blob([header + data], {'type': "text/xml"});
  }

  function ftToMeter(ft) {
    return Math.round(ft * 0.3048);
  }

	
  let extension = '.gpx';
  let name = 'GPX';

  export {
    check,
    exporter,
    extension,
    name,
    parse,
  }


