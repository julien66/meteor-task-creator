/**
 * @file
 * JS file for chart analysis
 */
Template.chart.helpers({
});


Template.chart.onCreated(function onCreateChart() {

	this.autorun(function() {
		var id = Session.get('requestAnalysis');
		console.log(id);

		var infos = Session.get('raceInfos');
		var race = RaceEvents.findOne({'_id' : infos.id});
		if (race) {
			var task = race.tasks[infos.task]
			if (task.watch && task.watch[id]) {
				console.log('datas');
			}
		}
	});
});
