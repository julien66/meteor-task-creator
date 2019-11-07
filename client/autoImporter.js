/**
 * @file
 * JS autoImporter
 */
import * as Parameters from './param.js';
import { ReactiveVar } from 'meteor/reactive-var'
import * as parser from './imports/parser';

ImportedTasks = new Mongo.Collection('importedTasks');
Progress = new Mongo.Collection('progress');

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
		var comps = T.importedTask.get();
		if (comps.data) {
			var events = Object.keys(comps.data);
			T.gotComp.set(events[0]);
			return events;
		}
		else{
			return ['Select a provider and a year first']
		}
	},
	getTask : function() {
		var T = Template.instance();
		var gotComp = T.gotComp.get();
		if (gotComp) {
			var comps = T.importedTask.get();
			if (comps.data) {
				var events = Object.keys(comps.data);
				var taskNum = comps.data[gotComp].length;
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
	getProgress : function() {
		var uid = Meteor.userId();
		var query = Progress.findOne({uid : uid, type : 'crawler'}, {sort : {created : -1}});
		if (query) {
			// Return Progress to be displayed.
			return Math.round(eval(query.progress)*100) + ' %';
		}; 
	},
	importable : function() {
		var T = Template.instance();
		var current = T.currentTaskParam.get();
		return (current.taskNum  !== T.taskNum.get()  || current.gotComp !== T.gotComp.get());
	
	},
	raceable : function() {
		var T = Template.instance();
		var current = T.currentTaskParam.get();
		return (current.taskNum  == T.taskNum.get()  && current.gotComp == T.gotComp.get());
	} 
});

Template.autoImporter.onCreated(function autoImporterOnCreated() {
	this.year = null;
	this.provider = null;
	this.gotComp = new ReactiveVar(false);
	this.taskNum = new ReactiveVar(false);
	this.importedTask = new ReactiveVar({});
	this.currentTaskParam = new ReactiveVar({});
	var T = this;
	ImportedTasks.find({uid : Meteor.userId()}).observe({
		added : function(task) {
			T.importedTask.set(task);
			$('#stage1 .fa-cog').hide();
			$('#stage1').hide();	
			$('#stage2').show();
		}
	});
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
		//var query = ImportedTask.findOne({provider : provider, year : year});
		Meteor.call('task.request', provider, year);
	},
	'click button#requestTrack' : function(e, template) {
		console.log('ok');
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
		var num = T.taskNum.get();
		var comp = T.gotComp.get();
		parseTask(T.provider, T.year, comp, num);
		T.currentTaskParam.set({taskNum : num, gotComp : comp});
	},
	'click button#importRace' : function(e, template) {
		Session.set('importTrack', true);
		var T = Template.instance();
		var comps = T.importedTask.get();
		var current = T.currentTaskParam.get();
		if (comps.data) {
			var task = comps.data[current.gotComp][current.taskNum - 1];
			Meteor.call('task.race', {task : btoa(JSON.stringify(task))}, function() {
				console.log('e');
			});
		}
	}
});

var parseTask = function(provider, year, gotComp, taskNum) {
	console.log(provider, year, gotComp, taskNum);
	var T = Template.instance();
	var comps = T.importedTask.get();
	if (comps.data) {
		var task = comps.data[gotComp][taskNum - 1];
		task[provider] = true;
		parser.parse(task, null);
	}
}
