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
	this.showClass = new ReactiveVar(['TMA', 'CTR', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'GP', 'P', 'R']);
	this.showFloor = new ReactiveVar(1000);
});

Template.airspaces.events({
	'change #altitudeSlide' : function(e) {
		var T = Template.instance();
		var value = parseInt($(e.target).val());
		$('#altitudeLimit').html(value);
		T.showFloor.set(value);
		Airspaces.update({'floor.internalValue' : {$gt : value}}, {$set : {toHide : true}}, {multi : true});
		Airspaces.update({'floor.internalValue' : {$lte : value}}, {$set : {toHide : false}}, {multi : true});
	},
	'change input[type="checkbox"]' : function(e) {
		var clas = $(e.target).attr("name");
		var checked = $(e.target).is(':checked');
		Airspaces.update({'class' : clas}, {$set : {toHide : !checked}}, {multi : true});
	} 
})
