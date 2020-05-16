<?php
$filePath = $_GET['path'];
if(isset($_POST["data"]) && $_POST["data"] !== ""){
    //追加到文件中
    $addStr = $_POST["data"];
    $myNote = fopen($filePath, "a");
    fwrite($myNote, $addStr);
}
?>