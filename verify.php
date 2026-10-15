<?php
session_start();
require_once 'config.php';

// Security Check
if (!isset($_SESSION['authenticated']) || $_SESSION['authenticated'] !== true) {
    header("Location: index.php");
    exit();
}

$results = [];
$cleanList = "";
$roleBasedPrefixes = ['admin', 'info', 'sales', 'support', 'contact', 'billing', 'hello', 'marketing'];

if ($_SERVER["REQUEST_METHOD"] == "POST" && !empty($_POST['emailList'])) {
    $rawList = explode("\n", $_POST['emailList']);
    $emails = array_filter(array_map('trim', $rawList));

    foreach ($emails as $email) {
        $status = "Invalid Format";
        $isSafe = false;
        $statusClass = 'status-dead';

        // Layer 1: Syntax Validation
        if (filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $parts = explode("@", $email);
            $localPart = strtolower($parts[0]);
            $domain = $parts[1];
            
            // Layer 2: DNS MX Record Check
            if (checkdnsrr($domain, "MX")) {
                // Layer 3: Role-based email check
                if (in_array($localPart, $roleBasedPrefixes)) {
                    $status = "Safe (Role-Based/Generic)";
                    $isSafe = true;
                    $statusClass = 'status-warning';
                } else {
                    $status = "Safe (Domain Verified)";
                    $isSafe = true;
                    $statusClass = 'status-safe';
                }
                $cleanList .= $email . PHP_EOL;
            } else {
                $status = "Dead Domain (No MX Records)";
            }
        }

        $results[] = ['email' => $email, 'status' => $status, 'safe' => $isSafe, 'class' => $statusClass];
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <title>Email List Verifier | <?php echo $app_name; ?></title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body { background: #f8f9fa; padding: 40px 0; }
        .card { border: none; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
        .status-safe { color: #198754; font-weight: bold; }
        .status-warning { color: #fd7e14; font-weight: bold; }
        .status-dead { color: #dc3545; }
    </style>
</head>
<body>
<div class="container">
    <div class="row justify-content-center">
        <div class="col-lg-10">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h3>List Verifier</h3>
                <a href="index.php" class="btn btn-primary">Back to Mailer</a>
            </div>

            <!-- Usefulness Explanation -->
            <div class="alert alert-info shadow-sm rounded border-0 mb-4">
                <h5 class="alert-heading fw-bold">Why use the Verifier?</h5>
                <p class="mb-1"><strong>1. Protects Sender Reputation:</strong> Removes improperly formatted emails and domains that do not exist (No MX records), preventing hard bounces that ruin your email deliverability score.</p>
                <p class="mb-1"><strong>2. Flags Role-Based Emails:</strong> Identifies generic addresses (like info@, admin@) which often have lower engagement or lead to spam traps.</p>
                <p class="mb-0 small text-muted"><em>Note: To prevent your IP from being blacklisted, it does not do invasive mailbox-level (SMTP VRFY) checks, as many modern mail servers block these or use catch-all configurations.</em></p>
            </div>

            <div class="card p-4 mb-4">
                <form method="POST">
                    <label class="form-label fw-bold">Paste Raw Email List (One per line)</label>
                    <textarea name="emailList" class="form-control mb-3" rows="8" placeholder="user@example.com..."></textarea>
                    <button type="submit" class="btn btn-success w-100 py-2 fw-bold">VERIFY LIST</button>
                </form>
            </div>

            <?php if (!empty($results)): ?>
            <div class="row">
                <div class="col-md-7">
                    <div class="card p-3">
                        <h5>Verification Results</h5>
                        <div style="max-height: 400px; overflow-y: auto;">
                            <table class="table table-sm mt-2">
                                <thead><tr><th>Email</th><th>Status</th></tr></thead>
                                <tbody>
                                    <?php foreach ($results as $res): ?>
                                    <tr>
                                        <td><?php echo htmlspecialchars($res['email']); ?></td>
                                        <td class="<?php echo $res['class']; ?>">
                                            <?php echo $res['status']; ?>
                                        </td>
                                    </tr>
                                    <?php endforeach; ?>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                <div class="col-md-5">
                    <div class="card p-3 bg-dark text-white">
                        <h5>Cleaned List</h5>
                        <p class="small text-secondary">Copy this into the mailer.</p>
                        <textarea class="form-control bg-dark text-success border-secondary" rows="12" readonly><?php echo htmlspecialchars($cleanList); ?></textarea>
                    </div>
                </div>
            </div>
            <?php endif; ?>
        </div>
    </div>
</div>
</body>
</html>