/**
 * @file
 * JS Airspaces
 */
import Parameters from './param';
import * as Helper from "./imports/helper";

Template.airspaces.helpers({	
	airspaces : function() {
		var T = Template.instance();
		var airspaces = Airspaces.find({}, {sort : {class : 1}}).fetch();
		var names = airspaces.reduce(function(acc, cur, i) {
			acc[cur.name] = i;
			return acc;
		}, {});
		T.nameIndex.set(names);
		return airspaces;
	},
	classColor : function(zoneClass) {
		return Parameters.param.airspaces.color[zoneClass] ? Parameters.param.airspaces.color[zoneClass] : "#f0ad4e";
	},
	classes : function() {
		var T = Template.instance();
		// Request all kind of existing classes in DB.
		var allClasses = _.uniq(Airspaces.find({}, {sort: {class: 1}, fields: {class: true}}).fetch().map(function(x) {
    			return x.class;
		}), true);
		T.showClass.set(allClasses);
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
	this.nameIndex = new ReactiveVar();
});

Template.airspaces.onRendered( function onAirspaceRendered() {
});

// Updates are only done on local minimongo. Adding _collection does the magic.
// Nothing is pushed to the server. It will refuse it all anyway.
function toggleAirspace(T) {
	Airspaces._collection.update({$or : [{'class' : {$nin : T.showClass.get()}} , {'floor.internalValue' : {$gt : T.showFloor.get()}}]}, {$set : {toHide : true}}, {multi : true});
	Airspaces._collection.update({$and : [{'class' : {$in : T.showClass.get()}}, {'floor.internalValue' : {$lte : T.showFloor.get()}}]}, {$set : {toHide : false}}, {multi : true});
}

Template.airspaces.events({
	'input #altitudeSlide' : function(e) {
		var T = Template.instance();
		var value = parseInt($(e.target).val());
		$('#altitudeLimit').html(value);
	},
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
	'click .listAirspace li' : function(e) {
		var id = $(e.target).attr('ref');
		if (!id) {
			id = $(e.target).parent().attr('ref');
		}
		console.log(id);
		var e = new CustomEvent('airspaceRequest', {'detail' : id});
		window.dispatchEvent(e);
	},
	'input #searchAirspace' : function(e) {
		var T = Template.instance();
		var names = T.nameIndex.get();
		$('#inSearch').autocomplete({
			source : names,
			treshold : 3,
			onSelectItem : function(item) {
				var airspace = $('.airspace[index=' + item.value + ']');
				var currentPosition = $('.listAirspace').scrollTop();
				$('.listAirspace').animate({
					scrollTop: airspace.offset().top,
				}, 1000);
				airspace.addClass('selected');
				setTimeout(function() {
					$('.airspace').removeClass('selected');
				}, 3000);
				$('#inSearch').val('');
				$('.dropdown-menu').hide();
			},
		});
	},
});