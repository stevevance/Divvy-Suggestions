<?php
//error_reporting(0);
ini_set('memory_limit','96M');

require_once("RollingCurl.php");

$url = "http://shareaboutsapi2.herokuapp.com/api/v2/divvy/datasets/divvy/places?location_type=new-suggestion&include_submissions=";

$now = date("Y-m-d H:i:s");

$suggested_stations = array();

$mysql = mysqli_connect('mysql.stevevance.net', 'stevevance', 'phenom0324', "offlinebikemap");

if(!$mysql) {
	die('Could not connect: ' . mysql_error());
}
//echo 'Connected successfully';

$table = "divvy_suggestions";

$i = 0;
$stations_count = 0;
$suggested_stations = array();

function getFirstPage() {
	// Initializing curl
	$url = "http://shareaboutsapi2.herokuapp.com/api/v2/divvy/datasets/divvy/places?location_type=new-suggestion&include_submissions=";
	$ch = curl_init( $url );
	
	// Configuring curl options
	$options = array(
		CURLOPT_RETURNTRANSFER => true,
		CURLOPT_HTTPHEADER => array('Content-type: application/json') ,
	);
	
	// Setting curl options
	curl_setopt_array( $ch, $options );
	
	// Getting results
	$data = curl_exec($ch); // Getting JSON result string
	$data = json_decode($data);
	
	$length = $data->{"metadata"}->{"length"};
	
	$pages = ceil($length/50);
	echo "<p>Downloading $pages pages to catch $length suggested Divvy locations...</p>";
	
	$urls = array();
	//array_push($urls, $url); // make sure to add the first page
	
	$i = 1;

	while($i < $pages+1) { // we just want to know how many URLs to push into the array
		$page = "http://shareaboutsapi2.herokuapp.com/api/v2/divvy/datasets/divvy/places?location_type=new-suggestion&include_submissions=&page=$i";
		array_push($urls, $page);
		$i++;
	}
	
	// create a new RollingCurl object and pass it the name of your custom callback function
	$rc = new RollingCurl("request_callback");
	// the window size determines how many simultaneous requests to allow.
	$rc->window_size = 5;
	foreach ($urls as $url) {
	    // add each request to the RollingCurl object
	    $request = new RollingCurlRequest($url);
	    $rc->add($request);
	}
	$rc->execute();
	
	sleep(5);
	afterRequest();
}

function request_callback($response, $info, $request) {
	global $suggested_stations, $stations_count, $mysql;
	$data = json_decode($response);
	//print_r($data);
	
	//print_r($data->{"features"});
	$suggestions = $data->{"features"};
	//var_dump($suggestions);
	
	foreach($suggestions as $s) {
		$stations_count++;
		//print_r($s);
		$desc = $s->{"properties"}->{"description"};
		$desc = mysqli_real_escape_string($mysql, $desc);
		
		$id = $s->{"properties"}->{"id"};
		$time = $s->{"properties"}->{"created_datetime"};
		
		if(isset($s->{"properties"}->{"submission_sets"}->{"support"})) {
			$supporters = count($s->{"properties"}->{"submission_sets"}->{"support"});
			//$supporters = 0;
		} else {
			$supporters = 0;
		}
		
		$lat = $s->{"geometry"}->{"coordinates"}[1];
		$lng = $s->{"geometry"}->{"coordinates"}[0];
		
		$station = array($id, $supporters, $desc, $time, $lat, $lng);
		
		array_push($suggested_stations, $station);
	}
	
	//echo "<li>" . count($suggested_stations) . "</li>";
	//print_r($suggested_stations);
}

function afterRequest() {
	global $suggested_stations, $mysql, $now;
	
	$stations_count = count($suggested_stations);
	echo "<p>" . $stations_count . " counted in the array</p>";
	
	$json = json_encode($suggested_stations);
	
	echo "<p>The JSON follows...</p>";
	echo $json;
				
	/* create a prepared statement */
	$stmt = mysqli_stmt_init($mysql);
	if (mysqli_stmt_prepare($stmt, "INSERT INTO divvy_suggestions (data, count, datetime) VALUES(?, ?, ?)")) {
		echo "<p>Inserting...<a href='?action=getjson'>get JSON</a></p>";
	    /* bind parameters for markers */
	    mysqli_stmt_bind_param($stmt, "sis", $json, $stations_count, $now);
	
	    /* execute query */
	    mysqli_stmt_execute($stmt);
	
	    /* bind result variables */
	    //mysqli_stmt_bind_result($stmt, $district);
	
	    /* fetch value */
	    //mysqli_stmt_fetch($stmt);
	
	    /* close statement */
	    mysqli_stmt_close($stmt);
	}
	echo mysqli_error($mysql);
	
	/* close connection */
	mysqli_close($mysql);
}

if($_GET['action'] == "getjson") {
	getJson();
} else {
	getFirstPage();	
}

function getJson() {
	global $mysql;
	// CORS origin
	header('content-type: application/json; charset=utf-8');
	header("access-control-allow-origin: *");
	
	$sql = "SELECT data FROM divvy_suggestions ORDER BY id DESC LIMIT 1";
	$result = mysqli_query($mysql, $sql);
	$row = mysqli_fetch_array($result);
	echo mysqli_error($mysql);	
	
	echo $row["data"];
	
	/* close connection */
	mysqli_close($mysql);
}
?>