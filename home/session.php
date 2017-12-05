<?php
    header('Access-Control-Allow-Origin: http://lukejaffe.github.io');
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Methods: POST, OPTIONS');

    session_start();
    $username = $_SESSION['username'];
    if ($username == "")
        echo "guest";
    else
        echo $username;
?>
