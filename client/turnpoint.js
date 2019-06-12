/**
 * @file
 * Turnpoint JS for the task-creator.
 **/
Template.turnpoint.helpers({
	notNew : function() {
		return Template.instance().data;
	},
	sel : function(key, value) {
		var data = Template.instance().data;
		if (data && data[key] == value) {
			return 'selected';
		}
	},
	default : function(key, value) {
		var data = Template.instance().data;
		if (data && data[key]) {
			return data[key];
		}
		return value;
	},
});

Template.turnpoint.onDestroyed(function onTurnpointDestroyed() {
	Session.set('tempTurnpoint', null);
});

Template.turnpoint.events({
	'change select' : function(e) {
		var toShow = $('option:selected', e.target).attr('data-show');
		if (toShow) {
			toShow = toShow.split(',');
			for (var i = 0; i < toShow.length; i++) {
				$('#tp-' + toShow[i]).removeClass('hidden');
			}
		}
		var toHide = $('option:selected', e.target).attr('data-hide');
		if (toHide) {
			toHide = toHide.split(',');
			for (var i = 0; i < toHide.length; i++) {
				$('#tp-' + toHide[i]).addClass('hidden');
			}
		}
	},
	'submit form' : function(e) {
		e.preventDefault();
		var data = Template.instance().data;
		var turnpoint = {
			'close' : (e.target.close) ? e.target.close.value : null,
			'goal-type' : (e.target['goal-type']) ? e.target['goal-type'].value : null, 
			'mode' : (e.target.mode) ? e.target.mode.value : null,
			'open' :  (e.target.open) ? e.target.open.value : null,
			'radius' : (e.target.radius) ? parseInt(e.target.radius.value) : null,
			'type' : e.target.type.value,
		};
	
		// If there is already data then it's an update.
		if (data && data._id) {
			// passing reference of the waypoint on the turnpoint object
			turnpoint.wp = data.wp;
			// passing id as reference on the turnpoint object.
			turnpoint._id = data._id;
			// Updating turnpoints array in task first
			Task.update({'turnpoints._id' : data._id}, {'$set' : {'turnpoints.$' : turnpoint}});
			// Updating the turnpoint itself then.
			Turnpoints.update({_id : data._id}, turnpoint);
		}
		else { // Without data it is an insert.
			// Grabbing temporary waypoint and passing reference.
			var waypoint = Session.get('tempTurnpoint');
			turnpoint.wp = waypoint;
			// Inserting turnpoint.
			var tpId = Turnpoints.insert(turnpoint);	
			var tp = Turnpoints.findOne({_id : tpId});
			// Updating task and pushing the actual turnpoint.
			Task.update({}, {'$push' : {turnpoints : tp}});
		}
		Modal.hide(Template.instance());
	},
	'click button[data-action="turnpoint/remove"]' : function(e) {
		e.preventDefault();
		var id = Template.instance().data._id;
		Turnpoints.remove({_id : id});
		Task.update({}, {'$pull' : {turnpoints : {_id : id}}});
		Modal.hide(Template.instance());
	},
});
