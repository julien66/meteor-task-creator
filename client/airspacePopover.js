/**
 * @file
 * JS Airspace Popover
 * Inspired by @Nico DB
 */
Template.airspacePopover.helpers({	
	stringAltitude : function(alt) {
	    var ret = "";
            if (alt.internalvalue == 0){
                return "GROUND";
            } else{
                if (alt.ref === "FL"){
                    return "FL" + alt.value + " (around " + alt.internalvalue + "m)";
                }else{
                    ret = alt.value + alt.unit;
                    if (alt.unit !== "m"){
                        return ret + " (around " + alt.internalvalue + "m) " + alt.ref;
                    } else{
                        return ret + " " + alt.ref;
                    }
                }
            }
	},
});
