/**
 * @file
 * JS autoImporter
 */
import * as Parameters from './param.js';


Template.autoImporter.helpers({
	//@todo Format proper Parameters for every provider with allowed years.
	getProvider : function() {
		return ['PWCA', 'FFVL'];
	},
	getYears : function() {
		return ['2019', '2018'];
	},
});

Template.autoImporter.events({
	'click .fa-expand' : function(e) {
		$('.form-group').toggle();
	},
	'click button' : function(e) {
		var provider = $('#provider').val();
		var year = $('#year').val();
		console.log(provider, year);
		Meteor.call('task.request', provider, year);
	}
});
