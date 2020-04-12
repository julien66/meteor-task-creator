/**
  @file
  geoJson format for the taskCreator
  **/
  var check = function(text, source) {
    if (source.split('.').pop() == 'geojson') {
      return true;
    }
    return false;
  }

  var parse = function (text, source) {
    var geo = JSON.parse(text);
    var points = geo.geometry.coordinates.map(function(elem, index){
      var point = geo.properties.turnpoints[index];
      point.lat = elem[1];
      point.lon = elem[0];
      point.source = source;
      point.wp = point;
      return point;
    });

    return {
      task : {
        date : geo.properties.date,
        style : geo.properties.style,
        turnpoints : points,
      },
      waypoints : points,
    }
  }

  var exporter = function(turnpoints, taskInfo, noFile) {
    noFile = noFile || false;

    var bb =  taskInfo.bbox;
    
    var geo = {
      type : 'Feature',
      bbox : [bb.getSouthWest().lng(), bb.getSouthWest().lat(), bb.getNorthEast().lng(), bb.getNorthEast().lat()],
      geometry : {
        type : "MultiPoint",
        coordinates : [],
      },
      properties : {}
    };

    geo.geometry.coordinates = turnpoints.map(function(elem){ 
      return [elem.y, elem.x];
    });

    geo.properties.date = taskInfo.date;
    geo.properties.style = taskInfo.style;
    geo.properties.turnpoints = turnpoints.map(function(elem){ 
      return {
        close : elem.close,
        finish : elem.finish,
        id : elem.wp.id,
        direction : elem.direction,
        description : elem.description.name,
        open : elem.open,
        radius : elem.radius,
        role : elem.role,
        altitude : elem.altitude,
      }
    });
    
    if (noFile === true) { return geo; }
    return new Blob([JSON.stringify(geo)], {'type': "application/json"});
  }

	let extension = '.geojson';
	let name = 'geoJson';

  export {
    check,
    exporter,
    extension,
    name,
    parse,
  }
