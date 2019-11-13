/**
  @file
  JS Player for Task Creator.
*/
SnapRace = new Mongo.Collection('snapRace');

Template.player.helpers({
	pilots : function() {
		var T = Template.instance();
		return 	T.pilots.get();
	}
});

Template.player.onCreated (function onPlayerCreated() {
	var T = Template.instance();
	this.buffer = [];
	this.pilots = new ReactiveVar([]);
	this.play = false;
	this.delay = new ReactiveVar(10);
	this.playInterval;

  	// Store the current raceTime as a reactive variable
  	this.raceTime = new ReactiveVar(24*3600);
  	this.reqTime = new ReactiveVar(new Date('1970-01-01T00:00:00'));
		
	// this will rerun whenever raceTime or raceInfos changes
  	this.autorun(function() {
    		// Subscribe for the current raceTime (only if one is selected). Note this
    		// will automatically clean up any previously subscribed data and it will
    		// also stop all subscriptions when this template is destroyed.
		var infos = Session.get('raceInfos')
		console.log('rebuild');
      		if (infos && T.reqTime.get()) {
			T.subscribe('SnapRace', infos.id, infos.task, T.reqTime.get());
  		}
	});

	// Observing RaceEvents as they flow from dynamic subscription.
	SnapRace.find().observe({
		'added' : function(snap) {
			console.log(snap);
			var hh = snap.time.toTimeString().split(' ')[0];
			var seconds = parseInt(hh.split(':')[0] * 3600) + parseInt(hh.split(':')[1] * 60) + parseInt(hh.split(':')[2]); 
			//console.log(hh, seconds);
			T.buffer[seconds] = {snap : snap.snapshot, hh : hh};
			if (T.raceTime.get() > seconds) {
				T.raceTime.set(seconds);
			}
			var ids = Object.keys(snap.snapshot);
			var current = T.pilots.get();
			T.pilots.set(current.concat(ids.filter((item) => current.indexOf(item) < 0)));
			var event = new CustomEvent('newPilots', { 'detail': ids });
			window.dispatchEvent(event);
		},
	});
});

Template.player.events({
	'click #play' : function(e) {
		var T = Template.instance();
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
				T.raceTime.set(currentTime + 1);
				if (T.buffer.length - currentTime < 20) {
					T.reqTime.set(new Date('1970-01-01T'+ T.buffer[T.buffer.length-1].hh));
				}
			}, T.delay.get());
		}
	},
	'click #pause' : function(e) {
		console.log('stop');
		var T = Template.instance();
		if (T.play === true) {
			clearInterval(T.playInterval);
			T.play = false;
		}
	},
});
