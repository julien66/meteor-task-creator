/**
 * @file 
 * openAir parser module for the task creator.
 * inspired by @Niko DB
 */ 
 	function toRad(val){
        	return Math.PI * val /180;
    	}
    	function toDeg(val){
        	return val * 180 / Math.PI;
    	}
    
    	function bearing(src, dest){
        	if (src.equals(dest)) {
          		return 0;
        	}
        	var lat1 = toRad(src.lat);
        	var lon1 = toRad(src.lng);
        	var lat2 = toRad(dest.lat);
        	var lon2 = toRad(dest.lat);
        	var angle = - Math.atan2( Math.sin( lon1 - lon2 ) * Math.cos( lat2 ), Math.cos( lat1 ) * Math.sin( lat2 ) - Math.sin( lat1 ) * Math.cos( lat2 ) * Math.cos( lon1 - lon2 ) );
        	if ( angle < 0.0 ) angle  += Math.PI * 2.0;
        	if ( angle > Math.PI ) angle -= Math.PI * 2.0; 
        	return parseFloat(angle.toDeg());
    	}
    	// Check OpenAir format
 	var check = function(text, filename) {
        	var lines = text.split("\n");
        	var i=0;
        	while (i < lines.length) {
            		lines[i]=lines[i].trim();
            		if (lines[i].length>0 && lines[i].charAt(0) !== '*'){
                		var w=lines[i].split(/(\w+)\s+(.*)/);
                		switch(w[1]){
                    			case 'AC':
			    		case 'AT'://Label position
			    		case 'AN'://Name
					case 'AL'://Lower limit:Floor
					case 'AH'://Upper limit: Ceil
					case 'DP'://Polygon point
					case 'DA'://Arc Angle+radius
					case 'DB'://Arc
					case 'DC': //Circle
					case 'DY': // Airway ?
					case 'V': // Variable
					case 'TO': // Terrain Open
					case 'TC': // Terrain Close
					case 'SP': // Select Pen
					case 'SB': // Select Brush
					// Special fields
					case 'AY': //Airspace type
					case 'AF': //Frequency
					case 'AG': //Call sign    
					break;
					default:
					return false;
				}
			}
			i++;
		}
		return true;
	}
			    
	function convertDDMMSStoDDdddd(str){
		try{
			str=str.toUpperCase();
		}catch (e){
			console.error(str,e);
		}
		
		var s=str.split(/(\d*):(\d*\.\d*|\d*):?(\d*)\s([NSWE])/);
		var dd = parseInt(s[1]) + parseFloat(s[2])/60;
		if (s[3].length>0) dd=dd+(s[3]/3600);
			switch(s[4]){
				case "S":
				case "W":
					dd = dd * -1;
				default:
			} 
		return parseFloat(dd);
	}
	
	/*
	* Parsing file
	* Getting airspace
	*/
	var parse = function (text, filename) {
		let lines = text.split("\n");
		var i=0;
		var airspace = false;
		var airspaces = [];
		var tmp = {};
		var points = [];
		// for each lines.
		while (i < lines.length) {
			//Ignoring comments
		    	//clear line --> delete airszpace begining and ending the line
		    	lines[i]=lines[i].trim().toUpperCase();
		    	if (lines[i].length>0 && lines[i].charAt(0) !== '*') {
				let w=lines[i].split(/(\w+)\s+(.*)/);
				switch(w[1]){
			    		case 'AC':
						if (airspace){
				    			// new airpsace
							airspace['points'] = points;
				    			if (airspace.class !== 'FIR' && airspace.class !== 'SECTOR' && airspace.class !== 'D-OTHER') {
								airspaces.push(airspace);
							}
							points = [];
				    			airspace = false;
						}
						airspace = {};
						airspace['class'] = w[2];
						airspace.source = filename;
						break;
			    		case 'AN'://Name
						airspace['name'] = w[2];
						break;
			    		case 'AL'://Lower limit:Floor
						airspace['floor'] = parseAltitude(w[2]);
						break;
			    		case 'AH'://Upper limit: Ceil
						airspace['ceil'] = parseAltitude(w[2]);
						break;
			    		case 'DP'://Polygon point
						let s = w[2].split(/(\d*:\d*:\d*\s[NS]|\d*:\d*.\d*\s[NS])\s*(\d*:\d*:\d*\s[EW]|\d*:\d*.\d*\s[EW])/);
						//adding points
						try{
				    			points.push([convertDDMMSStoDDdddd(s[1]), convertDDMMSStoDDdddd(s[2])]);
						}catch(e){
				    			console.error(s);
						}
						break;
			   		case 'V':
						let p=w[2].split(/(X|D)=(.*)$/);
						switch(p[1]){
				    			case 'X':
								let m=p[2].split(/(\d*:\d*:\d*\s[NS]|\d*:\d*.\d*\s[NS])\s(\d*:\d*:\d*\s[EW]|\d*:\d*.\d*\s[EW])/);
								try{
					    				tmp={
										lat: convertDDMMSStoDDdddd(m[1]),
										lng: convertDDMMSStoDDdddd(m[2])
					    				};
								}catch(e){
						    			console.error(m);
								}
								break;
					    		case 'D':
					    		default:
						}
						break;
				    	case 'DA'://Arc Angle+radius
						break;
				    	case 'DB'://Arc
						//Adding points to simulate the arc				
						let q=w[2].split(/(\d*:\d*:\d*\s[NS]|\d*:\d*.\d*\s[NS])\s*(\d*:\d*:\d*\s[EW]|\d*:\d*.\d*\s[EW])\s?,\s*(\d*:\d*:\d*\s[NS]|\d*:\d*.\d*\s[NS])\s*(\d*:\d*:\d*\s[EW]|\d*:\d*.\d*\s[EW])/);
						let pt1={ lat: convertDDMMSStoDDdddd(q[1]), lng: convertDDMMSStoDDdddd(q[2]) };
						let pt2={ lat: convertDDMMSStoDDdddd(q[3]), lng: convertDDMMSStoDDdddd(q[4]) };
						let r1=getDistance(pt1,tmp);
						let r2=getDistance(pt2,tmp);

						break;
					case 'DC': //Circle
						//@todo : check if it's NM or KM
						//Assume NM
						airspace['circle'] = [tmp,w[2]];
				    	case 'DY': // Airway ?
						break;
				   	 default:
						console.warn(w[1] + " not supported");
						break;
				}
			}
			i++;
		}
			
		if (airspace){
			airspaces.push(Object.assign({},airspace));
		}
		
		return {
		    'airspaces': airspaces,
		}
	}

	function getDistance(p1, p2) {
		var rayon = 6378137;
		var toRadians = Math.PI / 180;
		var dist = 0;
		if (p1 && p2) {
		    var a = (p1.lat * toRadians);
		    var b = (p1.lng * toRadians);
		    var c = (p2.lat * toRadians);
		    var d = (p2.lng * toRadians);
		    var e = Math.asin(Math.sqrt(Math.pow(Math.sin((a - c) / 2), 2) + Math.cos(a) * Math.cos(c) * Math.pow(Math.sin((b - d) / 2), 2)));
		    dist = e * rayon * 2;
		}
		return dist;
	}

	function parseAltitude(src) {
         	var alt = {};
		w = src.split(/(UNL|GND|SFC|FL)?\s?(\d*)\s*(FT|M|F)?\s?(AMSL|AGL)?/);
            	switch(w[1]){
                	case 'FL':
                    		alt.unit="ft";
                    		alt.ref='FL';
                   		alt.value=("000"+w[2]).slice(-3);
                   		alt.internalValue=Math.round(w[2]*100*0.3048);
                    		break;
                	case 'GND':
                	case 'SFC':
                    		alt.unit="m";
                    		alt.ref='SFC';
                    		alt.value=0;
                    		alt.internalValue=0;
                    		break;
                	case 'UNL':
                    		alt.unit="m";
                    		alt.ref='SFC';
                    		alt.value="Unlimited";
                    		alt.internalValue=Number.MAX_SAFE_INTEGER;
                    		break;
                	default:
                    		if (!w[4]){
                        		w[4]="AMSL";
                    		}
                    	switch(w[3]){
                        	case 'M':
                            		alt.unit="m";
                            		alt.ref=w[4];
                            		alt.value=w[2];
                            		alt.internalValue=parseInt(w[2]);
                            		break;
                        	case 'F':
                        	case 'FT':
                        	default://C
                            		alt.unit="ft";
                            		alt.ref=w[4];
                            		alt.value=w[2];
                            		alt.internalValue=Math.round(parseInt(w[2])*0.3048);
                    	}
            	}
		return alt;
        }
	
	let name = 'OpenAir';
	let extension ='.txt'
		    
	export {
		check,
		extension,
		name,
		parse,
	}
