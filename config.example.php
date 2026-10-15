<?php
// Central Configuration Template
// Copy this file to config.php and fill in your actual credentials.

$secret_password = "CHANGE_ME_PASSWORD"; // Change this to your desired dashboard password
$expiry_date     = "2027-01-18";        // The date the script stops working
$app_name        = "Q4 Campaign Manager";

// AI Integration Settings
$gemini_api_key  = "YOUR_GEMINI_API_KEY"; // Insert your Gemini API Key from Google AI Studio

// Africa's Talking SMS API
$at_username = "sandbox"; // Replace with your Africa's Talking username (e.g., 'sandbox' for testing)
$at_api_key  = "YOUR_AFRICAS_TALKING_API_KEY"; // Replace with your API Key
$at_from     = ""; // Optional: Enter your registered Alphanumeric Sender ID or Shortcode

// Google Workspace / SMTP Accounts (For Inbox Rotation)
// You can add as many accounts as you want here. The Mailer Engine will automatically cycle through them to bypass sending limits.
$smtp_accounts = [
    [
        'host' => 'smtp.gmail.com', 
        'user' => 'your_email@example.com', // Primary sending email
        'pass' => 'YOUR_16_CHAR_APP_PASSWORD', // 16-character App Password
        'port' => 587
    ],
    // [
    //     'host' => 'smtp.gmail.com', 
    //     'user' => 'sales@example.com', // Secondary sending email for rotation
    //     'pass' => 'YOUR_APP_PASSWORD_HERE',
    //     'port' => 587
    // ]
];

// IMAP Configuration (For Automated Reply Detection & Follow-up Halting)
$imap_host = '{imap.gmail.com:993/imap/ssl}INBOX';
$imap_user = 'your_email@example.com'; // Usually matches your primary SMTP account
$imap_pass = 'YOUR_16_CHAR_APP_PASSWORD'; // App Password

// Helper to check expiry
if (time() > strtotime($expiry_date)) {
    die("This software license has expired. Please contact Q4 for renewal.");
}
?>
