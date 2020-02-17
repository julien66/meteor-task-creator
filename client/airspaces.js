/**
 * @file
 * JS Airspaces
 */
Template.airspaces.helpers({	
	airspaces : function() {
		return Airspaces.find().fetch();
	},
	classes : function() {
		var allClasses = _.uniq(Airspaces.find({}, {sort: {class: 1}, fields: {class: true}}).fetch().map(function(x) {
    			return x.class;
		}), true);
		return allClasses;
	},
	validAirspaces : function() {
		var T = Template.instance();
		return Airspaces.find({$and : [{'toHide' : {$not : true}}, {'floor.internalValue' : {$lte : T.showFloor.get()}}]}).fetch();
	},
});

Template.airspaces.onCreated( function onAirspacesCreated() {
	this.showFloor = new ReactiveVar(1000);
	this.showClass = new ReactiveVar();
});

Template.airspaces.onRendered( function onAirspaceRendered() {
	$('.presetFiles').hide();
});

function toggleAirspace(T) {
	Airspaces.update({$or : [{'class' : {$nin : T.showClass.get()}} , {'floor.internalValue' : {$gt : T.showFloor.get()}}]}, {$set : {toHide : true}}, {multi : true});
	Airspaces.update({$and : [{'class' : {$in : T.showClass.get()}}, {'floor.internalValue' : {$lte : T.showFloor.get()}}]}, {$set : {toHide : false}}, {multi : true});
}

Template.airspaces.events({
	'change #altitudeSlide' : function(e) {
		var T = Template.instance();
		var value = parseInt($(e.target).val());
		$('#altitudeLimit').html(value);
		T.showFloor.set(value);
		toggleAirspace(T);
	},
	'change input[type="checkbox"]' : function(e) {
		var T = Template.instance();
		var selected = [];
		$('#airClass input:checked').each(function() {
    			selected.push($(this).attr('name'));
		});
		T.showClass.set(selected);
		toggleAirspace(T);
	},
	'click #presetAirspace h5' : function(e) {
		$('.presetFiles').toggle();
	}
})
