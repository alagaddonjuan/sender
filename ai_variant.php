<?php
session_start();
require_once 'config.php';

header('Content-Type: application/json');

if (!isset($_SESSION['authenticated']) || $_SESSION['authenticated'] !== true) {
    echo json_encode(["error" => "Unauthorized access."]);
    exit();
}

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $subjectA = $_POST['subject'] ?? '';
    $bodyA = $_POST['body'] ?? '';

    if (empty($subjectA) && empty($bodyA)) {
        echo json_encode(["error" => "No content provided."]);
        exit();
    }

    if (empty($gemini_api_key)) {
        echo json_encode(["error" => "Gemini API key is not configured in config.php"]);
        exit();
    }

    $prompt = "You are an expert, high-converting copywriter. I am A/B testing a cold email campaign. 
I will provide you with 'Variant A'. I need you to write 'Variant B' to test against it.
Variant B should try a completely different psychological angle or tone, but keep the core offer/meaning the same. 
Ensure it is highly optimized for opens and clicks.

Format your response EXACTLY like this:
SUBJECT: [Your variant subject line here]
BODY:
[Your variant body here]

Here is Variant A:
Subject: $subjectA
Body: 
" . strip_tags($bodyA);

    require_once 'gemini_helper.php';

    $data = [
        "contents" => [ [ "parts" => [ ["text" => $prompt] ] ] ]
    ];

    $res = execute_gemini_request('gemini-3.5-flash', $data);

    if ($res['httpCode'] === 200) {
        $responseData = json_decode($res['response'], true);
        if (isset($responseData['candidates'][0]['content']['parts'][0]['text'])) {
            $aiText = $responseData['candidates'][0]['content']['parts'][0]['text'];
            
            // Parse SUBJECT and BODY
            $variantSubject = "";
            $variantBody = "";
            
            $lines = explode("\n", $aiText);
            $isBody = false;
            
            foreach ($lines as $line) {
                if (stripos($line, "SUBJECT:") !== false && !$isBody) {
                    $variantSubject = trim(str_ireplace("SUBJECT:", "", $line));
                } elseif (stripos($line, "BODY:") !== false) {
                    $isBody = true;
                } elseif ($isBody) {
                    $variantBody .= $line . "\n";
                }
            }
            
            // Fallbacks in case formatting is slightly off
            if(empty($variantSubject) && empty($variantBody)) {
                 $variantBody = $aiText; // Just dump it in the body if parsing fails completely
            }
            
            echo json_encode([
                "variant_subject" => $variantSubject,
                "variant_body" => trim($variantBody)
            ]);
            exit();
        }
    }
    
    echo json_encode(["error" => $res['error'] ?? "Failed to get a response from AI API. (HTTP " . $res['httpCode'] . ")"]);
}
?>
