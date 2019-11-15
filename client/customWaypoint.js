/*
 * @file
 * JS File - Custom Waypoint.
 */

/**
 * Plugin not working hand copied from williamledoux bootstrap plugin.
 */
Template.customWaypoint.rendered = function() {
	// Set toggle default.
	Session.set("customWaypoint", false);
	
	var input = this.find("input[type=checkbox][data-toggle^=toggle]");
	var $input = $(input).bootstrapToggle({
		size : "small",
		onstyle : "light",
		offstyle: "dark",
	});
	
	$input.change(function(e){
		if($(this).prop('checked')) {
			Session.set("customWaypoint", true);
		} 
		else {
			Session.set("customWaypoint", false);
		}
	});
};
