/*
 * CUSF Landing Prediction Version 2
 * Jon Sowman 2010
 * jon@hexoc.com
 * http://www.hexoc.com
 *
 * http://github.com/jonsowman/cusf-standalone-predictor
 *
 * This file contains the event handlers used in the predictor, which are
 * numerous. They are divided into functions that setup handlers for each
 * part of the predictor, and a calling function
 *
 */

function setupEventHandlers() {
    EH_LaunchCard();
    EH_BurstCalc();
    EH_NOTAMSettings();
    EH_ScenarioInfo();
    EH_LocationSave();

    // Tipsylink tooltip class activation
    $(".tipsyLink").tipsy({fade: true});

    // Add the onmove event handler to the map canvas
    map.on('mousemove', function(event) {
        showMousePos(event.latlng);
    });
}

function EH_BurstCalc() {
    // Activate the "use burst calc" links
    $("#burst-calc-show").click(function() {
        $("#burst-calc-wrapper").show();
    });
    $("#burst-calc-show").hover(
        function() {
            $("#ascent,#burst").css("background-color", "#AACCFF");
        },
        function() {
            $("#ascent,#burst").css("background-color", "");
        });
    $("#burst-calc-use").click(function() {
        // Write the ascent rate and burst altitude to the launch card
        $("#ascent").val($("#ar").html());
        $("#burst").val($("#ba").html());
        $("#burst-calc-wrapper").hide();
    });
    $("#burst-calc-close").click(function() {
        // Close the burst calc without doing anything
        $("#burst-calc-wrapper").hide();
        $("#modelForm").show();
    });
    $("#burst-calc-advanced-show").click(function() {
        // Show the burst calculator constants
        // We use a callback function to fade in the new content to make
        // sure the old content has gone, in order to create a smooth effect
        $("#burst-calc").fadeOut('fast', function() {
            $("#burst-calc-constants").fadeIn();
        });
    });
    $("#burst-calc-advanced-hide").click(function() {
        // Show the burst calculator constants
        $("#burst-calc-constants").fadeOut('fast', function() {
            $("#burst-calc").fadeIn();
        });
    });
}

function EH_NOTAMSettings() {
    // Activate the checkbox 
    $("#notam-display").click(function() {
        if (document.modelForm.notams.checked){
            if (kmlLayer == null) kmlLayer = new google.maps.KmlLayer('http://www.habhub.org/kml_testing/notam_and_restrict.kml', {preserveViewport: true});
            kmlLayer.setMap(map);
	}
	else {
	    kmlLayer.setMap(null);
	}
    });
    // Activate the "notam settings" links
    $("#notam-settings-show").click(function() {
        $("#notam-settings-wrapper").show();
    });
    $("#notam-settings-close").click(function() {
        // Close the notam settings doing anything
        $("#notam-settings-wrapper").hide();
        $("#modelForm").show();
    });
}

function EH_LaunchCard() {
    // Activate the "Set with Map" link
    $("#setWithClick").click(function() {
        setLatLonByClick(true);
    });
    $("#setWithClick,#req_open").hover(
        function() {
            $("#lat,#lon").css("background-color", "#AACCFF");
        },
        function() {
            $("#lat,#lon").css("background-color", "");
        });
    // Launch card parameter onchange event handlers
    $("#lat").change(function() {
        plotClick();
    });
    $("#lon").change(function() {
        plotClick();
    });

    $("#site").change(function() {
        changeLaunchSite();
    });
}

function EH_ScenarioInfo() {
    // Controls in the Scenario Information window
    $("#showHideDebug").click(function() {
        toggleWindow("scenario_template", "showHideDebug", "Show Debug", "Hide Debug");
    });
    $("#showHideDebug_status").click(function() {
        toggleWindow("scenario_template", "showHideDebug", "Show Debug", "Hide Debug");
    });
    $("#showHideForm").click(function() {
        toggleWindow("input_form", "showHideForm", "Show Launch Card",
            "Hide Launch Card");
    });
    $("#closeErrorWindow").click(function() {
        $("#error_window").fadeOut();
    });

    $("#about_window_show").click(function() {
        $("#about_window").dialog({
            modal:true,
            width:600,
            height: $(document).height() - 200,
            buttons: {
                Close: function() {
                        $(this).dialog('close');
                    }
            }
        });
    });
}

function EH_LocationSave() {
    // Location saving to cookies event handlers
    $("#req_sub_btn").click(function() {
        saveLocationToCookie();
    });
    $("#cookieLocations").click(function() {
        appendDebug("User requested locally saved launch sites");
        if ( constructCookieLocationsTable("cusf_predictor") ) {
            $("#location_save_local").fadeIn();
        }
    });
    $("#req_open").click(function() {
            var lat = $("#lat").val();
            var lon = $("#lon").val();
            $("#req_lat").val(lat);
            $("#req_lon").val(lon);
            $("#req_alt").val($("#initial_alt").val());
            appendDebug("Trying to reverse geo-code the launch point");
            // No Leaflet geocode equivalent, so commenting this out for now.
            //rvGeocode(lat, lon, "req_name");
            $("#location_save").fadeIn();
    })
    $("#req_close").click(function() {
            $("#location_save").fadeOut();
    });
    $("#locations_close").click(function() {
            $("#location_save_local").fadeOut();
    });
}
