/**
 * @file
 * JS File - Waypoint toogle.
 */

/**
 * Plugin not working hand copied from williamledoux bootstrap plugin.
 */
Template.waypoint.rendered = function() {
	// Set toggle default.
	Session.set("customWaypoint", false);
	
	var input = this.find("input[type=checkbox][data-toggle^=toggle]");
	var $input = $(input).bootstrapToggle({
		size : "small",
		onstyle : "success",
		offstyle: "warning",
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
// Set toggle options.
/*Template.waypoint.helpers({
	toggleWp : function() {
		return {
			size : "small",
			onstyle : "success",
			offstyle: "warning",
		};
	}
});*/

