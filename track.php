<?php
$logFile = 'tracking_logs.csv';

if (isset($_GET['id']) && isset($_GET['type'])) {
    $id = preg_replace('/[^a-zA-Z0-9_-]/', '', $_GET['id']);
    $type = $_GET['type'];
    $ip = $_SERVER['REMOTE_ADDR'];
    $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown';
    $timestamp = date("Y-m-d H:i:s");
    $extra_info = $ip . " | " . $userAgent;

    // Create header if file doesn't exist
    if (!file_exists($logFile)) {
        file_put_contents($logFile, "Timestamp,TrackingID,EventType,Email,ExtraInfo\n");
    }

    if ($type === 'open') {
        $fp = fopen($logFile, 'a');
        if ($fp) {
            fputcsv($fp, [$timestamp, $id, 'open', '', $extra_info]);
            fclose($fp);
        }
        
        // Output 1x1 transparent GIF
        header('Content-Type: image/gif');
        header('Cache-Control: no-cache, no-store, must-revalidate'); // Prevent caching for accurate open counts
        header('Pragma: no-cache');
        header('Expires: 0');
        echo base64_decode('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
        exit();
        
    } elseif ($type === 'click' && isset($_GET['url'])) {
        $decodedUrl = base64_decode($_GET['url']);
        if ($decodedUrl) {
            $fp = fopen($logFile, 'a');
            if ($fp) {
                fputcsv($fp, [$timestamp, $id, 'click', '', $decodedUrl . ' | ' . $extra_info]);
                fclose($fp);
            }
            
            // Redirect to the destination
            header("Location: $decodedUrl", true, 302);
            exit();
        }
    }
}

// Fallback if invalid parameters
header("HTTP/1.0 404 Not Found");
?>
