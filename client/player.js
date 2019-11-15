/**
  @file
  JS Player for Task Creator.
*/
SnapRace = new Mongo.Collection('snapRace');

Template.player.helpers({
	pilots : function() {
		var T = Template.instance();
		var pilots = T.pilots.get();
		var ranking = T.ranking;
		// return a mapped object to Blaze. With every pilot id, name, distance, time.
		return pilots.map(function(uid) {
			return T.ranking[uid];
		});
	},
	playable : function() {
		var T = Template.instance();
		return T.buffer.length > 0;
	},
	getSpeed : function() {
		var T = Template.instance();
		return T.speed.get() + 'x'; 
	},
	getCurrentTime : function() {
		var T = Template.instance();
		return secondsToHH(T.raceTime.get());
	},
	timeMark : function() {
		var T = Template.instance();
		return T.times.get();
	}
});

Template.player.onCreated (function onPlayerCreated() {
	var T = Template.instance();
	this.buffer = [];
	// UID Array of pilot.
	this.pilots = new ReactiveVar([]);
	// UID <-> pilot name mapping come from ranking
	this.ranking = [];
	this.play = false;
	this.delay = new ReactiveVar(1000);
	this.playInterval;
	this.pressInterval;
	this.grabCursor = false;
	this.speed = new ReactiveVar(1);
  	// Store the current raceTime as a reactive variable
  	this.raceTime = new ReactiveVar(24*3600);
  	this.reqTime = new ReactiveVar(new Date('1970-01-01T00:00:00'));
	this.times = new ReactiveVar([]);
	this.init = true;
		
	// this will rerun whenever raceTime or raceInfos changes
  	this.autorun(function() {
    		// Subscribe for the current raceTime (only if one is selected). Note this
    		// will automatically clean up any previously subscribed data and it will
    		// also stop all subscriptions when this template is destroyed.
		var infos = Session.get('raceInfos');
      		if (infos && T.reqTime.get()) {
			T.subscribe('SnapRace', infos.id, infos.task, T.reqTime.get());
  		}
		// Getting mapping array to display proper names from uid.
		// Getting times from the task (timeline display)
		//@todo. It should display only once at init.
		if (infos && T.init) {
			var comp = RaceEvents.findOne({_id : infos.id});
			if (comp) {
				var task = comp.tasks[infos.task].task
				console.log(task);
				//Iterate throught ranking to map uid -> name.
				if (task && task.ranking) {
					for (var i = 0; i < task.ranking.length; i++) {
						var elt = task.ranking[i];
						// add random color for each pilot.
						elt.color = '#'+((1<<24)*(Math.random()+1)|0).toString(16).substr(1);
						// add something darker to get contrast.
						elt.darkerColor = adjustColor(elt.color, -30);
						// Storing a friendly array with id key [id : {}, id {}] ; 
						T.ranking[elt['id']] = elt;
					};
					T.times.set([
						{
							key : 'open',
							hh : task.details.open , 
							seconds : HHtoSeconds(task.details.open), 
							percent : 0,
						},
						{
							key : 'start',
							hh : task.details.start , 
							seconds : HHtoSeconds(task.details.start), 
							percent : Math.round((HHtoSeconds(task.details.start) - HHtoSeconds(task.details.open)) * 100 / (HHtoSeconds(task.details.end) - HHtoSeconds(task.details.open))),
						},
						{
							key : 'end',
							hh : task.details.end, 
							seconds : HHtoSeconds(task.details.end),
							percent : 100
						}
					]);
				}
				// All data collected for this race, No need to execute this block anymore.
				T.init = false;		
			}
		}
	});

	// Observing RaceEvents as they flow from dynamic subscription.
	SnapRace.find().observe({
		'added' : function(snap) {
			// @todo
			// This is bad. Not a good place to set back this variable to false.
			if (Session.get('importTrack') == true) {
				Session.set('importTrack', false);
			}
			//console.log(snap);
			var hh = snap.time.toTimeString().split(' ')[0];
			var seconds = HHtoSeconds(hh);
			T.buffer[seconds] = {snap : snap.snapshot, hh : hh};
			if (T.raceTime.get() > seconds) {
				T.raceTime.set(seconds);
			}
			var ids = Object.keys(snap.snapshot);
			var current = T.pilots.get();
			T.pilots.set(current.concat(ids.filter((item) => current.indexOf(item) < 0)));
			var event = new CustomEvent('newPilots', {'detail': {ids : ids, ranking : T.ranking}});
			window.dispatchEvent(event);
		},
	});
});

var adjustColor = function adjust(color, amount) {
	return '#' + color.replace(/^#/, '').replace(/../g, color => ('0'+Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2));
}

// Helper function to convert HH:mm:ss or HH:mm into seconds.
var HHtoSeconds = function(hh) {
	var mult = [3600, 60, 1];
	var array = hh.split(':');
	return array.map(function(elt, index){ return elt * mult[index]}).reduce(function(b, a){ return b + a;});
}

// Helper function to convert seconds into HH:mm:ss.
var secondsToHH = function(seconds) {
	return new Date(seconds * 1000).toISOString().substr(11, 8);
}

// Helper function at play.
var play = function (T) {
	if (T.play === false) {
		T.play = true;
		T.playInterval = setInterval(function() {
			var currentTime = T.raceTime.get();
			// Send current buffer to map.)
			var event = new CustomEvent('movePilots', { 'detail': T.buffer[currentTime]});
			window.dispatchEvent(event);
			// Freeing Buffer ?
			delete T.buffer[currentTime];
			// Increment time by delay
			// @todo 20 is harde coded.
			// We need more test.
			T.raceTime.set(currentTime + 1);
			if (T.buffer.length - currentTime < 20) {
				if (T.buffer[T.buffer.length-1]) {
					T.reqTime.set(new Date('1970-01-01T'+ T.buffer[T.buffer.length-1].hh));
				}
			}
		}, T.delay.get());
	}
}

// Helper function to speed.
// Clear speed interval and reset play as it changes.
var addSpeed = function(T) {
	var speed = T.speed.get();
	T.speed.set(speed + 1);
	if (T.speed.get() > 50) {
		T.speed.set(1);
	}
	T.delay.set(Math.round(1000/speed));
	if (T.play === true) {
		clearInterval(T.playInterval);
		T.play = false;
		play(T);
	}
}

// Helper function to stop the race
var stop = function(T) {
	if (T.play === true) {
		clearInterval(T.playInterval);
		T.play = false;
	}
}

Template.player.events({
	'click #play' : function(e) {
		var T = Template.instance();
		play(T)
	},
	'click #pause' : function(e) {
		var T = Template.instance();
		stop(T);
	},
	'click #speed' : function(e) {
		var T = Template.instance();
		addSpeed(T);
	},
	'mousedown #speed' : function(e) {
		var T = Template.instance();
		var time = 0;
		T.pressInterval = setInterval(function() {
			time += 100;
			if (time > 300) {
				addSpeed(T);
			}
		}, 100);	
	},
	'mouseup #speed' : function(e) {
		var T = Template.instance();
		if (T.pressInterval) {
			clearInterval(T.pressInterval);
		}	
	},
	'mouseleave #speed' : function(e) {
		var T = Template.instance();
		if (T.pressInterval) {
			clearInterval(T.pressInterval);
		}
	},
	'mousedown #cursorNow' : function(e) {
		var T = Template.instance();
		T.grabCursor = true;
	},
	'click #innerTime' : function(e) {
		var T = Template.instance();
		timeMoved(T, e);
	},
	'mouseup #player' : function(e) {
		var T = Template.instance();
		T.grabCursor = false;
	},
	'mousemove #player' : function(e) {
		var T = Template.instance();
		if (T.grabCursor === true) {
			// @todo move cursor and set time.
			timeMoved(T, e);
		}
	},
	'mouseleave #player' : function(e) {
		var T = Template.instance();
		T.grabCursor = false;
	},
	'click #close' : function(e) {
		$('#timeline').toggle();
		$('#timeMark').toggle();
		$('#pilotList').toggle();
	}
});

var timeMoved = function(T, e) {
	// When timeline cursor is moved. Set new left %.
	var width = $('#innerTime').width();
	var position = e.clientX * 100 / width;
	// Get current position. See hack below.
	var currentPosition = $('#cursorNow').position();
	$('#cursorNow').css({left : Math.min(position, 100) + '%'});
	$('#currentTime').css({left : Math.min(position, 100) + '%'});
	// Now we want to stop the current race and set new times to play it again.
	stop(T);
	// Because of inconsistent time beetween task and tracks, only add or remove seconds relative to current time.
	// Otherwise, when all will be ok, we could go faster like :
	//var now = (e.clientX * (times[2].seconds - times[0].seconds) / width) + times[0].seconds;
	var times = T.times.get();
	// Get current time.
	var current = T.raceTime.get();
	// Calculate a second per pixel value. Given the actual scale of the race.
	var secPerPx = (times[2].seconds - times[0].seconds)/ width;
	// Get difference of position beetwen the event and the current cursor.
	var diffPosition = e.clientX - currentPosition.left;
	// Add or remove seconds to the current position.
	var now = (diffPosition * secPerPx) + current ;	

	// Empty buffer...	
	T.buffer = []
	// Set times accordingly.
	T.reqTime.set(new Date('1970-01-01T' + secondsToHH(now)));
	T.raceTime.set(now);
	play(T);
} 
