/**
 * @file
 * Progress handler.
 */
Template.progress.helpers({
	'isShown' : function() {
		var T = Template.instance();
		return T.isShown.get();
	},
	'getType' : function() {
		var T = Template.instance();
		return T.type.get();
	},
	'getPercent' : function() {
		var T = Template.instance();
		return T.percent.get();
	},
	'background' : function() {
		var T = Template.instance();
		return (T.percent.get() ==  100) ? 'bg-success' : 'bg-warning';
	},
	'getStageName' : function() {
		var T = Template.instance();
		if (T.type.get() !== 'crawler' && T.stage[T.type.get()]) {
			return T.stage[T.type.get()][T.index.get()]
		}
	},
	'getStageIndex' : function() {
		var T = Template.instance();
		if (T.type.get() !== 'crawler' && T.stage[T.type.get()]) {
			return parseInt(T.index.get() + 1) + '/' + T.stage[T.type.get()].length
		}	
	},
});

Template.progress.onCreated(function onProgressCreated() {	
	// Storing process Id for watching progress.
	// UID wasn't enough because a user can open multiple window and start mutliple process. Progress were messy then.
	Session.set('processId', new Mongo.ObjectID());
	
	var uid = Meteor.userId();
	var processId = Session.get('processId')
	this.type = new ReactiveVar();
	this.percent = new ReactiveVar();
	this.isShown =  new ReactiveVar(false);

	this.stage = {
		replay : ['Downloading Tracks', 'Reading Tracks', 'Streaming large data', 'Inserting to database'],
		race : ['Validating tracks'],
		watch : ['one', 'two']
	};

	this.index = new ReactiveVar(0);
	var threshold = false;
	var tmp = this;
	
	this.autorun(function() {
		var doc = Progress.findOne({uid : uid, pid : processId});
		if (doc) {
			tmp.isShown.set(true);
			tmp.type.set(doc.type);
			var percent = sanitizeProgress(doc.progress);
			
			tmp.percent.set(percent);
			$('.progress-bar').attr('style', 'width:' + percent + '%');
			if (percent < 5 )  {
				tmp.threshold = true;
			}
			if (percent == 100 && tmp.threshold) {
				tmp.index.set(tmp.index.get() + 1);
				tmp.threshold = false;
			}
		}
		else {
			tmp.isShown.set(false);
			tmp.index.set(0);
			tmp.threshold = false;
		}
	});
});

function sanitizeProgress(string) {
	var percent = parseInt(string.substring(0, string.indexOf('%')));
	if (isNaN(percent)) {
		percent = 0;
	}
	// Return Progress to be displayed.
	return percent;
};
