/*
 * CUSF Landing Prediction Version 2
 * Jon Sowman 2010
 * jon@hexoc.com
 * http://www.hexoc.com
 *
 * http://github.com/jonsowman/cusf-standalone-predictor
 *
 * This file contains all of the prediction javascript functions
 * that are explicitly related to Google Map manipulation
 *
 */

// Initialise the map canvas with (lat, long, zoom)
function initMap(centre_lat, centre_lon, zoom_level) {
    //
    // LEAFLET MAP SETUP
    //
    // Setup a basic Leaflet map
    map = L.map('map_canvas').setView([centre_lat, centre_lon], zoom_level);

    // Add OSM Map Layer
    var osm_map = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Add ESRI Satellite Map layers.
    var esrimapLink = 
    '<a href="http://www.esri.com/">Esri</a>';
    var esriwholink = 
    'i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community';
    var esri_sat_map = L.tileLayer(
    'http://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', 
    {
        attribution: '&copy; '+esrimapLink+', '+esriwholink,
        maxZoom: 18,
    });

    var map_layers = {'OSM':osm_map, 'ESRI Satellite':esri_sat_map};

    map.addControl(new L.Control.Layers(map_layers, null, {position: 'topleft'}));


}

// Enable or disable user control of the map canvas, including scrolling,
// zooming and clicking
function enableMap(map, state) {
    if ( state != false && state != true) {
        appendDebug("Unrecognised map state");
    } else if (state == false) {
        map.draggable = false;
        map.disableDoubleClickZoom = true;
        map.scrollwheel = false;
        map.navigationControl = false;
    } else if (state == true ) {
        map.draggable = true;
        map.disableDoubleClickZoom = false;
        map.scrollwheel = false;
        map.navigationControl = true;
    }
}

// This should be called on a "mousemove" event handler on the map canvas
// and will update scenario information display
function showMousePos(LatLng) {
    var curr_lat = LatLng.lat.toFixed(4);
    var curr_lon = LatLng.lng.toFixed(4);
    $("#cursor_lat").html(curr_lat);
    $("#cursor_lon").html(curr_lon);
    // if we have a prediction displayed
    // show range from launch and land:
    if ( map_items['launch_marker'] != null ) {
        var launch_pt = map_items['launch_marker'].getLatLng();
        var land_pt = map_items['land_marker'].getLatLng();
        var range_launch = distHaversine(launch_pt, LatLng, 1);
        var range_land = distHaversine(land_pt, LatLng, 1);
        $("#cursor_pred_launchrange").html(range_launch);
        $("#cursor_pred_landrange").html(range_land);
    }
    
}

// Read the latitude and longitude currently in the launch card and plot
// a marker there with hover information
function plotClick() {
    // Clear the old marker
    clearMapItems();
    // Get the new values from the form
    click_lat = parseFloat($("#lat").val());
    click_lon = parseFloat($("#lon").val());
    // Make sure the data is valid before we try and do anything with it
    if ( isNaN(click_lat) || isNaN(click_lon) ) return;
    var click_pt = new L.LatLng(click_lat, click_lon);

    // var launch_icon = new google.maps.MarkerImage(launch_img,
    //     new google.maps.Size(10, 10),
    //     new google.maps.Point(0, 0),
    //     new google.maps.Point(5, 5)
    // );

    launch_icon = L.icon({
        iconUrl: launch_img,
        iconSize: [10,10],
        iconAnchor: [5,5]
    });

    clickIconTitle = 'Currently selected launch location (' + click_lat + ', ' + click_lon+')'

    clickMarker = L.marker(click_pt,
        {
            title:clickIconTitle, 
            icon: launch_icon
        })
        .bindTooltip(clickIconTitle,{permanent:false,direction:'right'})
        .addTo(map);

    map_items['clickMarker'] = clickMarker;
    map.panTo(click_pt);
    map.setZoom(8);
}

// Given a GLatLng object, write the latitude and longitude to the launch card
function setFormLatLon(LatLng) {
    appendDebug("Trying to set the form lat long");
    $("#lat").val(LatLng.lat.toFixed(4));
    $("#lon").val(LatLng.lng.toFixed(4));
    // Remove the event handler so another click doesn't register
    setLatLonByClick(false);
    // Change the dropdown to read "other"
    SetSiteOther();
    // Plot the new marker for launch location
    appendDebug("Plotting the new launch location marker");
    plotClick();
}

// Enable or disable an event handler which, when a mouse click is detected
// on the map canvas, will write the coordinates of the clicked place to the
// launch card
function setLatLonByClick(state) {
    if ( state == true ) {
        // Check this listener doesn't already exist
        if (!clickListener) {
            appendDebug("Enabling the set with click listener");
            clickListener = map.on('click', function(event) {
                appendDebug("Got a click from user, setting values into form");
                $("#error_window").fadeOut();
                setFormLatLon(event.latlng);
            });
        }
        // Tell the user what to do next
        throwError("Now click your desired launch location on the map");
    } else if ( state == false ) {
        appendDebug("Removing the set with click listener");
        map.off('click',clickListener);
        clickListener = null;
    } else {
        appendDebug("Unrecognised state for setLatLonByClick");
    }
}

// An associative array exists globally containing all objects we have placed
// onto the map canvas - this function clears all of them
function clearMapItems() {
    cursorPredHide();
    if( getAssocSize(map_items) > 0 ) {
        appendDebug("Clearing previous map trace");
        for( i in map_items ) {
            map_items[i].remove();
        }
    }
    map_items = [];
}

// The Haversine formula to calculate the distance across the surface between
// two points on the Earth
distHaversine = function(p1, p2, precision) {
  var R = 6371; // earth's mean radius in km
  var dLat  = rad(p2.lat - p1.lat);
  var dLong = rad(p2.lng - p1.lng);

  var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(rad(p1.lat)) * Math.cos(rad(p2.lat)) * Math.sin(dLong/2) * Math.sin(dLong/2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  var d = R * c;
  if ( precision == null ) {
      return d.toFixed(3);
  } else {
      return d.toFixed(precision);
  }
}


// MJ: Commented out until we can find an equivalent geocoding API.
// Given a latitude, longitude, and a field to write the result to,
// find the name of the place using Google "reverse Geocode" API feature
// function rvGeocode(lat, lon, fillField) {
//     var geocoder = new google.maps.Geocoder();
//     var latlng = new google.maps.LatLng(parseFloat(lat), parseFloat(lon));
//     var coded = "Unnamed";
//     geocoder.geocode({'latLng': latlng}, function(results, status) {
//         if ( status == google.maps.GeocoderStatus.OK ) {
//             // Successfully got rv-geocode information
//             appendDebug("Got a good response from the geocode server");
//             coded = results[1].address_components[1].short_name;
//         } else {
//             appendDebug("The rv-geocode failed: " + status);
//         }
//         // Now write the value to the field
//         $("#"+fillField+"").val(coded);
//     });
// }
