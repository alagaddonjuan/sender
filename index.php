<?php
session_start();
require_once 'config.php';
if (isset($_GET['logout'])) { session_destroy(); header("Location: index.php"); exit(); }
if (!isset($_SESSION['authenticated']) || $_SESSION['authenticated'] !== true) {
?>
<!DOCTYPE html>
<html>
<head>
    <title>Login | <?php echo $app_name; ?></title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>body { background: #f4f7f6; display: flex; align-items: center; height: 100vh; }</style>
</head>
<body>
    <div class="container text-center">
        <div class="card shadow-sm mx-auto p-4" style="max-width: 350px;">
            <h4 class="mb-4"><?php echo $app_name; ?></h4>
            <form action="login.php" method="POST">
                <input type="password" name="password" class="form-control mb-3" placeholder="Access Password" required>
                <button type="submit" class="btn btn-primary w-100">Unlock Engine</button>
            </form>
        </div>
    </div>
</body>
</html>
<?php exit(); } ?>

<?php
session_start();
require_once 'config.php';

// 1. HANDLE LOGOUT
if (isset($_GET['logout'])) {
    session_destroy();
    header("Location: index.php");
    exit();
}

// 2. CHECK EXPIRY (Safety Lock)
if (time() > strtotime($expiry_date)) {
    die("<div style='text-align:center; margin-top:50px; font-family:sans-serif;'>
            <h1 style='color:red;'>Access Expired</h1>
            <p>This software license expired on $expiry_date. Please contact Q4 for renewal.</p>
         </div>");
}

// 3. AUTHENTICATION GATE (Login Form)
if (!isset($_SESSION['authenticated']) || $_SESSION['authenticated'] !== true) {
    ?>
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Login | <?php echo $app_name; ?></title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
        <style>
            body { background: #f4f7f6; height: 100vh; display: flex; align-items: center; justify-content: center; }
            .login-card { border: none; border-radius: 15px; width: 350px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
        </style>
    </head>
    <body>
        <div class="card login-card p-4">
            <div class="text-center mb-4">
                <h4 class="fw-bold text-primary"><?php echo $app_name; ?></h4>
                <p class="text-muted small">Enter your password to unlock the engine</p>
            </div>
            <form action="login.php" method="POST">
                <div class="mb-3">
                    <input type="password" name="password" class="form-control" placeholder="Secret Password" required autofocus>
                </div>
                <button type="submit" class="btn btn-primary w-100 py-2 fw-bold">UNLOCK ENGINE</button>
            </form>
            <div class="text-center mt-3 pt-3 border-top">
                <a href="beta/#/login" class="text-decoration-none small text-primary fw-semibold">
                    <i class="bi bi-stars text-warning me-1"></i>Try New React Beta Version &rarr;
                </a>
            </div>
            <?php if(isset($_GET['error'])): ?>
                <div class="alert alert-danger mt-3 py-2 small text-center">Invalid Password</div>
            <?php endif; ?>
        </div>
    </body>
    </html>
    <?php
    exit();
}

// 4. THE MAIN DASHBOARD (If Logged In)
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard | <?php echo $app_name; ?></title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css">
    <style>
        body { background: #f8f9fa; padding: 60px 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        .tool-card { border: none; border-radius: 20px; transition: all 0.3s ease; text-decoration: none; color: inherit; overflow: hidden; }
        .tool-card:hover { transform: translateY(-10px); box-shadow: 0 15px 35px rgba(0,0,0,0.1); color: inherit; }
        .icon-box { width: 70px; height: 70px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; }
        .bg-gradient-blue { background: linear-gradient(45deg, #0d6efd, #0dcaf0); }
        .bg-gradient-green { background: linear-gradient(45deg, #198754, #20c997); }
        .bg-gradient-dark { background: linear-gradient(45deg, #212529, #495057); }
    </style>
</head>
<body>

<div class="container">
    <div class="row justify-content-center text-center mb-4">
        <div class="col-md-8">
            <h1 class="display-5 fw-bold text-dark">Welcome to Q4 Campaign Manager</h1>
            <p class="lead text-muted">Select a module to begin your professional mailing session.</p>
            <hr class="w-25 mx-auto border-2 border-primary mb-0">
        </div>
    </div>

    <!-- Beta Version Switch Banner -->
    <div class="row justify-content-center mb-4">
        <div class="col-lg-10">
            <div class="card border-0 shadow-sm rounded-4 overflow-hidden" style="background: linear-gradient(135deg, #1e293b, #0f172a); color: white;">
                <div class="card-body p-4 d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
                    <div class="d-flex align-items-center">
                        <div class="me-3 p-3 rounded-circle" style="background: rgba(59, 130, 246, 0.2);">
                            <i class="bi bi-rocket-takeoff-fill fs-2 text-warning"></i>
                        </div>
                        <div>
                            <div class="d-flex align-items-center gap-2">
                                <h5 class="fw-bold mb-0">Modern Single Page App (Beta)</h5>
                                <span class="badge bg-warning text-dark fw-bold px-2 py-1">BETA</span>
                            </div>
                            <p class="text-light opacity-75 mb-0 small">
                                Experience our new React 18 + TypeScript frontend with live streaming controls, interactive analytics, and instant tab transitions.
                            </p>
                        </div>
                    </div>
                    <div class="d-flex gap-2">
                        <a href="beta/?session=active#/" class="btn btn-warning text-dark fw-bold px-4 py-2 rounded-pill shadow-sm text-nowrap">
                            <i class="bi bi-stars me-1"></i>Launch Beta Version &rarr;
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="row g-4 justify-content-center">
        <div class="col-md-6 col-lg-4">
            <a href="scraper.php" class="card tool-card h-100 p-4 shadow-sm">
                <div class="icon-box bg-gradient-blue text-white">
                    <i class="bi bi-search fs-1"></i>
                </div>
                <h4 class="fw-bold text-center">Step 1: Scrape</h4>
                <p class="text-center text-muted small">Extract highly targeted emails from search engines using keywords and tags.</p>
                <div class="mt-auto text-center"><span class="btn btn-sm btn-outline-primary rounded-pill">Open Scraper</span></div>
            </a>
        </div>

        <div class="col-md-6 col-lg-4">
            <a href="verify.php" class="card tool-card h-100 p-4 shadow-sm">
                <div class="icon-box bg-gradient-green text-white">
                    <i class="bi bi-shield-check fs-1"></i>
                </div>
                <h4 class="fw-bold text-center">Step 2: Verify</h4>
                <p class="text-center text-muted small">Clean your raw list and check MX records to prevent "Max Defers" and server blocks.</p>
                <div class="mt-auto text-center"><span class="btn btn-sm btn-outline-success rounded-pill">Open Verifier</span></div>
            </a>
        </div>

        <div class="col-md-6 col-lg-4">
            <a href="send.php" class="card tool-card h-100 p-4 shadow-sm">
                <div class="icon-box bg-gradient-blue text-white">
                    <i class="bi bi-send-fill fs-1"></i>
                </div>
                <h4 class="fw-bold text-center">Step 3: Send</h4>
                <p class="text-center text-muted small">Launch your campaign with intelligent throttling, BCC/CC support, and live progress.</p>
                <div class="mt-auto text-center"><span class="btn btn-sm btn-outline-primary rounded-pill">Open Mailer</span></div>
            </a>
        </div>

        <div class="col-md-6 col-lg-4">
            <a href="analytics.php" class="card tool-card h-100 p-4 shadow-sm">
                <div class="icon-box bg-gradient-dark text-white">
                    <i class="bi bi-graph-up fs-1"></i>
                </div>
                <h4 class="fw-bold text-center">Step 4: Analytics</h4>
                <p class="text-center text-muted small">Visually track open rates, clicks, and conversion funnels in real-time.</p>
                <div class="mt-auto text-center"><span class="btn btn-sm btn-outline-dark rounded-pill">View Analytics</span></div>
            </a>
        </div>

        <div class="col-md-6 col-lg-4">
            <a href="sms.php" class="card tool-card h-100 p-4 shadow-sm" style="border: 2px solid #198754;">
                <div class="icon-box bg-gradient-green text-white">
                    <i class="bi bi-phone-fill fs-1"></i>
                </div>
                <h4 class="fw-bold text-center text-success">SMS Engine</h4>
                <p class="text-center text-muted small">Broadcast bulk SMS messages directly to phone numbers via Africa's Talking API.</p>
                <div class="mt-auto text-center"><span class="btn btn-sm btn-success rounded-pill">Open SMS Broadcaster</span></div>
            </a>
        </div>

        <div class="col-md-6 col-lg-4">
            <a href="guide.php" class="card tool-card h-100 p-4 shadow-sm" style="border: 2px dashed #0d6efd;">
                <div class="icon-box bg-gradient-blue text-white">
                    <i class="bi bi-book-half fs-1"></i>
                </div>
                <h4 class="fw-bold text-center text-primary">How to Use</h4>
                <p class="text-center text-muted small">A simplified, step-by-step guide on how to master the Q4 Campaign Manager.</p>
                <div class="mt-auto text-center"><span class="btn btn-sm btn-primary rounded-pill">Read Guide</span></div>
            </a>
        </div>
    </div>

    <div class="row justify-content-center mt-5">
        <div class="col-md-4 text-center">
            <a href="?logout=1" class="btn btn-link text-danger text-decoration-none fw-bold">
                <i class="bi bi-box-arrow-right"></i> Securely Logout of System
            </a>
        </div>
    </div>
</div>

</body>
</html>