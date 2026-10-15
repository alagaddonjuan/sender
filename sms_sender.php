<?php
session_start();
require_once 'config.php';

// Security Check
if (!isset($_SESSION['authenticated']) || $_SESSION['authenticated'] !== true) {
    die("Unauthorized Access.");
}

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $rawNumbers = trim($_POST["toNumbers"] ?? "");
    $message = trim($_POST["smsMessage"] ?? "");
    
    if(empty($rawNumbers) || empty($message)) {
        die("❌ Error: Phone numbers and message are required.");
    }

    if(empty($at_username) || empty($at_api_key) || $at_api_key === 'YOUR_AFRICAS_TALKING_API_KEY') {
        die("❌ Error: Africa's Talking API Key missing in config.php. Please add it first.");
    }

    // Parse and format phone numbers
    $numbersArray = preg_split('/[\n,;\s]+/', $rawNumbers, -1, PREG_SPLIT_NO_EMPTY);
    $validNumbers = [];
    foreach($numbersArray as $num) {
        $num = trim($num);
        // Ensure it has a leading '+'
        if(strpos($num, '+') !== 0) {
            $num = '+' . ltrim($num, '0'); // Basic assumption handling if they typed 071... instead of +25471...
        }
        $validNumbers[] = $num;
    }
    
    // AT allows sending in batches of comma-separated numbers
    $to = implode(',', $validNumbers);

    echo "Preparing to send " . count($validNumbers) . " SMS messages...\n";

    $url = 'https://api.africastalking.com/version1/messaging';
    if ($at_username === 'sandbox') {
        $url = 'https://api.sandbox.africastalking.com/version1/messaging';
    }
    
    $data = array(
        'username' => $at_username,
        'to'       => $to,
        'message'  => $message
    );
    if (!empty($at_from)) {
        $data['from'] = $at_from;
    }

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, array(
        'Accept: application/json',
        'apikey: ' . $at_api_key
    ));
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // Best for WAMP localhost

    $response = curl_exec($ch);
    $error = curl_error($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($error) {
        echo "❌ cURL Error: " . $error . "\n";
    } else {
        $result = json_decode($response, true);
        if ($httpCode == 201 && isset($result['SMSMessageData'])) {
            echo "✅ Broadcast Dispatched successfully to Africa's Talking!\n\n";
            echo "Delivery Report:\n";
            foreach($result['SMSMessageData']['Recipients'] as $rec) {
                echo " -> " . $rec['number'] . " | Status: " . $rec['status'] . " | Cost: " . $rec['cost'] . "\n";
            }
        } else {
            echo "❌ API Error (HTTP $httpCode):\n";
            if (isset($result['SMSMessageData']['Message'])) {
                echo "Details: " . $result['SMSMessageData']['Message'] . "\n";
            } else {
                echo "Raw Response: " . htmlspecialchars($response) . "\n";
            }
        }
    }
}
?>
