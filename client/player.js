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
		var ranking = T.ranking.get();
		if (ranking.length > 0) {
			return ranking;
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
	onPlay : function() {
		var T = Template.instance();
		return T.play.get();
	},
	isAnalysis : function() {
		var T = Template.instance();
		var infos = Session.get('raceInfos');
		var race = RaceEvents.findOne({'_id' : infos.id});
		if (race) {
			var task = race.tasks[infos.task]
			if (task.watch && task.watch[Session.get('requestAnalysis')]) {
				return true;
			}	
		}
		return false;
	},
	timeOrDistance : function(id) {
		var T = Template.instance();
		var ranking = T.ranking.get();
		var pilot = ranking.find(function(elt) {return elt.id == id});
		return (pilot.time) ? pilot.time : Math.round(pilot.distance) + 'm';
	},
	magnet : function() {
		var T = Template.instance();
		var ranking = T.ranking.get();
		var magnet = Session.get('magnet');
		if (magnet) {
			var pilot = ranking.find(function(elt) {return elt.id == magnet});
			return pilot;
		}
		return false;
	}
});

Template.player.onCreated (function onPlayerCreated() {
	var T = Template.instance();
	this.buffer = [];
	// UID Array of pilot.
	this.pilots = new ReactiveVar([]);
	// UID <-> pilot name mapping come from ranking
	this.ranking = new ReactiveVar([]);
	this.play = new ReactiveVar(false);
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
	this.onRequest = false;
	this.sliderDelay = 0;

	this.percentThreshold = false;
	this.raceIndex = new ReactiveVar(0);
	this.raceStatus = ['Validating Tracks', 'Updating database'];
	Session.set('requestAnalysis', false);
	Session.set('magnet');

	$(document).on("click", ".findMap", function(e) {
    		var id = $(e.target).attr('id');
		var event = new CustomEvent('centerPilot', {'detail': {id : id}});
		window.dispatchEvent(event);
	});
	$(document).on("click", ".magnetMap", function(e) {
    		var id = $(e.target).attr('id');
		var magnet = Session.get('magnet');
		Session.set('magnet', (magnet == id) ? false : id);
	});
	var tmp = this;
	$(document).on("click", ".watch", function(e) {
		var id = $(e.target).attr('id');
		var infos = Session.get('raceInfos');
		Session.set('requestAnalysis', parseInt(id));
		Meteor.call('task.watch', id, infos.id, infos.task, Session.get('processId'));	
	});
	// this will rerun whenever raceTime or raceInfos changes
  	this.autorun(function() {
    		// Subscribe for the current raceTime (only if one is selected). Note this
    		// will automatically clean up any previously subscribed data and it will
    		// also stop all subscriptions when this template is destroyed.
		var infos = Session.get('raceInfos');
      		if (infos && T.reqTime.get()) {
			console.log('sub', infos.id, infos.task, T.reqTime.get());
			var limit = (T.play.get()) ? null : 1;
			T.subscribe('SnapRace', infos.id, infos.task, T.reqTime.get(), limit);
  		}
		// Getting mapping array to display proper names from uid.
		// Getting times from the task (timeline display)
		//@todo. It should display only once at init.
		if (infos && T.init) {
			var comp = RaceEvents.findOne({_id : infos.id});
			if (comp) {
				var task = comp.tasks[infos.task].task
				if (task) {
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
				if (task && task.ranking && task.ranking.pilots) {
					var pilots = [];
					Object.keys(task.ranking.pilots).forEach(function(uid) {
						var pilot = task.ranking.pilots[uid];
						// add random color for each pilot.
						pilot.color = '#'+((1<<24)*(Math.random()+1)|0).toString(16).substr(1);
						// Storing a friendly array with id key [id : {}, id {}] ; 
						pilots[pilot['id']] = pilot;
					});
					// All data collected for this race, No need to execute this block anymore.
					if (task.raced) {
						var keys = Object.keys(pilots);
    						var sort = keys.sort(function(a,b) {
							return ((Helper.HHtoSeconds(pilots[a].time) - Helper.HHtoSeconds(pilots[b].time)) || (pilots[b].distance - pilots[a].distance));
						});
						T.ranking.set(sort.map(function(elt) {
							return pilots[elt];
						}));
						T.init = false;
					}
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
				var task = Task.findOne({_id : Session.get('taskId')});
				T.raceTime.set(Helper.HHtoSeconds(task.open)) ;
				Session.set('importTrack', false);
			}
			//console.log(snap);
			var hh = snap.time.toTimeString().split(' ')[0];
			var seconds = Helper.HHtoSeconds(hh);
			T.buffer[seconds] = {snap : snap.snapshot, hh : hh};
			var ids = Object.keys(snap.snapshot);
			var current = T.pilots.get();
			T.pilots.set(current.concat(ids.filter((item) => current.indexOf(item) < 0)));
			var event = new CustomEvent('newPilots', {'detail': {ids : ids, ranking : T.ranking.get()}});
			window.dispatchEvent(event);
			if (!T.play.get()) {
				console.log('toMove');
				var event = new CustomEvent('movePilots', { 'detail': T.buffer[seconds]});
				window.dispatchEvent(event);
				delete T.buffer[seconds];	
			}
			T.onRequest = false;
		},
	});
});

// Helper function at play.
var play = function (T) {
	if (T.play.get() === false) {
		T.play.set(true);
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
				if (T.buffer.length - currentTime < 5) {
					T.onRequest = true;
					T.reqTime.set(new Date('1970-01-01T'+ T.buffer[T.buffer.length - 1].hh));
				}
				delete T.buffer[currentTime];
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
	if (!speed) {
		var speed = T.speed.get();
		T.speed.set(parseInt(speed) + 1);
	}
	else {
		T.speed.set(speed);
	}

	if (T.speed.get() > 50) {
		T.speed.set(1);
	}

	T.delay.set(Math.round(1000/speed));
	if (T.play.get() === true) {
		clearInterval(T.playInterval);
		T.play.set(false);
		play(T);
	}
}

// Helper function to stop the race
var stop = function(T) {
	if (T.play.get() === true) {
		clearInterval(T.playInterval);
		T.play.set(false);
	}
}

Template.player.events({
	'click #play' : function(e) {
		$('#pause').show();
		$('#play').hide();
		var T = Template.instance();
		play(T)
	},
	'click #pause' : function(e) {
		$('#pause').hide();
		$('#play').show();
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
	'input #replaySlide' : function(e) {
		var T = Template.instance();
		stop(T);
		T.sliderDelay += 1;
		if (T.sliderDelay > 10) {
			T.sliderDelay = 0;
			timeMoved(T, parseInt($(e.target).val()));
		}
	},
	'change #replaySlide' : function(e) {
		var T = Template.instance();
		timeMoved(T, parseInt($(e.target).val()));
	},
	'click #close' : function(e) {
		$('#timeMark').toggle();
		$('#tabContainer').toggle();
	},
	'click .pilot' : function(e) {
		var T = Template.instance();
		var id = $(e.target).attr('rel');
		var ranking = T.ranking.get(); 
		var pilot = ranking.find(function(elt) { return elt['id'] == id});
		// Get popover content.
		var content = Blaze.toHTMLWithData(Template.pilotPopover, pilot);
		// Setup popover and show.
		$(e.target).popover({trigger: 'focus', html : true, title : pilot.name, content : content}).popover('show');
	},
	'input #searchPilot' : function(e) {
		var T = Template.instance();
		var ranking = T.ranking.get();
		var names = ranking.reduce(function(acc, cur, i) {
  			acc[cur.name] = i;
  			return acc;
		}, {});	
		$('#inSearch').autocomplete({
			source : names,
			treshold : 3,
			onSelectItem : function(item) {
				var pilot = $('.pilot[index=' + item.value + ']');
				var currentPosition = $('#results').scrollLeft();
				$('#results').animate({
    					scrollLeft: currentPosition + pilot.offset().left,
				}, 1000);
				pilot.addClass('selected');
				setTimeout(function() {
					$('.pilot').removeClass('selected');
				}, 3000);
				$('#inSearch').val('');
				$('.dropdown-menu').hide();
			},
		});
	},
});

var timeMoved = function(T, now) {
	// Empty buffer...	
	T.buffer = [];
	// Set times accordingly.
	T.raceTime.set(now);
	//Subscribing.
	if (!T.onRequest) {
		T.reqTime.set(new Date('1970-01-01T'+ Helper.secondsToHH(now)));
		T.onRequest = true;
	}
} 
