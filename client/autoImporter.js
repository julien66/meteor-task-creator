/**
 * @file
 * JS autoImporter
 */
import * as Parameters from './param.js';
import { ReactiveVar } from 'meteor/reactive-var'
import * as parser from './imports/parser';

importedTasks = new Mongo.Collection('importedTasks', {connection: null});

// Main query. Find Actual request returned by IGCLIB.
var importQuery = function(provider, year) {
	return importedTasks.findOne({provider : provider, year : year});
}

Template.autoImporter.helpers({
	//@todo Format proper Parameters for every provider with allowed years.
	getProvider : function() {
		return ['PWCA', 'FFVL'];
	},
	getYears : function() {
		return ['2019', '2018','2017','2016','2015'];
	},
	getCompetition : function() {
		var T = Template.instance();
		if (T.gotImport.get() === true) {
			var query = importQuery(T.provider, T.year);
			if (query.comps) {
				var events = Object.keys(query.comps);
				T.gotComp.set(events[0]);
				return events;
			}
		}
		else{
			return ['Select a provider and a year first']
		}
	},
	getTask : function() {
		var T = Template.instance();
		var gotComp = T.gotComp.get();
		if (gotComp) {
			var query = importQuery(T.provider, T.year);
			if (query.comps) {
				var events = Object.keys(query.comps);
				var taskNum = query.comps[gotComp].length;
				var choices = [];
				for (var i = 1; i < taskNum + 1; i++) {
					choices.push(i);
				}
				T.taskNum.set(1);
				return choices;
			}
		}
		else {
			return ['Select a competition first'];
		}
	},
});

Template.autoImporter.onCreated(function autoImporterOnCreated() {
	this.year = null;
	this.provider = null;
	this.gotImport = new ReactiveVar(false);
	this.gotComp = new ReactiveVar(false);
	this.taskNum = new ReactiveVar(false);
});

Template.autoImporter.events({
	'click .fa-expand' : function(e) {
		$('.form-group').toggle();
		$('#stage2').hide();
		$('#stage1 .fa-cog').hide();
	},
	'click button#importBack' : function(e, template) {
		$('#stage2').hide();	
		$('#stage1').show();
	},
	'click button#requestTask' : function(e, template) {
		$('#stage1 .fa-cog').show();
		var provider = $('#provider').val();
		var year = $('#year').val();
		var T = Template.instance();
		T.provider = provider;
		T.year = year;
		Meteor.call('task.request', provider, year, function(err, res) {
			$('#stage1 .fa-cog').hide();
			if (!err) {
				var data = JSON.parse(res.stdout);
				importedTasks.insert({
					provider : provider,
					year : year,
					comps : data,
				});
				T.gotImport.set(true);
				$('#stage1').hide();
				$('#stage2').show();
			}
		});
	},
	'change #comp' : function(e) {
		var T = Template.instance();
		T.gotComp.set($(e.target).val());
	},
	'change #task' : function(e) {
		var T = Template.instance();
		T.taskNum.set($(e.target).val());
	},
	'click button#importTask' : function(e, template) {
		var T = Template.instance();
		console.log(T);
		parseTask(T.provider, T.year, T.gotComp.get(), T.taskNum.get());
	}
});

var parseTask = function(provider, year, gotComp, taskNum) {
	console.log(provider, year, gotComp, taskNum);
	var query = importQuery(provider, year);
	if (query.comps) {
		var task = query.comps[gotComp][taskNum];
		task[provider] = true;
		parser.parse(task, null);
	}
}
