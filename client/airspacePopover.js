/**
 * @file
 * JS Airspace Popover
 * Inspired by @Nico DB
 */
Template.airspacePopover.helpers({	
	stringAltitude : function(alt) {
	    var ret = "";
            if (alt.internalValue == 0){
                return "GROUND";
            } else{
                if (alt.ref === "FL"){
                    return "FL" + alt.value + " (around " + alt.internalValue + "m)";
                }else{
                    ret = alt.value + alt.unit.toUpperCase();
                    if (alt.unit !== "m"){
                        return ret + " (around " + alt.internalValue + "m) " + alt.ref;
                    } else{
                        return ret + " " + alt.ref;
                    }
                }
            }
	},
});
