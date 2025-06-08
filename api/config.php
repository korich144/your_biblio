<?php
session_start();

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

define('DB_HOST', 'localhost');
define('DB_PORT', '5432');
define('DB_NAME', 'bookcatalog');
define('DB_USER', 'postgres');
define('DB_PASSWORD', 'your_password');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization");
    exit(0);
}

function getDB() {
    static $db;
    if ($db === null) {
        $conn_string = "host=".DB_HOST." port=".DB_PORT." dbname=".DB_NAME." user=".DB_USER." password=".DB_PASSWORD;
        $db = pg_connect($conn_string);
        if (!$db) {
            http_response_code(500);
            echo json_encode(['error' => 'Database connection failed']);
            exit;
        }
        if (!isset($_SESSION['user_id'])) {
            $_SESSION['user_id'] = 0;
        }
        pg_query($db, "CREATE EXTENSION IF NOT EXISTS pgcrypto;");
    }
    return $db;
}

session_start();
?>