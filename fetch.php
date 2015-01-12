<?php

error_reporting(E_ALL);
ini_set('error_reporting', E_ALL);

//print_r($_REQUEST);

if(isset($_REQUEST['action'])) {
  switch($_REQUEST['action']) {
    case 'tournament':
      if(isset($_REQUEST['Tid']) && isset($_REQUEST['Pid'])) {
        $pid = $_REQUEST['Pid'];
        $tid = $_REQUEST['Tid'];
        $cache_file_name = "cache/tournament-{$tid}-{$pid}.html";
        if(file_exists($cache_file_name)) {
          echo file_get_contents($cache_file_name);
        }
        else {
          $html = file_get_contents("http://216.119.100.169/history/rating/History/TResult.asp?Pid=$pid&Tid=$tid");
          file_put_contents($cache_file_name, $html);
          echo $html;
        }
      }
      break;
    case 'tournaments':
      if(isset($_REQUEST['id']) && $_REQUEST['id'] > 0) {
        $id = $_REQUEST['id'];
        $cache_file_name = "cache/tournaments-{$id}.html";
        if(file_exists($cache_file_name)) {
          echo file_get_contents($cache_file_name);
        }
        else {
          $html = file_get_contents('http://216.119.100.169/history/rating/History/Phistory.asp?Pid=' . $id);
          file_put_contents($cache_file_name, $html);
          echo $html;
        }
      }
      break;
    case 'names':
      if(isset($_REQUEST['lastName']) && !empty($_REQUEST['lastName'])) {
        $lastName = $_REQUEST['lastName'];
        echo file_get_contents("http://216.119.100.169/history/rating/History/Allplayers.asp?Alpha=$lastName");
      }
      break;
	default:
	 echo "ERROR. Just...ERROR.";
  }
}