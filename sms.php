<?php
session_start();
require_once 'config.php';

// Security Check
if (!isset($_SESSION['authenticated']) || $_SESSION['authenticated'] !== true) {
    header("Location: index.php");
    exit();
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <title>SMS Broadcasting Engine | <?php echo $app_name; ?></title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css">

    <style>
        body { background: #f8f9fa; padding: 30px 0; }
        .card { border: none; border-radius: 15px; box-shadow: 0 4px 25px rgba(0,0,0,0.1); }
        .card-header { background: #28a745; color: white; border-radius: 15px 15px 0 0 !important; }
        #responseLog { height: 200px; overflow-y: auto; background: #222; color: #0f0; padding: 15px; border-radius: 8px; font-family: 'Courier New', monospace; font-size: 0.85rem; }
    </style>
</head>
<body>

<div class="container">
    <div class="row justify-content-center">
        <div class="col-lg-8">
            <div class="card">
                <div class="card-header d-flex justify-content-between align-items-center py-3">
                    <h4 class="mb-0"><i class="bi bi-phone-fill me-2"></i>SMS Broadcasting Engine</h4>
                    <div class="d-flex gap-2">
                        <a href="beta/?session=active#/sms" class="btn btn-sm btn-warning text-dark fw-bold"><i class="bi bi-stars me-1"></i>Try Beta SMS</a>
                        <a href="index.php" class="btn btn-sm btn-light text-success fw-bold">Back to Dashboard</a>
                    </div>
                </div>
                <div class="card-body p-4">
                    
                    <div class="alert alert-success border-0 shadow-sm mb-4">
                        <i class="bi bi-info-circle-fill me-2"></i> Powered by <strong>Africa's Talking</strong>. Ensure your API keys are set in <code>config.php</code>.
                    </div>

                    <form id="smsForm">
                        <div class="row g-3">
                            <div class="col-12">
                                <label class="form-label fw-bold">Recipients (Phone Numbers)</label>
                                <textarea name="toNumbers" id="toNumbers" class="form-control" rows="4" placeholder="+254711XXXYYY, +254733XXXYYY&#10;(Include country code, multiple numbers separated by commas or newlines)" required></textarea>
                                <div class="form-text">Numbers must include the country code (e.g. +234 or +254).</div>
                            </div>

                            <div class="col-12">
                                <label class="form-label fw-bold d-flex justify-content-between">
                                    <span>Message</span>
                                    <span id="charCount" class="text-muted fw-normal small">0 / 160 chars (1 SMS)</span>
                                </label>
                                <textarea name="smsMessage" id="smsMessage" class="form-control" rows="4" required></textarea>
                            </div>

                            <div class="col-12 mt-4">
                                <button type="submit" id="submitBtn" class="btn btn-success w-100 py-3 fw-bold shadow-sm">
                                    <i class="bi bi-broadcast me-2"></i> LAUNCH SMS BROADCAST
                                </button>
                            </div>
                        </div>
                    </form>

                    <div id="progressArea" class="mt-4 d-none">
                        <hr>
                        <h6 class="fw-bold text-success mb-2"><i class="bi bi-gear-wide-connected spin"></i> Transmission Log</h6>
                        <div id="responseLog"></div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<script>
    // Character Counter
    const smsText = document.getElementById('smsMessage');
    const charCount = document.getElementById('charCount');
    
    smsText.addEventListener('input', function() {
        const len = this.value.length;
        const parts = Math.ceil(len / 160) || 1;
        charCount.innerHTML = `${len} chars (${parts} SMS)`;
    });

    // Form Submission
    document.getElementById('smsForm').onsubmit = async function(e) {
        e.preventDefault();
        const btn = document.getElementById('submitBtn');
        const log = document.getElementById('responseLog');
        const progressArea = document.getElementById('progressArea');
        
        if(!confirm("Are you sure you want to blast this SMS? Costs will apply to your Africa's Talking account.")) return;

        btn.disabled = true;
        btn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> Sending...';
        progressArea.classList.remove('d-none');
        log.innerHTML = "Initializing Africa's Talking Gateway...\n";

        try {
            const formData = new FormData(this);
            const response = await fetch('sms_sender.php', { method: 'POST', body: formData });
            const resultText = await response.text();
            
            log.innerHTML += resultText;
            log.scrollTop = log.scrollHeight; // Auto-scroll
        } catch (err) {
            log.innerHTML += "\n❌ Network Error: Could not reach sms_sender.php\n";
        }
        
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-broadcast me-2"></i> LAUNCH SMS BROADCAST';
    };
</script>

</body>
</html>
