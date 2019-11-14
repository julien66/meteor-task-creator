/**
  @file
  JS Player for Task Creator.
*/
SnapRace = new Mongo.Collection('snapRace');

Template.player.helpers({
	pilots : function() {
		var T = Template.instance();
		var pilots = T.pilots.get();
		var mapping = T.mapping;
		// return a mapped object to Blaze. With uid and name.
		return pilots.map(function(elt) {
			return {
				uid : elt,
				name : mapping[elt],
		}});
	},
	playable : function() {
		var T = Template.instance();
		return T.buffer.length;
	},
	getSpeed : function() {
		var T = Template.instance();
		return T.speed.get() + 'x'; 
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
	// UID <-> pilot name mapping
	this.mapping = [];
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
				T.mapping = task.mapping;
				console.log(task);
				console.log(HHtoSeconds(task.details.open));
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
			var event = new CustomEvent('newPilots', {'detail': {ids : ids, mapping : T.mapping}});
			window.dispatchEvent(event);
		},
	});
});

// Helper function to convert HH:mm:ss or HH:mm into seconds.
var HHtoSeconds = function(hh) {
	var mult = [3600, 60, 1];
	var array = hh.split(':');
	return array.map(function(elt, index){ return elt * mult[index]}).reduce(function(b, a){ return b + a;});
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


Template.player.events({
	'click #play' : function(e) {
		var T = Template.instance();
		play(T)
	},
	'click #pause' : function(e) {
		var T = Template.instance();
		if (T.play === true) {
			clearInterval(T.playInterval);
			T.play = false;
		}
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
	'mouseup #innerTime' : function(e) {
		var T = Template.instance();
		T.grabCursor = false;
	},
	'mousemove #innerTime' : function(e) {
		var T = Template.instance();
		if (T.grabCursor === true) {
			// @todo move cursor and set time.
			timeMoved(T, e);
		}
	},
	'mouseleave #innerTime' : function(e) {
		var T = Template.instance();
		T.grabCursor = false;
	},
});

var timeMoved = function(T, e) {
	var width = $('#innerTime').width();
	var position = e.clientX * 100 / width;
	console.log(position);
	$('#cursorNow').css({left : Math.min(position, 100) + '%'});
} 
