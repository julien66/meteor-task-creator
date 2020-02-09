/**
 * @file
 * JS Airspaces
 */
Template.airspaces.helpers({	
	airspaces : function() {
		return Airspaces.find().fetch();
	},
	validAirspaces : function() {
		var T = Template.instance();
		console.log(T.showFloor.get());
		return Airspaces.find({'floor.internalValue' : {$lte : T.showFloor.get()}}).fetch();
	}
});

Template.airspaces.onCreated( function onAirspacesCreated() {
	this.showClass = new ReactiveVar(['A', 'B', 'C', 'D']);
	this.showFloor = new ReactiveVar(0);
});

Template.airspaces.events({
	'change #altitudeSlide' : function(e) {
		var T = Template.instance();
		T.showFloor.set(parseInt($(e.target).val()));
	},
})
