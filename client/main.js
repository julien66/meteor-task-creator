import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
// Going for bootstrap.
import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap4-toggle/css/bootstrap4-toggle.min.css';
import 'bootstrap-4-autocomplete/dist/bootstrap-4-autocomplete';

// All this stuff is only for jquery ui and enabling the taskboard to be draggable...
import 'jquery-ui/themes/base/core.css';
import 'jquery-ui/themes/base/theme.css';
import 'jquery-ui/themes/base/sortable.css';
import 'jquery-ui/ui/widget';
import 'jquery-ui/ui/scroll-parent';
import 'jquery-ui/ui/data';
import 'jquery-ui/ui/widgets/mouse';
import 'jquery-ui/ui/widgets/sortable';

// Import chartjs
import 'chart.js/dist/Chart';

import './main.html';
// Bootstrap 4 plugin. Toggle.
const pkg = require('bootstrap4-toggle');
//Modal.allowMultiple = true;

var taskId = Task.insert({
	uid : Meteor.userId(),
	turnpoints : [],
});

// Reset Session.
Session.set('taskId', taskId);

Turnpoints = new Mongo.Collection('turnpoints', {connection: null});
Waypoints = new Mongo.Collection('waypoints', {connection: null});

Meteor.subscribe('Task');
Meteor.subscribe('Progress');

Meteor.startup(function() {});
