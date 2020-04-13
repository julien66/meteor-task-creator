/**
 * @file
 * JS Airspaces
 */
import Parameters from './param';

Template.airspaces.helpers({	
	airspaces : function() {
		return Airspaces.find({}, {sort : {class : 1}}).fetch();
	},
	classColor : function(zoneClass) {
		return Parameters.param.airspaces.color[zoneClass] ? Parameters.param.airspaces.color[zoneClass] : "#f0ad4e";
	},
	classes : function() {
		// Request all kind of existing classes in DB.
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

// Updates are only done on local minimongo. Adding _collection does the magic.
// Nothing is pushed to the server. It will refuse it all anyway.
function toggleAirspace(T) {
	Airspaces._collection.update({$or : [{'class' : {$nin : T.showClass.get()}} , {'floor.internalValue' : {$gt : T.showFloor.get()}}]}, {$set : {toHide : true}}, {multi : true});
	Airspaces._collection.update({$and : [{'class' : {$in : T.showClass.get()}}, {'floor.internalValue' : {$lte : T.showFloor.get()}}]}, {$set : {toHide : false}}, {multi : true});
}

Template.airspaces.events({
	'change #altitudeSlide' : function(e) {
		var T = Template.instance();
		var value = parseInt($(e.target).val());
		$('#altitudeLimit').html(value);
		T.showFloor.set(value);
		toggleAirspace(T);
	},
	'change .filterAirspace input[type="checkbox"]' : function(e) {
		var T = Template.instance();
		var selected = [];
		$('#airClass input:checked').each(function() {
    			selected.push($(this).attr('name'));
		});
		T.showClass.set(selected);
		toggleAirspace(T);
	},
	'change .presetFiles input[type="checkbox"]' : function(e) {
		var T = Template.instance();
		var file = $(e.target).attr('name');
		if($(e.target).is(":checked")) {
			T.subscribe('airspaces');
			return;
		}
	},
	'click #presetAirspace h5' : function(e) {
		$('.presetFiles').toggle();
	}
})
