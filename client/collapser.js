/**
 * Sidebar collapser for race analyser!
 */
Template.collapser.events({
	'click' : function(e) {
		collapse();
	},
});

function collapse() {
	$('#map').toggleClass('col-lg-8 col-lg-12');
	$("#sidebar").addClass('collapsed');
	$("#expander").show();

	var e = document.createEvent("CustomEvent");
	e.initCustomEvent('collapser', false, false, {});
	document.dispatchEvent(e);
}