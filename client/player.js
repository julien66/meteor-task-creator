/**
  @file
  JS Player for Task Creator.
*/
import * as Helper from './imports/helper';
SnapRace = new Mongo.Collection('snapRace');

Template.player.helpers({
	pilots : function() {
		var T = Template.instance();
		var pilots = T.pilots.get();
		var ranking = T.ranking;
		if (ranking.length > 0) {
			// return a mapped object to Blaze. With every pilot id, name, distance, time.
			return pilots.map(function(uid) {
				return T.ranking[uid];
			});
		}
		else {
			// If ranking is still not there...
			// Well just build a fake object full of uid.
			return pilots.map(function(uid) {
				return { id : uid, name : uid};
			});
		}
	},
	playable : function() {
		var T = Template.instance();
		return T.buffer.length > 0;
	},
	getSpeed : function() {
		var T = Template.instance();
		return T.speed.get(); 
	},
	getCurrentTime : function() {
		var T = Template.instance();
		return Helper.secondsToHH(T.raceTime.get());
	},
	getOpen : function() {
		var T = Template.instance();
		var times = T.times.get();
		if(times.length > 0) {
			return times[0].seconds
		}
		return 0;
	},
	getClose : function() {
		var T = Template.instance();
		var times = T.times.get();
		if(times.length > 0) {
			return times[2].seconds;
		}
		return 24*3600;
	},
	getCurrentSeconds : function() {
		var T = Template.instance();
		return T.raceTime.get();
	},
	timeMark : function() {
		var T = Template.instance();
		return T.times.get();
	},
	showPlayer : function() {
		var T = Template.instance();
		return T.pilots.get().length > 0;	
	},
	showRaceProgress : function() {
		var T = Template.instance();
		return T.init;
	},
	isProgress : function() {
		var T = Template.instance();
		return T.raceIndex.get() < 1;
	},
	getProgress : function() {
		var T = Template.instance();
		var uid = Meteor.userId();
		var query = Progress.findOne({uid : uid, pid : Session.get('processId'), type : "race"}, {sort : {created : -1}});
		if (query) {
			// Return Progress to be displayed.
			var percent = parseInt(query.progress.substring(0, query.progress.indexOf('%')));
			if (isNaN(percent)) {
				percent = 0;
			}
			if (percent < 5 )  {
				T.percentThreshold = true;
			}
			if (percent == 100 && T.percentThreshold) {
				T.raceIndex.set(T.raceIndex.get() + 1);
				T.percentThreshold = false;
			}
			return percent + ' %';
		};
	},
	getStage : function() {
		var T = Template.instance();
		return T.raceStatus[T.raceIndex.get()];
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
	this.raceTime = new ReactiveVar(0);
  	this.reqTime = new ReactiveVar(new Date('1970-01-01T00:00:00'));
	this.times = new ReactiveVar([]);
	this.init = true;
	this.performance = false;

	this.percentThreshold = false;
	this.raceIndex = new ReactiveVar(0);
	this.raceStatus = ['Validating Tracks', 'Updating database'];
	
	// this will rerun whenever raceTime or raceInfos changes
  	this.autorun(function() {
    		// Subscribe for the current raceTime (only if one is selected). Note this
    		// will automatically clean up any previously subscribed data and it will
    		// also stop all subscriptions when this template is destroyed.
		var infos = Session.get('raceInfos');
      		if (infos && T.reqTime.get()) {
			//console.log('sub', infos.id, infos.task, T.reqTime.get());
			T.subscribe('SnapRace', infos.id, infos.task, T.reqTime.get());
  		}
		// Getting mapping array to display proper names from uid.
		// Getting times from the task (timeline display)
		//@todo. It should display only once at init.
		if (infos && T.init) {
			var comp = RaceEvents.findOne({_id : infos.id});
			if (comp) {
				var task = comp.tasks[infos.task].task
				if (task) {
					//T.raceTime.set(Helper.HHtoSeconds(task.details.open));
					T.times.set([
						{
							key : 'open',
							hh : task.details.open , 
							seconds : Helper.HHtoSeconds(task.details.open), 
							percent : 0,
						},
						{
							key : 'start',
							hh : task.details.start , 
							seconds : Helper.HHtoSeconds(task.details.start), 
							percent : Math.round((Helper.HHtoSeconds(task.details.start) - Helper.HHtoSeconds(task.details.open)) * 100 / (Helper.HHtoSeconds(task.details.end) - Helper.HHtoSeconds(task.details.open))),
						},
						{
							key : 'end',
							hh : task.details.end, 
							seconds : Helper.HHtoSeconds(task.details.end),
							percent : 100
						}
					]);
				}
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
					// All data collected for this race, No need to execute this block anymore.
					T.init = false;		
				}
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
			console.log(snap);
			var hh = snap.time.toTimeString().split(' ')[0];
			var seconds = Helper.HHtoSeconds(hh);
			T.buffer[seconds] = {snap : snap.snapshot, hh : hh};
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



// Helper function at play.
var play = function (T) {
	if (T.play === false) {
		T.play = true;
		T.playInterval = setInterval(function() {
			//var perf = performance.now();
			var currentTime = T.raceTime.get();
			// If performance is currently good enough, send current buffer to map.)
			// Else Map will just skip this snapshot and take next one as time stil flows. 
			//if (T.buffer && Math.round(perf - T.performance) < T.delay.get() * 1.10) {
				// We need to send only alternated part of this big buffer.	
			if (!T.buffer[currentTime]) {
				T.reqTime.set(new Date('1970-01-01T'+ Helper.secondsToHH(currentTime)));
			}
			else {
				var event = new CustomEvent('movePilots', { 'detail': T.buffer[currentTime]});
				window.dispatchEvent(event);
				delete T.buffer[currentTime];
				if (T.buffer.length - currentTime < 5) {
					T.reqTime.set(new Date('1970-01-01T'+ T.buffer[T.buffer.length - 1].hh));
				}
			}
			//}
			T.raceTime.set(currentTime + 1);
			//T.performance = perf;
		}, T.delay.get());
	}
}

// Helper function to speed.
// Clear speed interval and reset play as it changes.
var setSpeed = function(T, speed) {
	// If speed is not there...
	// Just add one.i
	console.log(speed);
	if (!speed) {
		var speed = T.speed.get();
		T.speed.set(parseInt(speed) + 1);
	}
	else {
		T.speed.set(speed);
	}

	if (T.speed.get() > 20) {
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
		setSpeed(T);
	},
	'change .speedSlider' : function(e) {
		var T = Template.instance();
		setSpeed(T, parseInt($(e.target).val()));
	},
	'mousedown #speed' : function(e) {
		var T = Template.instance();
		var time = 0;
		T.pressInterval = setInterval(function() {
			time += 100;
			if (time > 100) {
				setSpeed(T);
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
	'change #replaySlide' : function(e) {
		var T = Template.instance();
		timeMoved(T, parseInt($(e.target).val()));
	},
	'click #close' : function(e) {
		$('#timeline').toggle();
		$('#timeMark').toggle();
		$('#pilotList').toggle();
		$('#raceAlert').toggle();
	},
	'click .pilot' : function() {
		var id = $('.pilot').attr('rel');
		var infos = Sessions.get('raceInfos');
		Mateor.call('test.watch', id, infos.id, infos.task, Session.get('progressId'));
	},
});

var timeMoved = function(T, now) {
	// Empty buffer...	
	T.buffer = [];
	// Set times accordingly.
	T.raceTime.set(now);
} 
