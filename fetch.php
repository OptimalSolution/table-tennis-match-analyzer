<?php

if(isset($_REQUEST['id'])) {
    echo file_get_contents('http://216.119.100.169/history/rating/History/Phistory.asp?Pid=' . $_REQUEST['id']);
}
else {
    echo "<error>BAD REQUEST</error>";
}
