/**
 * @JS File for the Arispace.
 */
Meteor.startup(() => {
	console.log('here we are');
	Airspace = new Mongo.Collection('airspace');
}); 
