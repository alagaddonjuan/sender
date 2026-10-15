<?php
require_once 'config.php';
require 'vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// CLI or Web Access Check
if (php_sapi_name() !== 'cli' && (!isset($_GET['token']) || $_GET['token'] !== 'cron123')) {
    die("Unauthorized Access");
}

echo "Starting Cron Worker...\n";

// 1. Run IMAP Checker to halt sequences for people who replied
echo "--> Step 1: Checking IMAP for Replies\n";
ob_start();
include 'imap_checker.php';
$imapOutput = ob_get_clean();
echo trim($imapOutput) . "\n";

// 2. Process Follow-up Queue
echo "\n--> Step 2: Processing Follow-up Queue\n";
$queueFile = 'followup_queue.csv';
if (!file_exists($queueFile)) {
    die("No follow-up queue found. Exiting.\n");
}

$rows = [];
$toSend = [];
$now = date("Y-m-d H:i:s");

if (($handle = fopen($queueFile, "r")) !== FALSE) {
    $header = fgetcsv($handle);
    $rows[] = $header;
    while (($data = fgetcsv($handle)) !== FALSE) {
        // [0]TrackingID, [1]Email, [2]ScheduledDate, [3]Subject, [4]BodyBase64, [5]Status
        if ($data[5] === 'pending' && $data[2] <= $now) {
            $toSend[] = &$data; // Reference so we can update Status directly
        }
        $rows[] = &$data;
    }
    fclose($handle);
}

if (empty($toSend)) {
    echo "No pending follow-ups due at this time.\n";
    exit();
}

echo "Found " . count($toSend) . " follow-ups to dispatch.\n";

// Dispatch Logic using the primary SMTP account
$mail = new PHPMailer(true);
$currentAcc = $smtp_accounts[0]; 

try {
    $mail->isSMTP();
    $mail->Host       = $currentAcc['host'];
    $mail->SMTPAuth   = true;
    $mail->Username   = $currentAcc['user'];
    $mail->Password   = $currentAcc['pass'];
    $mail->Port       = $currentAcc['port'];
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->SMTPKeepAlive = true;

    $mail->setFrom($currentAcc['user'], "Q4 Campaign Manager"); 
    
    // Set Base URL for tracking
    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' || $_SERVER['SERVER_PORT'] == 443) ? "https://" : "http://";
    $baseUrl = $protocol . $_SERVER['HTTP_HOST'] . str_replace('/cron_worker.php', '', $_SERVER['REQUEST_URI']);
    $trackUrl = $baseUrl . '/track.php';

    $sentCount = 0;

    foreach ($toSend as &$item) {
        $tracking_id = $item[0];
        $toEmail     = $item[1];
        $subject     = $item[3];
        $bodyHtml    = base64_decode($item[4]);

        $mail->clearAddresses();
        $mail->addAddress($toEmail);
        
        // Setup Tracking for Follow-ups
        // Open pixel
        $pixelUrl = $trackUrl . '?id=' . $tracking_id . '&type=open';
        $bodyHtml .= '<img src="' . $pixelUrl . '" width="1" height="1" alt="" style="display:none;" />';
        
        // Link tracking
        $bodyHtml = preg_replace_callback(
            '/<a\s+([^>]*href=["\'])([^"\']+)(["\'][^>]*)>/i',
            function($matches) use ($trackUrl, $tracking_id) {
                $originalUrl = $matches[2];
                if (strpos(strtolower($originalUrl), 'mailto:') === 0) return $matches[0];
                $encodedUrl = urlencode(base64_encode($originalUrl));
                $newUrl = $trackUrl . '?id=' . $tracking_id . '&type=click&url=' . $encodedUrl;
                return '<a ' . $matches[1] . $newUrl . $matches[3] . '>';
            },
            $bodyHtml
        );

        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body    = $bodyHtml;

        if ($mail->send()) {
            $item[5] = 'sent';
            $sentCount++;
            echo "Sent follow-up to: $toEmail\n";
            
            // Log to tracking logs
            $trackLog = 'tracking_logs.csv';
            $fpLog = fopen($trackLog, 'a');
            fputcsv($fpLog, [$now, $tracking_id, 'sent', $toEmail, 'Automated Follow-up']);
            fclose($fpLog);
            
            sleep(1);
        }
    }
    
    $mail->smtpClose();
    echo "Dispatched $sentCount follow-ups successfully.\n";

} catch (Exception $e) {
    echo "ERROR: Transmission failed - " . $mail->ErrorInfo . "\n";
}

// Write the updated status back to queue file
$fp = fopen($queueFile, 'w');
foreach ($rows as $row) {
    fputcsv($fp, $row);
}
fclose($fp);

echo "\nCron Worker Execution Complete.\n";
?>
