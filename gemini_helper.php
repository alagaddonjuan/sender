<?php
require_once 'config.php';

function notify_admin_paid_tier() {
    global $admin_email, $smtp_accounts;
    if (empty($admin_email)) return;
    
    $subject = "Alert: AI Free Tier Exhausted - Switched to Paid Tier";
    $message = "The free tier for the Gemini API has been exhausted. The system has automatically switched to using the PAID tier API key to prevent service interruption.\n\nPlease check your billing dashboard.";
    
    $headers = "From: " . ($smtp_accounts[0]['user'] ?? "mailer@q4iltd.com");
    mail($admin_email, $subject, $message, $headers);
}

function execute_gemini_request($model, $data) {
    global $gemini_api_key;
    
    $current_key = $gemini_api_key;
    
    if (empty($current_key) || $current_key === "YOUR_GEMINI_API_KEY_HERE") {
        return ["error" => "Gemini API key is not configured.", "httpCode" => 0];
    }
    
    $url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key=" . trim($current_key);
    $max_retries = 3;
    $response = "";
    $httpCode = 0;
    
    for ($attempt = 0; $attempt < $max_retries; $attempt++) {
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode === 200) {
            return ["response" => $response, "httpCode" => 200];
        } else if ($httpCode === 429) {
            $errData = json_decode($response, true);
            $errMsg = strtolower($errData['error']['message'] ?? '');
            
            if (strpos($errMsg, 'depleted') !== false || strpos($errMsg, 'exhausted') !== false || strpos($errMsg, 'quota') !== false) {
                // Hard limit reached!
                return ["error" => "AI Quota Exhausted. Please check your billing dashboard.", "httpCode" => 429, "response" => $response];
            }
            sleep(2); // Normal rate limit, retry
        } else if ($httpCode === 503) {
            sleep(2);
        } else {
            break; // 404 or other error
        }
    }
    
    return ["error" => "Failed to reach Gemini API.", "httpCode" => $httpCode, "response" => $response];
}
?>
