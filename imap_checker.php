<?php
require_once 'config.php';

// CLI or Web Access Check
if (php_sapi_name() !== 'cli' && (!isset($_GET['token']) || $_GET['token'] !== 'cron123')) {
    die("Unauthorized Access");
}

echo "Starting IMAP Check...\n";

if (empty($imap_host) || empty($imap_user) || empty($imap_pass)) {
    die("IMAP credentials not fully configured in config.php\n");
}

if (!function_exists('imap_open')) {
    die("ERROR: PHP IMAP extension is not enabled. Please enable php_imap in your php.ini file.\n");
}

// Connect to IMAP
$inbox = @imap_open($imap_host, $imap_user, $imap_pass) or die('Cannot connect to IMAP: ' . imap_last_error() . "\n");

// Search for UNSEEN emails (to save processing time)
$emails = imap_search($inbox, 'UNSEEN');

$repliedEmails = [];

if ($emails) {
    echo "Found " . count($emails) . " new messages.\n";
    foreach ($emails as $email_number) {
        $header = imap_headerinfo($inbox, $email_number);
        $fromAddress = $header->from[0]->mailbox . "@" . $header->from[0]->host;
        $fromAddress = strtolower(trim($fromAddress));
        
        $repliedEmails[] = $fromAddress;
        
        // Mark as seen so we don't process it again (optional, depending on user preference, but safe for automated scripts)
        // imap_setflag_full($inbox, $email_number, "\\Seen");
        echo "Detected reply from: $fromAddress\n";
    }
} else {
    echo "No new replies found.\n";
}

imap_close($inbox);

// Now, update followup_queue.csv and tracking_logs.csv
if (!empty($repliedEmails)) {
    $repliedEmails = array_unique($repliedEmails);
    
    // 1. Cancel Follow-ups
    $queueFile = 'followup_queue.csv';
    if (file_exists($queueFile)) {
        $rows = [];
        $cancelledCount = 0;
        if (($handle = fopen($queueFile, "r")) !== FALSE) {
            $header = fgetcsv($handle);
            $rows[] = $header;
            while (($data = fgetcsv($handle)) !== FALSE) {
                // $data[1] is Email, $data[5] is Status
                if (in_array(strtolower(trim($data[1])), $repliedEmails) && $data[5] === 'pending') {
                    $data[5] = 'cancelled_replied';
                    $cancelledCount++;
                }
                $rows[] = $data;
            }
            fclose($handle);
        }
        
        if ($cancelledCount > 0) {
            $fp = fopen($queueFile, 'w');
            foreach ($rows as $row) {
                fputcsv($fp, $row);
            }
            fclose($fp);
            echo "Cancelled $cancelledCount pending follow-ups due to replies.\n";
        }
    }
    
    // 2. Log Replies to Tracking
    $trackLog = 'tracking_logs.csv';
    if (file_exists($trackLog)) {
        $timestamp = date("Y-m-d H:i:s");
        $fp = fopen($trackLog, 'a');
        foreach ($repliedEmails as $replier) {
            // We log the reply. We don't necessarily have the tracking_id for a raw email reply, 
            // but we can log the email address with a generic ID or lookup the original ID.
            // For simplicity, we just generate a reply record with the email.
            fputcsv($fp, [$timestamp, "REPLY_DETECTED", "reply", $replier, "IMAP Sync"]);
        }
        fclose($fp);
        echo "Logged replies to analytics.\n";
    }
}

echo "IMAP Check Complete.\n";
?>
