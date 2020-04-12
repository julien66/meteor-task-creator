/**
 * Sidebar expander for race analyser!
 */
Template.expander.events({
    'click' : function() {
        expand();
    }
});

function expand() {
    $("#expander").hide();
    $('#map').toggleClass('col-lg-8 col-lg-12');
    setTimeout(function() {
        $("#sidebar").removeClass('collapsed');
    }, 500);

    var e = document.createEvent("CustomEvent");
    e.initCustomEvent('collapser', false, false, {});
    document.dispatchEvent(e);
}
