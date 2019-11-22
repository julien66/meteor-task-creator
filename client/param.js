/**
 * @file
 * Param module for the task creator.
 */
  var date = new Date();
  var day = date.getUTCDate();
  var turn = (day % 2 == 0) ? 'right' : 'left';

  let param = {
    allowCumulativeFiles : true,
    map : {
      startLat : 42.514,
      startLon : 2.040,
    },
    task : {
      allowed : {
        number : [1, 2, 3, 4, 5, 6, 7, 8 , 9, 10, 11, 12, 13, 14, 15],
        style : ['RACE', 'ELASPSED'],
        turn : ['LEFT', 'RIGHT'],
      },
      courseColor : {
        fast : '#204d74',
      },
      default : {
        date : day + '-' + date.getUTCMonth() + '-' + date.getUTCFullYear(),
        number : 0,
        style : 'RACE',
        turn : turn,
        distance : 0,
        bbox : false,
      }
    },
    turnpoint : {
      allowed : {
        role : ['TAKEOFF', 'START', 'TURNPOINT', 'ESS', 'GOAL'],
        finish : ['LINE', 'CYLINDER'],
        direction : ['ENTER', 'EXIT'],
      },
      default : {
        close : 0,
        finish : 'LINE',
        direction : 'ENTER',
        open : 0,
        radius : 400,
        type : 'TAKEOFF',
      },
      icon : {
        takeoff : 'plane',
        start : 'play',
        turnpoint : 'forward',
        ess : 'stop',
        goal : 'thumbs-up',
      },
      shortName : {
        takeoff : 'to',
        start : 'sss',
        turnpoint : 'tp',
        ess : 'ess',
        goal : 'goal',
      },
      dependencies : {
        show : {
          takeoff : ['close', 'direction', 'open', 'radius'],
          start : ['direction', 'open', 'radius'],
          turnpoint : ['direction', 'radius'],
          ess : ['close', 'direction', 'radius'],
          goal : ['close', 'finish', 'radius'],
          line : ['close'],
          cylinder : ['close', 'radius'],
        },
        hide : {
          takeoff : ['finish'],
          start : ['close', 'finish'],
          turnpoint : ['close', 'finish', 'open'],
          ess : ['open', 'finish'],
          goal : ['direction', 'open'],
          line : ['direction', 'open', 'radius'],
          cylinder : ['direction', 'open'],
        }
      },
      strokeColor : {
        takeoff : '#204d74',
        start : '#ac2925',
        turnpoint : '#269abc',
        ess : '#ac2925',
        goal : '#398439',
      },
      fillColor : {
        takeoff : '#204d74',
        start : '#ac2925',
        turnpoint : '#269abc',
        ess : '#ac2925',
        goal : '#398439',
      },
    },
  };

	export {param};
