/*
 * CUSF Landing Prediction Version 2
 * Jon Sowman 2010
 * jon@hexoc.com
 * http://www.hexoc.com
 *
 * http://github.com/jonsowman/cusf-standalone-predictor
 *
 */

 var map = null;

// This function runs when the document object model is fully populated
// and the page is loaded
$(document).ready(function() {
    // Initialise the map canvas with parameters (lat, long, zoom-level)
    initMap(52, 0, 8);

    // Populate the launch site list from sites.json
    populateLaunchSite();

    // Setup all event handlers in the UI using jQuery
    setupEventHandlers();

    // Initialise UI elements such as draggable windows
    initUI();

    // Populate the launch card time/date fields
    initLaunchCard();
    
    // Check if an old prediction is to be displayed, and process if so
    //displayOld();

    // Plot the initial launch location
    plotClick();

    // Initialise the burst calculator
    calc_init();
});

// See if an old UUID was supplied in the hashstring
// If it was, extract it, then populate the launch card with its parameters
// then display the prediction
function displayOld() {
    // Are we trying to display an old prediction?
    if( window.location.hash != "" ) {
        var ln = window.location.hash.split("=");
        var posteq = ln[1];
        if ( posteq.length != 40 ) {
            throwError("The supplied hashstring was not a valid UUID.");
            appendDebug("The hashstring was not the expected length");
        } else {
            current_uuid = posteq;
            appendDebug("Got an old UUID to plot:<br>" + current_uuid);
            appendDebug("Trying to populate form with scenario data...");
            populateFormByUUID(current_uuid);
            appendDebug("Trying to get progress JSON");
            $.getJSON("preds/"+current_uuid+"/progress.json", 
                function(progress) {
                    appendDebug("Got progress JSON from server for UUID");
                    if ( progress['error'] || !progress['pred_complete'] ) {
                        appendDebug("The prediction was not completed"
                            + " correctly, quitting");
                    } else {
                        appendDebug("JSON said the prediction completed");
                        processCompletedPrediction(progress);
                        writePredictionInfo(current_uuid, 
                            progress['run_time'], 
                            progress['dataset']);
                    }
                });
        }
    }
}

// A prediction has just been requested, so initialise the progress bar
// and fade in the prediction progress window
function predSub() {
    appendDebug(null, 1); // clear debug window
    appendDebug("Sending data to server...");
    // Disable form
    $("#modelForm").find("input").attr("disabled", true);
    // Gets in the way of #status_message
    $("#error_window").fadeOut(250);
    // Initialise progress bar
    $("#prediction_status").html("Sending data to server...");
}

// Make an AJAX request to the server and get the scenario information
// for a given UUID, then populate the launch card with it
function populateFormByUUID(pred_uuid) {
    $.get("ajax.php", { "action":"getModelByUUID", "uuid":pred_uuid }, function(data) {
        if ( !data.valid ) {
            appendDebug("Populating form by UUID failed");
            appendDebug("The server said the model it made was invalid");
        } else {
            // we're good to go, populate the form
            $("#lat").val(data.latitude);
            $("#lon").val(data.longitude);
            $("#initial_alt").val(data.altitude);
            $("#hour").val(data.hour);
            // we need to make minutes be "04" instead of "4"
            var scenario_minute = data.minute;
            if ( scenario_minute < 10 ) scenario_minute = "0" + scenario_minute;
            $("#min").val(scenario_minute);
            $("#second").val(data.second);
            $("#day").val(data.day);
            $("#month").attr("selectedIndex", data.month-1);
            $("#year").val(data.year);
            // we have to use [] notation for
            // values that have -s in them
            $("#ascent").val(data['ascent-rate']);
            $("#drag").val(data['descent-rate']);
            $("#burst").val(data['burst-altitude']);
            $("#software").val(data.software);
            // now sort the map out
            SetSiteOther();
            plotClick();
        }
    }, 'json');
}

// Add information to the hashstring of the current window
function addHashLink(link) {
   var ln = "#!/" + link;
   window.location = ln;
}

// Clear the Launch Site dropdown and repopulate it with the information from
// sites.json, as well as an "Other" option to open the saved locations window
function populateLaunchSite() {
    $("#site > option").remove();
    $.getJSON("sites.json", function(sites) {
        $.each(sites, function(sitename, site) {
            $("<option>").attr("value", sitename).text(sitename).appendTo("#site");
        });
        $("<option>").attr("value", "Other").text("Other").appendTo("#site");
        return true;
    });
    return true;
}

// The onchange handler for the launch locations dropdown menu, which opens
// the saved locations window if "Other" was chosen; sets the launch card
// lat/lon and plots the new launch location otherwise
function changeLaunchSite() {
    var selectedName = $("#site").val();
    if ( selectedName == "Other" ) {
        appendDebug("User requested locally saved launch sites");
        if ( constructCookieLocationsTable("cusf_predictor") ) {
            $("#location_save_local").fadeIn();
        }
    } else {
        $.getJSON("sites.json", function(sites) {
            $.each(sites, function(sitename, site) {
               if ( selectedName == sitename ) {
                    $("#lat").val(site.latitude);
                    $("#lon").val(site.longitude);
                    $("#initial_alt").val(site.altitude);
               }
            });
            plotClick();
        });
    }
}

// // Populate and enable the download CSV, KML and Pan To links, and write the 
// // time the prediction was run and the model used to the Scenario Info window
// function writePredictionInfo(current_uuid, run_time, dataset) {
//     // populate the download links
//     $("#dlcsv").attr("href", "preds/"+current_uuid+"/flight_path.csv");
//     $("#dlkml").attr("href", "kml.php?uuid="+current_uuid);
//     $("#panto").click(function() {
//             map.panTo(map_items['launch_marker'].position);
//             //map.setZoom(7);
//     });
//     $("#run_time").html(POSIXtoHM(run_time, true));
//     $("#dataset").html(dataset);
// }

function handlePred(pred_uuid) {
    // shorter timeout for the first ajax request, since the server
    // typically responds really quickly

    // map fadeout and launch card hiding happens shortly afterwards
    firstJSONProgressHandle = setTimeout("firstJSONProgress('" + pred_uuid + "')", firstAjaxDelay);
}

// Get the CSV for a UUID and then pass it to the parseCSV() function
function getCSV(pred_uuid) {
    $.get("ajax.php", { "action":"getCSV", "uuid":pred_uuid }, function(data) {
            if(data != null) {
                appendDebug("Got JSON response from server for flight path,"
                    + " parsing...");
                if (parseCSV(data) ) {
                    appendDebug("Parsing function returned successfully.");
                    appendDebug("Done, AJAX functions quitting.");
                } else {
                    appendDebug("The parsing function failed.");
                }
            } else {
                appendDebug("Server couldn't find a CSV for that UUID");
                throwError("Sorry, we couldn't find the data for that UUID. "+
                    "Please run another prediction.");
            }
    }, 'json');
}

function firstJSONProgress(pred_uuid) {
    firstJSONProgressHandle = null;
    ajaxEventHandle = setInterval("getJSONProgress('"
             + pred_uuid + "')", stdPeriod);
    showStatusEventHandle = setTimeout(showPredictionStatus, showStatusDelay);
    getJSONProgress(pred_uuid);
}

// Hide the launch card and scenario information windows, then fade out the
// map before setting an interval to poll for prediction progress
function showPredictionStatus() {
    showStatusEventHandle = null;
    $("#prediction_status").html("Predicting...");
    $("#status_message").fadeIn(250);
    $("#input_form").hide("slide", { direction: "down" }, 500);
    $("#scenario_info").hide("slide", { direction: "up" }, 500);
    // disable user control of the map canvas
    $("#map_canvas").fadeTo(1000, 0.2);
}

// Called at set inervals to examine the progress.json file on the server for
// a UUID to check for progress, and update the progress window
// Also handles high latency connections by increasing the timeout before
// the AJAX request completes and decreasing polling interval
function getJSONProgress(pred_uuid) {
    $.ajax({
        url:"preds/"+pred_uuid+"/progress.json",
        cache: false,
        dataType:'json',
        timeout: ajaxTimeout,
        error: function(xhr, status, error) {
            if ( status == "timeout" ) {
                appendDebug("Polling for progress JSON timed out");
                // check that we haven't reached maximum allowed timeout
                if ( ajaxTimeout < maxAjaxTimeout ) {
                    // if not, add the delta to the timeout value
                    newTimeout = ajaxTimeout + deltaAjaxTimeout;
                    appendDebug("Increasing AJAX timeout from " + ajaxTimeout
                        + "ms to " + newTimeout + "ms");
                    ajaxTimeout = newTimeout;
                } else if ( ajaxTimeout != hlTimeout ) {
                    // otherwise, increase poll delay and timeout
                    appendDebug("Reached maximum ajaxTimeout value of " 
                        + maxAjaxTimeout);
                    clearInterval(ajaxEventHandle);
                    appendDebug("Switching to high latency mode");
                    appendDebug("Setting polling interval to "+hlPeriod+"ms");
                    appendDebug("Setting progress JSON timeout to " 
                            + hlTimeout + "ms");
                    ajaxTimeout = hlTimeout;
                    ajaxEventHandle = setInterval("getJSONProgress('"
                             + pred_uuid + "')", hlPeriod);
                }
            }
        },
        success: processProgress
    });
}

function processCompletedPrediction(progress) {
    // parse the data
    getCSV(current_uuid);
    appendDebug("Server gave a prediction run timestamp of " 
        + progress['run_time']);
    appendDebug("Server said it used the " + progress['dataset'] + " GFS Dataset");

    var warnings = "<b>The prediction completed, but with warnings!<br>" +
               "The prediction may be unreliable!</b><br><br>";
    for (var i = 0; i < progress['pred_output'].length; i++) {
        appendDebug("Pred output: " + progress['pred_output'][i]);
        warnings += progress['pred_output'][i] + "<br>";
    }

    if (progress['warnings']) {
        throwError(warnings);

        // wait (a little bit) for the CSV to load (produces Debug messages)
        // so that scrollUp can (hopefully) get the final height of the Debug window,
        // avoiding a jump. If the delay isn't log enough; no big deal.
        setTimeout(function () {
            toggleWindow("scenario_template", "showHideDebug", "Show Debug", "Hide Debug", "show");
        }, 100);
    }

    writePredictionInfo(current_uuid, progress['run_time'], progress['dataset']);
}

// The contents of progress.json are given to this function to process
// If the prediction has completed, reset the GUI and display the new
// prediction; otherwise update the progress window
function processProgress(progress) {
    if ( progress['error'] ) {
        clearInterval(ajaxEventHandle);
        appendDebug("There was an error in running the prediction: " 
                + progress['error']);
        resetGUI();
        toggleWindow("scenario_template", "showHideDebug", "Show Debug", "Hide Debug", "show");
    } else {
        // get the progress of the wind data
        if ( progress['pred_complete'] == true ) { // pred has finished
            $("#prediction_status").html("Prediction finished.");
            appendDebug("Server says: the predictor finished running.");
            appendDebug("Attempting to retrieve flight path from server");
            // reset the GUI
            resetGUI();
            // stop polling for JSON
            clearInterval(ajaxEventHandle);
            processCompletedPrediction(progress);
            addHashLink("uuid="+current_uuid);
        } else if ( progress['pred_running'] != true ) {
            $("#prediction_status").html("Waiting for predictor to run...");
            appendDebug("Server says: predictor not yet running...");
        } else if ( progress['pred_running'] == true ) {
            $("#prediction_status").html("Predictor running...");
            appendDebug("Server says: predictor currently running");
        }
    }
    return true;
}

// Once a flight path has been returned from the server, this function takes
// an array where each elemt is a line of that file
// Constructs the path, plots the launch/land/burst markers, writes the
// prediction information to the scenario information window
function parseCSV(lines) {
    if( lines.length <= 0 ) {
        appendDebug("The server returned an empty CSV file");
        return false;
    }
    var path = [];
    var max_height = -10; //just any -ve number
    var max_point = null;
    var launch_lat;
    var launch_lon;
    var land_lat;
    var land_lon;
    var launch_pt;
    var land_pt;
    var burst_lat;
    var burst_lon;
    var burst_pt;
    var burst_time;
    var launch_time;
    var land_time;
    $.each(lines, function(idx, line) {
        entry = line.split(',');
        // Check for a valid entry length
        if(entry.length >= 4) {
            var point = new google.maps.LatLng( parseFloat(entry[1]), 
                parseFloat(entry[2]) );
            // Get launch lat/lon
            if ( idx == 0 ) {
                launch_lat = entry[1];
                launch_lon = entry[2];
                launch_time = entry[0];
                launch_pt = point;
            }

            // Set on every iteration such that last valid entry gives the
            // landing position
            land_lat = entry[1];
            land_lon = entry[2];
            land_time = entry[0];
            land_pt = point;
            
            // Find the burst lat/lon/alt
            if( parseFloat(entry[3]) > max_height ) {
                max_height = parseFloat(entry[3]);
                burst_pt = point;
                burst_lat = entry[1];
                burst_lon = entry[2];
                burst_time = entry[0];
            }

            // Push the point onto the polyline path
            path.push(point);
        }
    });

    appendDebug("Flight data parsed, creating map plot...");
    clearMapItems();
    
    // Calculate range and time of flight
    var range = distHaversine(launch_pt, land_pt, 1);
    var flighttime = land_time - launch_time;
    var f_hours = Math.floor((flighttime % 86400) / 3600);
    var f_minutes = Math.floor(((flighttime % 86400) % 3600) / 60);
    if ( f_minutes < 10 ) f_minutes = "0"+f_minutes;
    flighttime = f_hours + "hr" + f_minutes;
    $("#cursor_pred_range").html(range);
    $("#cursor_pred_time").html(flighttime);
    cursorPredShow();
    
    // Make some nice icons
    var launch_icon = new google.maps.MarkerImage(launch_img,
        new google.maps.Size(10,10),
        new google.maps.Point(0, 0),
        new google.maps.Point(5, 5)
    );
    
    var land_icon = new google.maps.MarkerImage(land_img,
        new google.maps.Size(10,10),
        new google.maps.Point(0, 0),
        new google.maps.Point(5, 5)
    );

    var burst_icon = new google.maps.MarkerImage(burst_img,
        new google.maps.Size(16, 16),
        new google.maps.Point(0, 0),
        new google.maps.Point(8, 8)
    );
      
    var launch_marker = new google.maps.Marker({
        position: launch_pt,
        map: map,
        icon: launch_icon,
        title: 'Balloon launch ('+launch_lat+', '+launch_lon+') at ' 
            + POSIXtoHM(launch_time) + "UTC"
    });

    var land_marker = new google.maps.Marker({
        position: land_pt,
        map:map,
        icon: land_icon,
        title: 'Predicted Landing ('+land_lat+', '+land_lon+') at ' 
            + POSIXtoHM(land_time) + "UTC"
    });

    var pop_marker = new google.maps.Marker({
            position: burst_pt,
            map: map,
            icon: burst_icon,
            title: 'Balloon burst (' + burst_lat + ', ' + burst_lon 
                + ' at altitude ' + max_height + 'm) at ' 
                + POSIXtoHM(burst_time) + "UTC"
    });

    var path_polyline = new google.maps.Polyline({
        path: path,
        map: map,
        strokeColor: '#000000',
        strokeWeight: 3,
        strokeOpacity: 0.75
    });

    // Add the launch/land markers to map
    // We might need access to these later, so push them associatively
    map_items['launch_marker'] = launch_marker;
    map_items['land_marker'] = land_marker;
    map_items['pop_marker'] = pop_marker;
    map_items['path_polyline'] = path_polyline;

    // Pan to the new position
    map.panTo(launch_pt);
    map.setZoom(8);

    return true;
}

// Return the size of a given associative array
function getAssocSize(arr) {
    var i = 0;
    for ( j in arr ) {
        i++;
    }
    return i;
}

function POSIXtoHM(timestamp, include_day) {
    var ts = new Date(timestamp*1000);
    var s = "";
    var temp;

    function pad(s2, n) {
        s2 = String(s2);
        while (s2.length < n)
            s2 = "0" + s2;
        return s2;
    }

    s += pad(ts.getUTCHours(), 2);
    s += ":";
    s += pad(ts.getUTCMinutes(), 2);

    if (include_day) {
        s += " ";
        s += pad(ts.getUTCDate(), 2);
        s += "/";
        s += pad(ts.getUTCMonth() + 1, 2);
        s += "/";
        s += pad(ts.getUTCFullYear(), 2);
    }

    return s;
}

rad = function(x) {return x*Math.PI/180;}

