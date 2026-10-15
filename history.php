<?php
session_start();
require_once 'config.php';

// 1. Security Check
if (!isset($_SESSION['authenticated']) || $_SESSION['authenticated'] !== true) {
    header("Location: index.php");
    exit();
}

// 2. Expiry Check
if (time() > strtotime($expiry_date)) {
    die("Access Expired.");
}

$logFile = 'sent_history.log';
$logs = [];

// 3. Clear Log Logic
if (isset($_POST['clear_log'])) {
    file_put_contents($logFile, "");
    header("Location: history.php");
    exit();
}

// 4. Read Log File
if (file_exists($logFile)) {
    $fileData = file($logFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    $logs = array_reverse($fileData);
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <title>Transmission History | <?php echo $app_name; ?></title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body { background: #f8f9fa; padding: 40px 0; }
        .card { border: none; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
        .badge-success { background-color: #d1e7dd; color: #0f5132; }
        .badge-danger { background-color: #f8d7da; color: #842029; }
    </style>
</head>
<body>

<div class="container">
    <div class="row justify-content-center">
        <div class="col-lg-11">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h3 class="mb-0">Transmission History</h3>
                    <p class="text-muted small mb-0">Live logs from <code>sent_history.log</code></p>
                </div>
                <div class="d-flex">
                    <a href="index.php" class="btn btn-outline-primary me-2">Back to Mailer</a>
                    <form method="POST" onsubmit="return confirm('Are you sure you want to clear all history?');">
                        <button type="submit" name="clear_log" class="btn btn-outline-danger">Clear Logs</button>
                    </form>
                </div>
            </div>

            <div class="card p-4">
                <?php if (empty($logs)): ?>
                    <div class="text-center py-5 text-muted">History is currently empty.</div>
                <?php else: ?>
                    <div class="table-responsive">
                        <table class="table table-hover align-middle">
                            <thead class="table-light">
                                <tr>
                                    <th>Timestamp</th>
                                    <th>Status</th>
                                    <th>Recipient</th>
                                    <th>Subject</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php 
                                foreach ($logs as $line) {
                                    // Parsing: [Timestamp] Status | To: Email | Sub: Subject
                                    if (preg_match('/\[(.*?)\] (.*?) \| To: (.*?) \| Sub: (.*)/', $line, $m)) {
                                        $statusClass = (strpos($m[2], 'Success') !== false) ? 'badge-success' : 'badge-danger';
                                        echo "<tr>";
                                        echo "<td class='small text-muted'>{$m[1]}</td>";
                                        echo "<td><span class='badge {$statusClass}'>{$m[2]}</span></td>";
                                        echo "<td class='fw-bold'>".htmlspecialchars($m[3])."</td>";
                                        echo "<td>".htmlspecialchars($m[4])."</td>";
                                        echo "</tr>";
                                    }
                                }
                                ?>
                            </tbody>
                        </table>
                    </div>
                <?php endif; ?>
            </div>
        </div>
    </div>
</div>

</body>
</html>