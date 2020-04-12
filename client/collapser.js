/**
 * Sidebar collapser for race analyser!
 */
Template.collapser.helpers({
	direction : function() {
		var T = Template.instance();
		if (T.collapsed.get()) {
			return 'left';
		}
		else {
			return 'right';
		}
	},
});


Template.collapser.onCreated(function onCollapserCreated() {
	this.collapsed = new ReactiveVar(false);
});

Template.collapser.onRendered(function onCollapserRendered() {
	var collapsed = this.collapsed.get();
	console.log(collapsed);
	positionCollapser($("#sidebar").position(), collapsed);

	$(window).resize(function() {
		positionCollapser($("#sidebar").position(), collapsed);
	});
});

Template.collapser.events({
	'click' : function(e) {
		var T = Template.instance();
		var state = T.collapsed.get();
		handleCollapse(!state);
		T.collapsed.set(!state);
	}
});

var handleCollapse = function (collapsed) {
	$('#map').toggleClass('col-md-9 col-md-12');
	if (collapsed) {
		$('#sidebar').toggleClass('collapsed');
	}
	var e = document.createEvent("CustomEvent");
    	e.initCustomEvent('collapser', false, false, {});
    	document.dispatchEvent(e);

	setTimeout(function (){
		if (!collapsed) {
			$('#sidebar').toggleClass('collapsed');
		}
		positionCollapser($("#sidebar").position(), collapsed);
	}, 600);
}

var positionCollapser = function(position, collapsed) {
	if (position.left > 0 && !collapsed) {
		$('#collapser').show().css({left : parseInt(position.left) - 30, right : 'inherit'});
	}
	else if (collapsed) {
		$('#collapser').show().css({left : 'inherit', right : 0});
	}
}
