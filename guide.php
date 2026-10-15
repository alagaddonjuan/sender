<?php
session_start();
require_once 'config.php';

if (!isset($_SESSION['authenticated']) || $_SESSION['authenticated'] !== true) {
    header("Location: index.php");
    exit();
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <title>How to Use | <?php echo $app_name; ?></title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css">

    <style>
        body { background: #f8f9fa; padding: 30px 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        .guide-header { background: linear-gradient(135deg, #0d6efd, #0dcaf0); color: white; padding: 40px 20px; border-radius: 15px; text-align: center; margin-bottom: 40px; box-shadow: 0 10px 20px rgba(0,0,0,0.1); }
        .step-card { border: none; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); margin-bottom: 30px; overflow: hidden; }
        .step-header { padding: 20px; color: white; font-weight: bold; font-size: 1.25rem; display: flex; align-items: center; }
        .step-body { padding: 30px; background: white; }
        .feature-box { background: #f4f7f6; padding: 15px; border-radius: 8px; border-left: 4px solid #0d6efd; margin-top: 15px; }
        
        /* Step Colors */
        .c-scrape { background: #6f42c1; }
        .c-verify { background: #fd7e14; }
        .c-send { background: #0d6efd; }
        .c-analytics { background: #212529; }
        .c-sms { background: #198754; }
    </style>
</head>
<body>

<div class="container">
    <div class="row justify-content-center">
        <div class="col-lg-9">
            
            <div class="guide-header">
                <h1 class="fw-bold mb-3"><i class="bi bi-book-half"></i> Master Your Campaign Manager</h1>
                <div class="d-flex justify-content-center gap-2">
                    <a href="beta/?session=active#/guide" class="btn btn-warning fw-bold text-dark rounded-pill px-4 py-2 shadow-sm"><i class="bi bi-stars me-1"></i>Try Beta Guide</a>
                    <a href="index.php" class="btn btn-light fw-bold text-primary rounded-pill px-4 py-2 shadow-sm">Back to Dashboard</a>
                </div>
            </div>

            <!-- Step 1: Scrape -->
            <div class="step-card">
                <div class="step-header c-scrape">
                    <i class="bi bi-search me-3 fs-3"></i> Step 1: Scrape (Find Your Audience)
                </div>
                <div class="step-body">
                    <p>The Scraper is where your journey begins. If you don't have a list of emails yet, this tool will find them for you across the web.</p>
                    <ol class="mb-0">
                        <li>Enter a <strong>Keyword</strong> related to your target audience (e.g., <em>"Plumbers in New York"</em>, <em>"Real Estate Investors"</em>).</li>
                        <li>The system will automatically search the web and extract valid email addresses from websites matching your keyword.</li>
                        <li>Click <strong>Export to CSV</strong> to download your fresh list of leads.</li>
                    </ol>
                </div>
            </div>

            <!-- Step 2: Verify -->
            <div class="step-card">
                <div class="step-header c-verify">
                    <i class="bi bi-shield-check me-3 fs-3"></i> Step 2: Verify (Clean Your List)
                </div>
                <div class="step-body">
                    <p>Never send emails to an unchecked list! Sending messages to dead or fake emails will destroy your sending reputation and get your accounts banned.</p>
                    <ol>
                        <li>Paste your raw list of emails into the Verifier.</li>
                        <li>Click <strong>Start Verification</strong>. The engine will check the syntax, remove duplicates, and physically ping the email servers (MX Records) to ensure the inbox actually exists.</li>
                        <li>Copy the final <strong>"Valid Emails"</strong> list. This is your safe list for sending.</li>
                    </ol>
                </div>
            </div>

            <!-- Step 3: Send -->
            <div class="step-card">
                <div class="step-header c-send">
                    <i class="bi bi-send-fill me-3 fs-3"></i> Step 3: Send (Launch Your Campaign)
                </div>
                <div class="step-body">
                    <p>The Mailer Engine is the core of the software. It uses <strong>Inbox Rotation</strong>—meaning it will automatically distribute your emails across all the SMTP accounts configured in <code>config.php</code> to bypass sending limits.</p>
                    
                    <ul class="mb-4">
                        <li><strong>From Name & Email:</strong> Enter what the recipient will see.</li>
                        <li><strong>Recipients:</strong> Paste your clean list from Step 2 here.</li>
                        <li><strong>Write your Message:</strong> Use the rich text editor to format your email.</li>
                    </ul>

                    <h5 class="fw-bold text-primary border-bottom pb-2">🔥 Advanced Mailer Features</h5>
                    
                    <div class="feature-box">
                        <h6 class="fw-bold"><i class="bi bi-arrow-split text-primary"></i> A/B Split Testing</h6>
                        <p class="mb-0 small">Not sure which subject line is better? Toggle this on. Write <strong>Variant A</strong> and <strong>Variant B</strong>. The engine will send Variant A to half your list, and Variant B to the other half. You can check which one won in the Analytics dashboard!</p>
                    </div>

                    <div class="feature-box border-left-success" style="border-left-color: #198754;">
                        <h6 class="fw-bold text-success"><i class="bi bi-magic"></i> AI Automation Tools</h6>
                        <ul class="mb-0 small ps-3">
                            <li><strong>Spam Score Checker:</strong> Click this to have Google's AI read your email and warn you if it sounds like spam before you send it.</li>
                            <li><strong>AI Variant Generator:</strong> When doing A/B testing, write Variant A, then click this button to have AI automatically write a high-converting Variant B for you.</li>
                            <li><strong>AI Hyper-Personalization:</strong> Check this box at the bottom to make the AI generate a custom, unique opening sentence for every single recipient based on their email domain.</li>
                        </ul>
                    </div>

                    <div class="feature-box border-left-warning" style="border-left-color: #ffc107;">
                        <h6 class="fw-bold text-warning"><i class="bi bi-calendar-check"></i> Automated Follow-Up (Drip Sequence)</h6>
                        <p class="mb-0 small">Toggle this on to schedule a second email. Set the wait time (e.g., 2 days). The system will automatically check if the person replied to your first email. If they didn't, it sends the follow-up!</p>
                    </div>
                </div>
            </div>

            <!-- Step 4: Analytics -->
            <div class="step-card">
                <div class="step-header c-analytics">
                    <i class="bi bi-graph-up me-3 fs-3"></i> Step 4: Analytics (Track Success)
                </div>
                <div class="step-body">
                    <p>After clicking send, wait a few hours and open the Analytics dashboard. Every email sent contains an invisible tracking pixel.</p>
                    <ul class="mb-0">
                        <li><strong>Funnel:</strong> See exactly how many people were sent the email, how many Opened it, and how many Clicked your links.</li>
                        <li><strong>A/B Winner:</strong> If you used Split Testing, the dashboard will automatically calculate which variant got more opens/clicks and award it a trophy.</li>
                        <li><strong>Recent Activity:</strong> A live feed showing exactly who is interacting with your emails right now.</li>
                    </ul>
                </div>
            </div>

            <!-- Step 5: SMS -->
            <div class="step-card mb-5">
                <div class="step-header c-sms">
                    <i class="bi bi-phone-fill me-3 fs-3"></i> SMS Engine (Mobile Outreach)
                </div>
                <div class="step-body">
                    <p>Want to reach people directly on their phones? Use the SMS Engine.</p>
                    <ol class="mb-0">
                        <li>Ensure you have created an account on <strong>Africa's Talking</strong> and pasted your API Key into <code>config.php</code>.</li>
                        <li>Paste your phone numbers (make sure they include the country code, e.g., +234 or +254).</li>
                        <li>Type your message (Keep it under 160 characters to save costs) and hit send!</li>
                    </ol>
                </div>
            </div>

        </div>
    </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
