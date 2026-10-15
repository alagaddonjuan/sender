<?php
session_start();
require_once 'config.php';

if (isset($_POST['password'])) {
    if ($_POST['password'] === $secret_password) {
        $_SESSION['authenticated'] = true;
        header("Location: index.php");
        exit();
    } else {
        header("Location: index.php?error=1");
        exit();
    }
}
?>