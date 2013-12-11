//toolbar.hide();

// function get parameters from the URL
function GetParam(name) // make a variable out of each of the parameters in GET
{
  var start=location.search.indexOf("?"+name+"=");
  if (start<0) start=location.search.indexOf("&"+name+"=");
  if (start<0) return '';
  start += name.length+2;
  var end=location.search.indexOf("&",start)-1;
  if (end<0) end=location.search.length;
  var result='';
  for(var i=start;i<=end;i++) {
    var c=location.search.charAt(i);
    result=result+(c=='+'?' ':c);
  }
  return unescape(result);
}

function generateRandomNumber() {
	var random = Math.floor((Math.random()*100)+1);
	return random;
}

function randomFromInterval(from,to) {
    return Math.floor(Math.random()*(to-from+1)+from);
}

function isNumber(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

function getGpsLocation(callbackSuccess, callbackError) {
	var locationObject = window.localStorage.getItem("location_object");
	var gpsMaxAgeMs = 360000; // 30,000 ms = 30 seconds, 60,000 ms = 60 seconds
	var gpsMaxAgeS = gpsMaxAgeMs/1000;
	var timeoutDuration = 8000; // 6,000 = 6 seconds
	var now = Math.round((new Date()).getTime() / 1000);
	var locationOptions = { maximumAge: gpsMaxAgeMs, timeout: timeoutDuration, enableHighAccuracy: false }; // don't allow old data
	
	if(locationObject != null) {
		// looks like this var has a value
		console.log("Get Location: locationObject has length > 0");
		locationObject = JSON.parse(window.localStorage.getItem("location_object"));
	} else { 
		locationObject = "";
	}
	
	// test the locationObject
	if(locationObject.length == 0 || now - locationObject.timestamp > gpsMaxAgeS) {
		var age = now - locationObject.timestamp;
		if(locationObject.length == 0) {
			console.log("Get Location: Getting location because locationObject isn't set");
		} 
		if(now - locationObject.timestamp > gpsMaxAgeS) {
			console.log("Get Location: Getting location because location age is too old (at " + age + " seconds)");
		} 
		
		navigator.geolocation.getCurrentPosition(function (e) {
			console.log("Get Location: inside navigator");
			var radius = e.coords.accuracy / 2; // in meters
			var lat = e.coords.latitude;
			var lng = e.coords.longitude;
			var ts = Math.round((new Date()).getTime() / 1000);
			
			var locationObject = {coords:{latitude:lat,longitude:lng,accuracy:e.coords.accuracy},radius:radius,timestamp:ts}
			console.log("Get Location: created the locationObject");
			window.localStorage.setItem("location_object",JSON.stringify(locationObject));
						
			callbackSuccess(locationObject);
		}, function(e) { // this is when the getCurrentPosition fails			
			if(callbackError) {
				callbackError(e);
				console.log("Get Location: failed to get location, calling callback");
			} else {
				console.log("Get Location: failed to get location AND no callback specified");
			}
		}, locationOptions);
	} else {
		var age = now - locationObject.timestamp;
		console.log("Get Location: locationObject is probably set. Age: " + age + " (which should be less than " + gpsMaxAgeS + ")");

		callbackSuccess(locationObject);
		
		if(now - locationObject.timestamp > gpsMaxAgeS/2 && now - locationObject.timestamp < gpsMaxAgeS) {
			console.log("Get Location: half age");
			// if the current age of the location is greater than half the max age, go ahead and get the new location and save that, but don't call the callback function because we don't know what the user is trying to do at the moment		
			navigator.geolocation.getCurrentPosition(function (e) {
				console.log("Get Location: half age: inside navigator");
				var radius = e.coords.accuracy / 2; // in meters
				var lat = e.coords.latitude;
				var lng = e.coords.longitude;
				var ts = Math.round((new Date()).getTime() / 1000);
				
				var locationObject = {coords:{latitude:lat,longitude:lng,accuracy:e.coords.accuracy},radius:radius,timestamp:ts}
				console.log("Get Location: half age: created the locationObject");
				window.localStorage.setItem("location_object",JSON.stringify(locationObject));
			}, function(e) { // this is when the getCurrentPosition fails
				console.log("Get Location: half age: failed to get location");
				
			}, locationOptions);
		} // end if greater than half the max age
	} // end else 
}

function strip_tags (input, allowed) {
  // http://kevin.vanzonneveld.net
  allowed = (((allowed || "") + "").toLowerCase().match(/<[a-z][a-z0-9]*>/g) || []).join(''); // making sure the allowed arg is a string containing only tags in lowercase (<a><b><c>)
  var tags = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi,
    commentsAndPhpTags = /<!--[\s\S]*?-->|<\?(?:php)?[\s\S]*?\?>/gi;
  return input.replace(commentsAndPhpTags, '').replace(tags, function ($0, $1) {
    return allowed.indexOf('<' + $1.toLowerCase() + '>') > -1 ? $0 : '';
  });
}

function internetFailed(extraMessage) {
	var defaultMessage = "Internet couldn't be reached.";
	var tryAgain = "<a href='index.html' data-ajax='false'>Try again</a>."
	var message;
	if(isHomepage != undefined && isHomepage) {
		message = defaultMessage + " " + tryAgain;
	}
	if(extraMessage.length > 0) {
		message = extraMessage + " " + tryAgain;
	}
	$('#messageBox').html("<p>" + message + "</p>");
}

/* maps functions */
function setLocation(type,lat,lng) {
	var locationString = lat + "," + lng;
	window.localStorage.setItem(type,locationString);
	console.log("Location Setting: " + type + " set to " + lat + "," + lng);
	typeC = capitaliseFirstLetter(type);
	$('.setLocation_'+type).html("| " + typeC + " is set");
}

function getLocation(type) {
	console.log("Location Setting: getLocation has been called for " + type);
	var theLocation = window.localStorage.getItem(type);
	if(theLocation) {
		var n=theLocation.split(",");
		
		var lat = n[0];
		var lng = n[1];
		
		if($.isNumeric(lat) && $.isNumeric(lng)) {
			return true;
		} else {
			return false;
		}
	} else {
		return false;
	}
}
// end maps functions

function isThereCubsGame() {
	var url = "http://bikechi.com/operations/cubs_json.php";
	if(window.localStorage.getItem("show_cubs") == 1) {
		$.getJSON(url, {callback: ""})
			.done( function(data) {
				console.log("Cubs API: reached");
				if(data.game_today == "yes") {
					var height = $('#homepage_map').height();
					$('#homepage_map').css("height",height-38 + "px");
					map.invalidateSize();
					$('#homepage_alerts').show();
					$('#cubs_button').show().html("<div>" + data.game_time + "</div>");
				} else if(data.game_today == "no") {
					//$('#messageBox').append("No Cubs game today.");
					console.log("Cubs API: no game today. Verify this on http://isthereacubsgametoday.com");
				}
			}) // end .done
			.fail(function() { 
				console.log("Cubs API: This may indicate a data connection failure.");
				internet_failed = 1;
				//internetFailed("Can't get Cubs game status");
			} // end .fail
		); // end getJSON
	} else { // end if(user wants alert)
		console.log("Cubs API: User has alerts turned off");
	}
}

function timestampToTime(timestamp) {
	// hours part from the timestamp
	var hours = timestamp.getHours();
	// minutes part from the timestamp
	var minutes = timestamp.getMinutes();
	// seconds part from the timestamp
	var seconds = timestamp.getSeconds();
	
	// will display time in 10:30:23 format
	var formattedTime = hours + ':' + minutes + ':' + seconds;
	
	return formattedTime;
}

function capitaliseFirstLetter(string)
{
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function ucwords (str) {
  // http://kevin.vanzonneveld.net
  // +   original by: Jonas Raoni Soares Silva (http://www.jsfromhell.com)
  // +   improved by: Waldo Malqui Silva
  // +   bugfixed by: Onno Marsman
  // +   improved by: Robin
  // +      input by: James (http://www.james-bell.co.uk/)
  // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // *     example 1: ucwords('kevin van  zonneveld');
  // *     returns 1: 'Kevin Van  Zonneveld'
  // *     example 2: ucwords('HELLO WORLD');
  // *     returns 2: 'HELLO WORLD'
  return (str + '').replace(/^([a-z\u00E0-\u00FC])|\s+([a-z\u00E0-\u00FC])/g, function ($1) {
    return $1.toUpperCase();
  });
}

function getSorted(arr, sortArr) {
	var result = [];
	for(var i=0; i<arr.length; i++) {
		result[i] = arr[sortArr[i]];
	}
	return result;
	
	// getSorted(poiArray, reorderedKeys);
}

function firstRun() {
	if(window.localStorage.getItem("first_run_was_ran") == null) {
		console.log("First Run: not yet run, running now...");
		// do these things once and only once
		window.localStorage.setItem("first_run_was_ran",1);
		
		// pre-set settings that the user can toggle
		window.localStorage.setItem("show_notices",1);
		window.localStorage.setItem("show_precipitation",1);
	} else {
		console.log("First Run: has already been run. Value of first_run_was_ran=" + window.localStorage.getItem("first_run_was_ran"));
	}
}