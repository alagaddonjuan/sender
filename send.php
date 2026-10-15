<?php
session_start();
require_once 'config.php';

// 1. Security Check
if (!isset($_SESSION['authenticated']) || $_SESSION['authenticated'] !== true) {
    header("Location: index.php");
    exit();
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <title>Smart Mailer | <?php echo $app_name; ?></title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" type="text/css" href="simditor/css/simditor.css" />
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css">

    <style>
        body { background: #f8f9fa; padding: 30px 0; }
        .card { border: none; border-radius: 15px; box-shadow: 0 4px 25px rgba(0,0,0,0.1); }
        .card-header { background: #0d6efd; color: white; border-radius: 15px 15px 0 0 !important; }
        #responseLog { height: 180px; overflow-y: auto; background: #222; color: #0f0; padding: 15px; border-radius: 8px; font-family: 'Courier New', monospace; font-size: 0.85rem; }
        .progress { height: 25px; border-radius: 10px; }
    </style>
</head>
<body>

<div class="container">
    <div class="row justify-content-center">
        <div class="col-lg-9">
            <div class="card">
                <div class="card-header d-flex justify-content-between align-items-center py-3">
                    <h4 class="mb-0"><i class="bi bi-send-fill me-2"></i>Smart Mailer Engine</h4>
                    <a href="index.php" class="btn btn-sm btn-light">Back to Dashboard</a>
                </div>
                <div class="card-body p-4">
                    <form id="mailerForm" enctype="multipart/form-data">
                        <div class="row g-3">
                            <div class="col-md-6">
                                <label class="form-label fw-bold">From Name</label>
                                <input type="text" name="fromName" class="form-control" placeholder="Q4" required>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label fw-bold">From Email</label>
                                <input type="email" name="fromEmail" class="form-control" placeholder="info@q4iltd.com" required>
                            </div>

                            <div class="col-12">
                                <label class="form-label fw-bold">Recipients (Multiple emails per line supported)</label>
                                <textarea name="toEmail" id="toEmail" class="form-control" rows="5" placeholder="customer1@example.com, customer2@example.com" required></textarea>
                            </div>

                            <div id="estimateArea" class="col-12 d-none">
                                <div class="alert alert-secondary py-2 border-0 shadow-sm d-flex justify-content-between align-items-center">
                                    <span><i class="bi bi-people-fill me-2"></i><strong id="emailCount">0</strong> Emails</span>
                                    <span><i class="bi bi-stopwatch me-2"></i>Est. Time: <strong id="timeEst">0m</strong></span>
                                </div>
                            </div>

                            <div class="col-12 text-end">
                                <button type="button" class="btn btn-sm btn-link text-decoration-none" onclick="document.getElementById('optFields').classList.toggle('d-none')">
                                    <i class="bi bi-plus-circle me-1"></i> CC, BCC, & Reply-To Options
                                </button>
                                <div id="optFields" class="row g-2 mt-1 d-none text-start p-3 bg-light border rounded">
                                    <div class="col-12 mb-2"><label class="small fw-bold">Reply-To Address</label><input type="email" name="replyToEmail" class="form-control"></div>
                                    <div class="col-md-6"><label class="small fw-bold">CC (Multiple per line supported)</label><textarea name="cc" class="form-control" rows="2"></textarea></div>
                                    <div class="col-md-6"><label class="small fw-bold">BCC (Multiple per line supported)</label><textarea name="bcc" class="form-control" rows="2"></textarea></div>
                                </div>
                            </div>

                            <div class="col-12 mt-2 border-bottom pb-3">
                                <div class="form-check form-switch fs-5">
                                    <input class="form-check-input" type="checkbox" id="enableABTesting" name="enableABTesting" value="1">
                                    <label class="form-check-label fw-bold text-primary" for="enableABTesting">
                                        <i class="bi bi-arrow-split"></i> Enable A/B Split Testing
                                    </label>
                                    <div class="form-text fs-6">Automatically split your list 50/50 to test two different email variants.</div>
                                </div>
                            </div>
                            
                            <div class="col-12" id="variantAContainer">
                                <h5 class="mt-2 mb-2 text-primary fw-bold">Variant A</h5>
                                <label class="form-label fw-bold">Subject Line (A)</label>
                                <input type="text" name="subjectLine" class="form-control" required>
                                
                                <div class="d-flex justify-content-between align-items-center mb-2 mt-3">
                                    <label class="form-label fw-bold mb-0">Message Content (A)</label>
                                    <button type="button" id="analyzeSpamBtn" class="btn btn-sm btn-outline-warning fw-bold">
                                        <i class="bi bi-shield-check"></i> Analyze Spam Score with AI
                                    </button>
                                </div>
                                <div id="spamResults" class="alert d-none"></div>
                                <textarea id="editor" name="richMessageText"></textarea>
                            </div>

                            <div class="col-12 d-none p-4 mt-3 border border-2 border-primary rounded bg-light shadow-sm" id="variantBContainer">
                                <div class="d-flex justify-content-between align-items-center mb-3">
                                    <h5 class="mb-0 text-primary fw-bold"><i class="bi bi-envelope-paper"></i> Variant B</h5>
                                    <button type="button" id="aiGenerateVariantBtn" class="btn btn-sm btn-success fw-bold">
                                        <i class="bi bi-magic"></i> Auto-Generate with AI
                                    </button>
                                </div>
                                <label class="form-label fw-bold">Subject Line (B)</label>
                                <input type="text" name="subjectLineB" class="form-control" id="subjectLineB">
                                
                                <label class="form-label fw-bold mb-2 mt-3">Message Content (B)</label>
                                <textarea id="editorB" name="richMessageTextB"></textarea>
                            </div>
                            
                            <div class="col-12 mt-2 border-bottom pb-3">
                                <div class="form-check form-switch fs-5">
                                    <input class="form-check-input" type="checkbox" id="enableFollowUp" name="enableFollowUp" value="1">
                                    <label class="form-check-label fw-bold text-success" for="enableFollowUp">
                                        <i class="bi bi-calendar-check"></i> Enable Automated Follow-Up (Drip Sequence)
                                    </label>
                                    <div class="form-text fs-6">If the recipient doesn't reply to the first email, automatically send this follow-up after a set number of days. (Requires IMAP Configured)</div>
                                </div>
                            </div>

                            <div class="col-12 d-none p-4 mt-3 border border-2 border-success rounded bg-light shadow-sm" id="followUpContainer">
                                <h5 class="mb-3 text-success fw-bold"><i class="bi bi-clock-history"></i> Follow-Up Email</h5>
                                <div class="row g-2 mb-3">
                                    <div class="col-md-6">
                                        <label class="form-label fw-bold">Wait Time (Days)</label>
                                        <input type="number" name="followUpDays" class="form-control" id="followUpDays" min="1" value="2">
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label fw-bold">Follow-Up Subject Line</label>
                                        <input type="text" name="followUpSubject" class="form-control" id="followUpSubject" placeholder="Re: Quick question...">
                                    </div>
                                </div>
                                <label class="form-label fw-bold mb-2">Follow-Up Message Content</label>
                                <textarea id="editorFollowUp" name="richFollowUpText"></textarea>
                            </div>

                            <div class="col-12 mt-3">
                                <label class="form-label fw-bold">Attachment</label>
                                <input type="file" name="attachment" class="form-control">
                            </div>

                            <div class="col-12">
                                <div class="form-check mb-2">
                                    <input class="form-check-input" type="checkbox" id="terms">
                                    <label class="form-check-label" for="terms">I confirm this is an authorized professional broadcast.</label>
                                </div>
                                <div class="form-check mb-3">
                                    <input class="form-check-input" type="checkbox" name="enableAiPersonalization" id="enableAiPersonalization" value="1">
                                    <label class="form-check-label fw-bold text-success" for="enableAiPersonalization">
                                        <i class="bi bi-magic"></i> Enable AI Hyper-Personalization (Gemini Pro)
                                    </label>
                                    <div class="form-text mt-0">Dynamically generates a custom opening sentence for each recipient based on their email domain.</div>
                                </div>
                                <button type="submit" id="submitBtn" class="btn btn-primary w-100 py-3 fw-bold shadow-sm" disabled>
                                    LAUNCH MAILER ENGINE
                                </button>
                            </div>
                        </div>
                    </form>

                    <div id="progressArea" class="mt-4" style="display:none;">
                        <hr>
                        <div class="d-flex justify-content-between mb-2">
                            <span class="fw-bold text-primary"><i class="bi bi-gear-wide-connected spin"></i> Transmission Progress</span>
                            <span id="perc" class="fw-bold">0%</span>
                        </div>
                        <div class="progress mb-3">
                            <div id="pbar" class="progress-bar progress-bar-striped progress-bar-animated" style="width: 0%;"></div>
                        </div>
                        <div class="alert alert-info py-2 small mb-3 border-0 shadow-sm">
                            <i class="bi bi-info-circle-fill text-info me-1"></i> <strong>Open & Click Tracking is Active.</strong> Analytics are being recorded to <code>tracking_logs.csv</code> in the application directory.
                        </div>
                        <div id="responseLog"></div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
<script src="simditor/js/module.js"></script>
<script src="simditor/js/hotkeys.js"></script>
<script src="simditor/js/simditor.js"></script>

<script>
    // 1. Initialize Rich Text Editor
    var editor = new Simditor({ textarea: $('#editor') });
    var editorB = new Simditor({ textarea: $('#editorB') });
    var editorFollowUp = new Simditor({ textarea: $('#editorFollowUp') });

    // A/B Toggle Logic
    document.getElementById('enableABTesting').addEventListener('change', function() {
        const varB = document.getElementById('variantBContainer');
        const subjB = document.getElementById('subjectLineB');
        if (this.checked) {
            varB.classList.remove('d-none');
            subjB.setAttribute('required', 'required');
        } else {
            varB.classList.add('d-none');
            subjB.removeAttribute('required');
        }
    });

    // Follow-up Toggle Logic
    document.getElementById('enableFollowUp').addEventListener('change', function() {
        const followUp = document.getElementById('followUpContainer');
        const fSubj = document.getElementById('followUpSubject');
        if (this.checked) {
            followUp.classList.remove('d-none');
            fSubj.setAttribute('required', 'required');
        } else {
            followUp.classList.add('d-none');
            fSubj.removeAttribute('required');
        }
    });

    // 2. Terms Checkbox Toggle
    document.getElementById('terms').onchange = function() { 
        document.getElementById('submitBtn').disabled = !this.checked; 
    };

    // 3. Live Time & Count Estimator
    const toEmailArea = document.getElementById('toEmail');
    const estimateArea = document.getElementById('estimateArea');
    const emailCountDisplay = document.getElementById('emailCount');
    const timeEstDisplay = document.getElementById('timeEst');

    const smtpCount = <?php echo count($smtp_accounts); ?>; // Pulls count from config.php

    toEmailArea.addEventListener('input', function() {
    const emails = this.value.split(/[\n,;\s]+/).filter(e => e.trim() !== "");
    const count = emails.length;

    if (count > 0) {
        estimateArea.classList.remove('d-none');
        emailCountDisplay.innerText = count;

        // Calculate delay based on combined capacity (AccCount * 55 per hour)
        const hourlyCapacity = smtpCount * 55;
        const delay = (count > hourlyCapacity) ? Math.floor(3600 / hourlyCapacity) : 2; 
        const totalSeconds = count * delay;

        if (totalSeconds < 3600) {
            timeEstDisplay.innerText = Math.ceil(totalSeconds / 60) + "m";
        } else {
            timeEstDisplay.innerText = (totalSeconds / 3600).toFixed(1) + "h";
        }
    } else {
        estimateArea.classList.add('d-none');
    }
});

    // 4. AJAX Transmission Logic (Modern ReadableStream)
    document.getElementById('mailerForm').onsubmit = async function(e) {
        e.preventDefault();
        const btn = document.getElementById('submitBtn');
        const log = document.getElementById('responseLog');
        const pbar = document.getElementById('pbar');
        const perc = document.getElementById('perc');
        
        if(!confirm("Are you sure you want to start this broadcast?")) return;

        btn.disabled = true;
        document.getElementById('progressArea').style.display = 'block';
        log.innerHTML = "Establishing secure SMTP link...\n";

        try {
            const response = await fetch('mailer.php', { method: 'POST', body: new FormData(this) });
            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');
                
                lines.forEach(line => {
                    if (line.startsWith("PROGRESS:")) {
                        // Format: PROGRESS:50|SENT:user@email.com
                        const parts = line.replace("PROGRESS:", "").split("|SENT:");
                        const pValue = parts[0];
                        const email = parts[1];

                        pbar.style.width = pValue + "%";
                        perc.innerHTML = pValue + "%";
                        log.innerHTML += "✓ Transmission Successful: " + email + "\n";
                        log.scrollTop = log.scrollHeight; // Auto-scroll
                    } 
                    else if (line.startsWith("SUMMARY:")) {
                        log.innerHTML += "\n--- BATCH COMPLETED ---\n" + line.replace("SUMMARY:", "") + "\n";
                        btn.disabled = false;
                    } 
                    else if (line.startsWith("ERROR:")) {
                        log.innerHTML += "❌ ENGINE ERROR: " + line.replace("ERROR:", "") + "\n";
                        btn.disabled = false;
                    }
                });
            }
        } catch (err) {
            log.innerHTML += "❌ Network Error: Could not reach mailer.php\n";
            btn.disabled = false;
        }
    };
    // 5. AI Spam Checker Logic
    document.getElementById('analyzeSpamBtn').addEventListener('click', async function() {
        const btn = this;
        const resultsArea = document.getElementById('spamResults');
        const subject = document.querySelector('input[name="subjectLine"]').value;
        const body = editor.getValue();

        if (!subject && !body) {
            alert("Please enter a subject line and message content before analyzing.");
            return;
        }

        btn.disabled = true;
        btn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> Analyzing...';
        resultsArea.classList.add('d-none');
        resultsArea.classList.remove('alert-success', 'alert-warning', 'alert-danger');

        try {
            const formData = new FormData();
            formData.append('subject', subject);
            formData.append('body', body);

            const response = await fetch('spam_checker.php', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.error) {
                resultsArea.classList.add('alert-danger');
                resultsArea.innerHTML = '<strong>Error:</strong> ' + data.error;
            } else {
                // Determine color based on score
                if (data.score < 30) resultsArea.classList.add('alert-success');
                else if (data.score < 70) resultsArea.classList.add('alert-warning');
                else resultsArea.classList.add('alert-danger');

                let html = `<h5><i class="bi bi-shield-check"></i> Spam Score: ${data.score}/100 (${data.risk_level} Risk)</h5>`;
                if (data.suggestions && data.suggestions.length > 0) {
                    html += `<ul class="mb-2 mt-2">`;
                    data.suggestions.forEach(s => html += `<li>${s}</li>`);
                    html += `</ul>`;
                }
                
                if (data.rewritten_subject && data.rewritten_body) {
                    html += `<hr><div class="mt-2">
                        <p class="mb-1 fw-bold text-success"><i class="bi bi-magic"></i> AI Suggested Rewrite (Safe for Inbox):</p>
                        <div class="p-2 bg-light text-dark rounded border mb-2 small">
                            <strong>Subject:</strong> ${data.rewritten_subject}<br>
                            <strong>Body:</strong><br> ${data.rewritten_body.replace(/\n/g, '<br>')}
                        </div>
                        <button type="button" id="applyRewriteBtn" class="btn btn-sm btn-success fw-bold shadow-sm">
                            <i class="bi bi-check-circle"></i> Apply This Rewrite
                        </button>
                    </div>`;
                }

                resultsArea.innerHTML = html;
                
                // Add event listener for the Apply button
                const applyBtn = document.getElementById('applyRewriteBtn');
                if (applyBtn) {
                    applyBtn.addEventListener('click', function() {
                        document.querySelector('input[name="subjectLine"]').value = data.rewritten_subject;
                        editor.setValue(data.rewritten_body.replace(/\n/g, '<br>'));
                        resultsArea.classList.add('d-none');
                    });
                }
            }
            resultsArea.classList.remove('d-none');
        } catch (error) {
            resultsArea.classList.add('alert-danger');
            resultsArea.innerHTML = '<strong>Error:</strong> Could not connect to AI service.';
            resultsArea.classList.remove('d-none');
        }

            btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-shield-check"></i> Analyze Spam Score with AI';
    });

    // 6. AI A/B Variant Generator Logic
    const aiGenBtn = document.getElementById('aiGenerateVariantBtn');
    if (aiGenBtn) {
        aiGenBtn.addEventListener('click', async function() {
            const subjectA = document.querySelector('input[name="subjectLine"]').value;
            const bodyA = editor.getValue();
            
            if (!subjectA && !bodyA) {
                alert("Please write Variant A's subject and message first so AI has something to base the variant on.");
                return;
            }
            
            this.disabled = true;
            const originalHtml = this.innerHTML;
            this.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> Generating Variant B...';
            
            try {
                const formData = new FormData();
                formData.append('subject', subjectA);
                formData.append('body', bodyA);
                
                const response = await fetch('ai_variant.php', { method: 'POST', body: formData });
                const data = await response.json();
                
                if (data.error) {
                    alert('Error: ' + data.error);
                } else {
                    document.getElementById('subjectLineB').value = data.variant_subject;
                    editorB.setValue(data.variant_body.replace(/\n/g, '<br>'));
                }
            } catch (err) {
                alert('Network Error connecting to AI service.');
            }
            
            this.disabled = false;
            this.innerHTML = originalHtml;
        });
    }
</script>

</body>
</html>