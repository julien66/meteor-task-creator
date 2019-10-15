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

Template.turnpoint.onCreated(function onTurnpointCreated() {
	// Due to modal call from Waypoint.js there is no data at creation.
	// Only at update when user click on an existing turnpoint.
	// Turnpoints data are : altitude, close, description, direction, finish, lat, lon, name, open, radius, role, source as detailled here : https://gist.github.com/julien66/6c7934f1dd2f670f2c0ca0bed9dd64f5
	// Addition object are _id and wp // containing Object turnpoint and waypoint id. 
	var data = Template.instance().data;
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
			'finish' : (e.target.finish) ? e.target.finish.value : null, 
			'direction' : (e.target.direction) ? e.target.direction.value : null,
			'open' :  (e.target.open) ? e.target.open.value : null,
			'radius' : (e.target.radius) ? parseInt(e.target.radius.value) : null,
			'role' : e.target.role.value,
		};
		// If there is already data then it's an update.
		if (data && data._id) {
			turnpoint = Object.assign(data, turnpoint);
			// Updating turnpoints array in task first
			Task.update({'turnpoints._id' : data._id}, {'$set' : {'turnpoints.$' : turnpoint}});
			// Updating the turnpoint itself then.
			Turnpoints.update({_id : data._id}, turnpoint);
		}
		else { // Without data it is an insert.
			// Grabbing temporary waypoint and passing reference.
			var waypoint = Session.get('tempTurnpoint');
			// Copying all waypoint properties into turnpoint.
			turnpoint = Object.assign(waypoint, turnpoint);
			turnpoint.wp = waypoint._id
			delete turnpoint._id;
			console.log(turnpoint);
			//turnpoint.wp = waypoint;
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
