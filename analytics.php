<?php
session_start();
require_once 'config.php';

// Security Check
if (!isset($_SESSION['authenticated']) || $_SESSION['authenticated'] !== true) {
    header("Location: index.php");
    exit();
}

$logFile = 'tracking_logs.csv';

$totalSent = 0;
$totalOpens = 0;
$totalClicks = 0;

$abData = [
    'A' => ['sent' => 0, 'open' => 0, 'click' => 0],
    'B' => ['sent' => 0, 'open' => 0, 'click' => 0]
];

$timelineData = [];
$recentEvents = [];

if (file_exists($logFile)) {
    if (($handle = fopen($logFile, "r")) !== FALSE) {
        // Skip header
        fgetcsv($handle);
        
        while (($data = fgetcsv($handle, 1000, ",")) !== FALSE) {
            if (count($data) >= 5) {
                $timestamp = $data[0];
                $trackingId = $data[1];
                $type = $data[2];
                $email = $data[3];
                $extra = $data[4];

                $date = substr($timestamp, 0, 10); // Extract YYYY-MM-DD
                
                if (!isset($timelineData[$date])) {
                    $timelineData[$date] = ['sent' => 0, 'open' => 0, 'click' => 0];
                }

                $isVariant = false;
                $variant = '';
                if (strpos($trackingId, 'A_') === 0) { $isVariant = true; $variant = 'A'; }
                elseif (strpos($trackingId, 'B_') === 0) { $isVariant = true; $variant = 'B'; }

                if ($type === 'sent') {
                    $totalSent++;
                    $timelineData[$date]['sent']++;
                    if ($isVariant) $abData[$variant]['sent']++;
                } elseif ($type === 'open') {
                    $totalOpens++;
                    $timelineData[$date]['open']++;
                    if ($isVariant) $abData[$variant]['open']++;
                } elseif ($type === 'click') {
                    $totalClicks++;
                    $timelineData[$date]['click']++;
                    if ($isVariant) $abData[$variant]['click']++;
                }

                // Add to recent events (we will reverse it later to show newest first)
                $recentEvents[] = [
                    'time' => $timestamp,
                    'type' => $type,
                    'email' => $email,
                    'extra' => $extra
                ];
            }
        }
        fclose($handle);
    }
}

// Calculations
$openRate = ($totalSent > 0) ? round(($totalOpens / $totalSent) * 100, 1) : 0;
$clickRate = ($totalOpens > 0) ? round(($totalClicks / $totalOpens) * 100, 1) : 0;

// Sort Timeline by Date
ksort($timelineData);
$labels = array_keys($timelineData);
$sents = array_column($timelineData, 'sent');
$opens = array_column($timelineData, 'open');
$clicks = array_column($timelineData, 'click');

// Reverse recent events to show newest first (limit 50)
$recentEvents = array_reverse($recentEvents);
$recentEvents = array_slice($recentEvents, 0, 50);

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <title>Advanced Analytics | <?php echo $app_name; ?></title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css">
    <!-- Chart.js -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body { background: #f4f7f6; padding: 30px 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        .metric-card { border: none; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); text-align: center; padding: 20px; background: white; }
        .metric-card h3 { font-size: 2.5rem; font-weight: 700; margin-bottom: 5px; }
        .metric-card p { color: #6c757d; font-weight: 600; text-transform: uppercase; font-size: 0.85rem; letter-spacing: 1px; margin: 0; }
        .chart-container { background: white; border-radius: 12px; padding: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); margin-bottom: 30px; }
        .table-container { background: white; border-radius: 12px; padding: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
        .badge-sent { background-color: #0d6efd; color: white; }
        .badge-open { background-color: #198754; color: white; }
        .badge-click { background-color: #ffc107; color: #000; }
    </style>
</head>
<body>

<div class="container">
    <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
            <h2 class="fw-bold mb-0"><i class="bi bi-graph-up text-primary me-2"></i>Campaign Analytics</h2>
            <p class="text-muted small">Live tracking metrics for your campaigns</p>
        </div>
        <div class="d-flex gap-2">
            <a href="history.php" class="btn btn-outline-secondary btn-sm"><i class="bi bi-journal-text me-1"></i>Raw Logs</a>
            <a href="index.php" class="btn btn-primary btn-sm"><i class="bi bi-house-door-fill me-1"></i>Dashboard</a>
        </div>
    </div>

    <!-- Top Metrics -->
    <div class="row g-3 mb-4">
        <div class="col-md">
            <div class="metric-card border-bottom border-primary border-4">
                <h3 class="text-primary"><?php echo number_format($totalSent); ?></h3>
                <p>Emails Sent</p>
            </div>
        </div>
        <div class="col-md">
            <div class="metric-card border-bottom border-success border-4">
                <h3 class="text-success"><?php echo number_format($totalOpens); ?></h3>
                <p>Total Opens</p>
            </div>
        </div>
        <div class="col-md">
            <div class="metric-card border-bottom border-info border-4">
                <h3 class="text-info"><?php echo $openRate; ?>%</h3>
                <p>Open Rate</p>
            </div>
        </div>
        <div class="col-md">
            <div class="metric-card border-bottom border-warning border-4">
                <h3 class="text-warning"><?php echo number_format($totalClicks); ?></h3>
                <p>Total Clicks</p>
            </div>
        </div>
        <div class="col-md">
            <div class="metric-card border-bottom border-danger border-4">
                <h3 class="text-danger"><?php echo $clickRate; ?>%</h3>
                <p>Click-to-Open Rate</p>
            </div>
        </div>
    </div>

    <!-- A/B Test Results -->
    <?php if ($abData['A']['sent'] > 0 || $abData['B']['sent'] > 0): 
        $rateA = ($abData['A']['sent'] > 0) ? round(($abData['A']['open'] / $abData['A']['sent']) * 100, 1) : 0;
        $rateB = ($abData['B']['sent'] > 0) ? round(($abData['B']['open'] / $abData['B']['sent']) * 100, 1) : 0;
        $winner = ($rateA > $rateB) ? 'Variant A' : (($rateB > $rateA) ? 'Variant B' : 'Tie');
    ?>
    <div class="row mb-4">
        <div class="col-12">
            <div class="chart-container border-start border-primary border-4">
                <h5 class="fw-bold mb-3"><i class="bi bi-arrow-split me-2 text-primary"></i>A/B Split Test Results</h5>
                <div class="row text-center">
                    <div class="col-md-5">
                        <div class="p-3 border rounded <?php echo $winner === 'Variant A' ? 'border-success bg-light shadow-sm' : ''; ?>">
                            <h4 class="text-primary fw-bold">Variant A <?php if($winner==='Variant A') echo '<i class="bi bi-trophy text-warning"></i> <span class="fs-6 text-success">Winner</span>'; ?></h4>
                            <p class="mb-1"><strong>Sent:</strong> <?php echo $abData['A']['sent']; ?></p>
                            <p class="mb-1"><strong>Opens:</strong> <?php echo $abData['A']['open']; ?> (<?php echo $rateA; ?>%)</p>
                            <p class="mb-0"><strong>Clicks:</strong> <?php echo $abData['A']['click']; ?></p>
                        </div>
                    </div>
                    <div class="col-md-2 d-flex align-items-center justify-content-center py-3">
                        <h4 class="text-muted fw-bold mb-0">VS</h4>
                    </div>
                    <div class="col-md-5">
                        <div class="p-3 border rounded <?php echo $winner === 'Variant B' ? 'border-success bg-light shadow-sm' : ''; ?>">
                            <h4 class="text-primary fw-bold">Variant B <?php if($winner==='Variant B') echo '<i class="bi bi-trophy text-warning"></i> <span class="fs-6 text-success">Winner</span>'; ?></h4>
                            <p class="mb-1"><strong>Sent:</strong> <?php echo $abData['B']['sent']; ?></p>
                            <p class="mb-1"><strong>Opens:</strong> <?php echo $abData['B']['open']; ?> (<?php echo $rateB; ?>%)</p>
                            <p class="mb-0"><strong>Clicks:</strong> <?php echo $abData['B']['click']; ?></p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <?php endif; ?>

    <!-- Charts -->
    <div class="row mb-4">
        <div class="col-lg-8">
            <div class="chart-container h-100">
                <h5 class="fw-bold mb-3">Timeline (Last 30 Days)</h5>
                <canvas id="timelineChart" height="100"></canvas>
            </div>
        </div>
        <div class="col-lg-4">
            <div class="chart-container h-100">
                <h5 class="fw-bold mb-3 text-center">Conversion Funnel</h5>
                <canvas id="funnelChart" height="200"></canvas>
            </div>
        </div>
    </div>

    <!-- Recent Activity -->
    <div class="table-container">
        <h5 class="fw-bold mb-3">Recent Activity</h5>
        <?php if (empty($recentEvents)): ?>
            <p class="text-muted text-center py-4">No activity recorded yet.</p>
        <?php else: ?>
            <div class="table-responsive" style="max-height: 400px; overflow-y: auto;">
                <table class="table table-hover align-middle">
                    <thead class="table-light sticky-top">
                        <tr>
                            <th>Time</th>
                            <th>Event Type</th>
                            <th>Recipient / Info</th>
                            <th>Extra Details</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($recentEvents as $event): 
                            $badgeClass = 'bg-secondary';
                            $icon = 'bi-info-circle';
                            $displayType = ucfirst($event['type']);

                            if ($event['type'] === 'sent') { $badgeClass = 'badge-sent'; $icon = 'bi-send'; }
                            if ($event['type'] === 'open') { $badgeClass = 'badge-open'; $icon = 'bi-envelope-open'; }
                            if ($event['type'] === 'click') { $badgeClass = 'badge-click'; $icon = 'bi-hand-index-thumb'; }
                        ?>
                        <tr>
                            <td class="small text-muted text-nowrap"><?php echo $event['time']; ?></td>
                            <td>
                                <span class="badge <?php echo $badgeClass; ?> py-1 px-2">
                                    <i class="bi <?php echo $icon; ?> me-1"></i><?php echo $displayType; ?>
                                </span>
                            </td>
                            <td class="fw-bold"><?php echo htmlspecialchars($event['email'] ?: 'Unknown User'); ?></td>
                            <td class="small text-muted text-truncate" style="max-width: 250px;"><?php echo htmlspecialchars($event['extra']); ?></td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        <?php endif; ?>
    </div>
</div>

<script>
    // Data from PHP
    const labels = <?php echo json_encode($labels); ?>;
    const sentData = <?php echo json_encode($sents); ?>;
    const openData = <?php echo json_encode($opens); ?>;
    const clickData = <?php echo json_encode($clicks); ?>;

    // Timeline Line Chart
    const ctxTimeline = document.getElementById('timelineChart').getContext('2d');
    new Chart(ctxTimeline, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Sent',
                    data: sentData,
                    borderColor: '#0d6efd',
                    backgroundColor: 'rgba(13, 110, 253, 0.1)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true
                },
                {
                    label: 'Opens',
                    data: openData,
                    borderColor: '#198754',
                    backgroundColor: 'rgba(25, 135, 84, 0.1)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true
                },
                {
                    label: 'Clicks',
                    data: clickData,
                    borderColor: '#ffc107',
                    backgroundColor: 'rgba(255, 193, 7, 0.1)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { position: 'top' }
            },
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 } }
            }
        }
    });

    // Funnel Doughnut Chart
    const ctxFunnel = document.getElementById('funnelChart').getContext('2d');
    new Chart(ctxFunnel, {
        type: 'doughnut',
        data: {
            labels: ['Sent', 'Opens', 'Clicks'],
            datasets: [{
                data: [
                    <?php echo $totalSent; ?>, 
                    <?php echo $totalOpens; ?>, 
                    <?php echo $totalClicks; ?>
                ],
                backgroundColor: ['#0d6efd', '#198754', '#ffc107'],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            cutout: '65%',
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
</script>

</body>
</html>
