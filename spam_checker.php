<?php
session_start();
require_once 'config.php';

header('Content-Type: application/json');

// Security Check
if (!isset($_SESSION['authenticated']) || $_SESSION['authenticated'] !== true) {
    echo json_encode(["error" => "Unauthorized Access."]);
    exit();
}

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    if (empty($gemini_api_key) || $gemini_api_key === "YOUR_GEMINI_API_KEY_HERE") {
        echo json_encode(["error" => "Gemini API key is not configured in config.php."]);
        exit();
    }

    $subject = $_POST['subject'] ?? '';
    $body = $_POST['body'] ?? '';
    
    // Strip HTML tags for cleaner analysis
    $clean_body = strip_tags($body);

    $prompt = "You are an expert email deliverability and anti-spam analyst. 
Analyze the following email subject and body for spam triggers, deceptive practices, or characteristics that would cause it to be flagged by major ISPs (like Gmail, Outlook, Yahoo). 
Provide a spam risk score from 0 (perfectly safe) to 100 (guaranteed spam).
Also, rewrite the subject and body to be highly professional, engaging, and have a spam risk score of near 0, while keeping the original intent.

Respond strictly with a JSON object in this format:
{
  \"score\": 85,
  \"risk_level\": \"High\",
  \"suggestions\": [
    \"Avoid using all caps in the subject line.\",
    \"Remove words like 'FREE' and 'GUARANTEE'.\"
  ],
  \"rewritten_subject\": \"A special invitation to our upcoming event\",
  \"rewritten_body\": \"Hello,\\n\\nI would like to invite you to our complimentary show. Would you be interested in attending?\"
}

Subject: " . $subject . "
Body: " . $clean_body;

require_once 'gemini_helper.php';

    $models_to_try = ["gemini-3.5-flash", "gemini-2.5-flash", "gemini-flash-latest"];
    $success = false;
    $response = "";
    $error_msg = "";

    foreach ($models_to_try as $model) {
        $data = [
            "contents" => [
                [
                    "parts" => [
                        ["text" => $prompt]
                    ]
                ]
            ],
            "generationConfig" => [
                "response_mime_type" => "application/json"
            ]
        ];

        $res = execute_gemini_request($model, $data);
        
        if ($res['httpCode'] === 200) {
            $success = true;
            $response = $res['response'];
            break;
        } else if ($res['httpCode'] === 429 && strpos($res['error'] ?? '', 'Exhausted') !== false) {
            $error_msg = $res['error']; // Capture hard limit error
            break; // Stop trying other models if quota is out
        } else {
            $error_msg = $res['error'] ?? "HTTP Code: " . $res['httpCode'];
        }
    }

    if (!$success) {
        echo json_encode(["error" => $error_msg ?: "Failed to reach Gemini API after retries."]);
        exit();
    }

    $responseData = json_decode($response, true);
    
    if (isset($responseData['candidates'][0]['content']['parts'][0]['text'])) {
        $ai_json_string = $responseData['candidates'][0]['content']['parts'][0]['text'];
        echo $ai_json_string;
    } else {
        echo json_encode(["error" => "Unexpected response format from AI API."]);
    }
}
?>
