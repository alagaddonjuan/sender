<?php
session_start();
require_once 'config.php';
require 'vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// Security & Expiry Check
if (!isset($_SESSION['authenticated']) || $_SESSION['authenticated'] !== true) {
    header('HTTP/1.0 403 Forbidden');
    die("Unauthorized Access.");
}

set_time_limit(3600); 
ignore_user_abort(true);

function log_tracking_event($id, $type, $email, $extra_info = '') {
    $logFile = 'tracking_logs.csv'; 
    $timestamp = date("Y-m-d H:i:s");
    
    // Create header if file doesn't exist
    if (!file_exists($logFile)) {
        file_put_contents($logFile, "Timestamp,TrackingID,EventType,Email,ExtraInfo\n");
    }
    
    $fp = fopen($logFile, 'a');
    if ($fp) {
        fputcsv($fp, [$timestamp, $id, $type, $email, $extra_info]);
        fclose($fp);
    }
}

function generate_ai_hook($domain, $api_key) {
    require_once 'gemini_helper.php';
    
    $prompt = "You are an expert sales copywriter. Write a single, highly engaging, personalized opening sentence for a cold email targeting someone who works at the company with the domain '$domain'. If the domain is a generic email provider (like gmail.com, yahoo.com, outlook.com), return a generic friendly opening sentence instead. Do not include any greetings (like 'Hi') or sign-offs. Return ONLY the sentence as plain text.";
    
    $data = [
        "contents" => [ [ "parts" => [ ["text" => $prompt] ] ] ]
    ];

    $res = execute_gemini_request('gemini-3.5-flash', $data);

    if ($res['httpCode'] === 200) {
        $responseData = json_decode($res['response'], true);
        if (isset($responseData['candidates'][0]['content']['parts'][0]['text'])) {
            return trim($responseData['candidates'][0]['content']['parts'][0]['text']);
        }
    }
    
    return "";
}

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // Manual Inputs from send.php
    $manualFromName  = htmlspecialchars($_POST["fromName"] ?? "");
    $manualFromEmail = filter_var($_POST["fromEmail"] ?? "", FILTER_SANITIZE_EMAIL); // We will use this as Reply-To
    $replyTo         = filter_var($_POST["replyToEmail"] ?? "", FILTER_SANITIZE_EMAIL);
    $subjectLine     = htmlspecialchars($_POST["subjectLine"] ?? "");
    $toEmailRaw      = trim($_POST["toEmail"] ?? "");
    $message         = $_POST["richMessageText"] ?? $_POST["rawMessageText"] ?? "";
    $enableAiPersonalization = isset($_POST['enableAiPersonalization']) && $_POST['enableAiPersonalization'] == '1';
    
    // A/B Testing Params
    $enableABTesting = isset($_POST['enableABTesting']) && $_POST['enableABTesting'] == '1';
    $subjectLineB    = htmlspecialchars($_POST["subjectLineB"] ?? "");
    $messageB        = $_POST["richMessageTextB"] ?? "";
    
    // Follow-up Params
    $enableFollowUp  = isset($_POST['enableFollowUp']) && $_POST['enableFollowUp'] == '1';
    $followUpDays    = (int)($_POST["followUpDays"] ?? 2);
    $followUpSubject = htmlspecialchars($_POST["subjectLineB"] ?? $_POST["followUpSubject"] ?? "");
    $followUpMessage = $_POST["richFollowUpText"] ?? "";

    // File Upload Handling
    $attachmentPath = "";
    if (isset($_FILES['attachment']) && $_FILES['attachment']['error'] === UPLOAD_ERR_OK) {
        $uploadDir = 'uploads/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }
        $fileName = basename($_FILES['attachment']['name']);
        $attachmentPath = $uploadDir . time() . '_' . preg_replace("/[^a-zA-Z0-9.-]/", "_", $fileName);
        if (!move_uploaded_file($_FILES['attachment']['tmp_name'], $attachmentPath)) {
            die("ERROR: Failed to save uploaded attachment.");
        }
    }

    // Parse Arrays
    $toEmails  = array_values(array_filter(array_map('trim', preg_split('/[\n,;\s]+/', $toEmailRaw, -1, PREG_SPLIT_NO_EMPTY))));
    $ccEmails  = array_values(array_filter(array_map('trim', preg_split('/[\n,;\s]+/', $_POST["cc"] ?? "", -1, PREG_SPLIT_NO_EMPTY))));
    $bccEmails = array_values(array_filter(array_map('trim', preg_split('/[\n,;\s]+/', $_POST["bcc"] ?? "", -1, PREG_SPLIT_NO_EMPTY))));
    
    $total = count($toEmails);
    $delay = 1; // 1 second delay between sends for Google Workspace efficiency
    
    // Set up Base URL for tracking
    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' || $_SERVER['SERVER_PORT'] == 443) ? "https://" : "http://";
    $baseUrl = $protocol . $_SERVER['HTTP_HOST'] . rtrim(dirname($_SERVER['REQUEST_URI']), '/\\');
    $trackUrl = $baseUrl . '/track.php';

    // Distribute emails across all available SMTP accounts
    $totalAccounts = count($smtp_accounts);
    
    // Group emails by SMTP account to preserve Keep-Alive efficiency
    $accountBuckets = [];
    foreach ($smtp_accounts as $accIndex => $acc) {
        $accountBuckets[$accIndex] = [];
    }
    
    // Distribute round-robin style (Email 1 -> Acc 1, Email 2 -> Acc 2...)
    foreach ($toEmails as $index => $email) {
        if (filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $bucketIndex = $index % $totalAccounts;
            $accountBuckets[$bucketIndex][] = ['email' => $email, 'original_index' => $index];
        }
    }

    $globalProgress = 0;
    $validTotal = 0;
    foreach($accountBuckets as $b) $validTotal += count($b);

    if ($validTotal === 0) {
        die("ERROR: No valid email addresses found.");
    }

    foreach ($accountBuckets as $accIndex => $bucket) {
        if (empty($bucket)) continue;

        $currentAcc = $smtp_accounts[$accIndex];
        $mail = new PHPMailer(true);

        try {
            // --- SMTP KEEP-ALIVE CONNECTION ---
            $mail->isSMTP();
            $mail->Host       = $currentAcc['host'];
            $mail->SMTPAuth   = true;
            $mail->Username   = $currentAcc['user'];
            $mail->Password   = $currentAcc['pass'];
            $mail->Port       = $currentAcc['port'];
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            $mail->SMTPKeepAlive = true; // KEEP CONNECTION OPEN

            // --- GOOGLE COMPLIANCE ---
            $mail->setFrom($currentAcc['user'], $manualFromName); 
            
            // Push all replies to the manually entered 'From' address
            if (!empty($replyTo)) {
                $mail->addReplyTo($replyTo, $manualFromName);
            } else {
                $mail->addReplyTo($manualFromEmail, $manualFromName);
            }

            foreach ($bucket as $item) {
                $toEmail = $item['email'];
                $originalIndex = $item['original_index'];
                
                $mail->clearAddresses();
                $mail->clearCCs();
                $mail->clearBCCs();
                $mail->clearAttachments();

                $mail->addAddress($toEmail);
                
                // Re-attach CC/BCC
                foreach ($ccEmails as $cc) if(filter_var($cc, FILTER_VALIDATE_EMAIL)) $mail->addCC(trim($cc));
                foreach ($bccEmails as $bcc) if(filter_var($bcc, FILTER_VALIDATE_EMAIL)) $mail->addBCC(trim($bcc));

                // Add Attachment
                if (!empty($attachmentPath) && file_exists($attachmentPath)) {
                    $mail->addAttachment($attachmentPath);
                }

                // A/B Testing Alternator (using original_index so A/B stays perfectly 50/50 regardless of SMTP rotation)
                $currentSubject = $subjectLine;
                $currentMessage = $message;
                $trackingPrefix = "";
                
                if ($enableABTesting) {
                    if ($originalIndex % 2 == 1) { // Variant B
                        $currentSubject = $subjectLineB;
                        $currentMessage = $messageB;
                        $trackingPrefix = "B_";
                    } else { // Variant A
                        $trackingPrefix = "A_";
                    }
                }

                $tracking_id = $trackingPrefix . md5($toEmail . time() . uniqid());
                $trackedMessage = $currentMessage;

                // 0. AI Hyper-Personalization Hook
                if ($enableAiPersonalization) {
                    $parts = explode('@', $toEmail);
                    if (count($parts) === 2) {
                        $domain = $parts[1];
                        global $gemini_api_key;
                        $hook = generate_ai_hook($domain, $gemini_api_key);
                        if (!empty($hook)) {
                            $trackedMessage = '<p style="font-size: 110%; color: #333; margin-bottom: 15px;">' . htmlspecialchars($hook) . '</p>' . $trackedMessage;
                        }
                    }
                }

                // 1. Rewrite HTML links for Click Tracking
                $trackedMessage = preg_replace_callback(
                    '/<a\s+([^>]*href=["\'])([^"\']+)(["\'][^>]*)>/i',
                    function($matches) use ($trackUrl, $tracking_id) {
                        $originalUrl = $matches[2];
                        if (strpos(strtolower($originalUrl), 'mailto:') === 0) return $matches[0];
                        
                        $encodedUrl = urlencode(base64_encode($originalUrl));
                        $newUrl = $trackUrl . '?id=' . $tracking_id . '&type=click&url=' . $encodedUrl;
                        return '<a ' . $matches[1] . $newUrl . $matches[3] . '>';
                    },
                    $trackedMessage
                );

                // 2. Inject invisible 1x1 image pixel for Open Tracking
                $pixelUrl = $trackUrl . '?id=' . $tracking_id . '&type=open';
                $trackedMessage .= '<img src="' . $pixelUrl . '" width="1" height="1" alt="" style="display:none;" />';

                $mail->isHTML(true);
                $mail->Subject = $currentSubject;
                $mail->Body    = $trackedMessage;

                $globalProgress++;
                
                if($mail->send()) {
                    log_tracking_event($tracking_id, 'sent', $toEmail, $currentSubject);
                    // Also log to sent_history.log for history.php compatibility
                    $sentLog = "[" . date("Y-m-d H:i:s") . "] Success | To: " . $toEmail . " | Sub: " . $currentSubject . " | Via: " . $currentAcc['user'] . "\n";
                    file_put_contents('sent_history.log', $sentLog, FILE_APPEND);
                    
                    // Queue Follow-Up if enabled
                    if ($enableFollowUp && !empty($followUpSubject) && !empty($followUpMessage)) {
                        $followUpDate = date("Y-m-d H:i:s", strtotime("+$followUpDays days"));
                        $queueFile = 'followup_queue.csv';
                        if (!file_exists($queueFile)) {
                            file_put_contents($queueFile, "TrackingID,Email,ScheduledDate,Subject,BodyBase64,Status\n");
                        }
                        $fpQueue = fopen($queueFile, 'a');
                        if ($fpQueue) {
                            fputcsv($fpQueue, [$tracking_id, $toEmail, $followUpDate, $followUpSubject, base64_encode($followUpMessage), 'pending']);
                            fclose($fpQueue);
                        }
                    }
                    
                    // Display which account was used in the UI
                    echo "PROGRESS:" . round(($globalProgress / $validTotal) * 100) . "|SENT:" . htmlspecialchars($toEmail) . " [Via " . htmlspecialchars($currentAcc['user']) . "]\n";
                    flush();
                }
                
                if ($globalProgress < $validTotal) sleep($delay);
            }
            
            // Gracefully close connection after this bucket is done
            $mail->smtpClose();

        } catch (Exception $e) {
            echo "ERROR: Transmission failed on account " . $currentAcc['user'] . " - " . $mail->ErrorInfo . "\n";
            flush();
        }
    }
    
    echo "SUMMARY:Batch Complete. Load dynamically distributed across " . $totalAccounts . " SMTP accounts using Keep-Alive efficiency.";
}