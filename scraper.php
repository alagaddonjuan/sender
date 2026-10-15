<?php
session_start();
require_once 'config.php';

// Security Check
if (!isset($_SESSION['authenticated']) || $_SESSION['authenticated'] !== true) {
    header("Location: index.php");
    exit();
}

$emailsFound = [];
$errorMsg = "";
$statusMsg = "";

if ($_SERVER["REQUEST_METHOD"] == "POST" && !empty($_POST['keywords'])) {
    $keywords = urlencode($_POST['keywords']);
    
    // DuckDuckGo Lite Search (No API key needed, scraper-friendly)
    $searchUrl = "https://lite.duckduckgo.com/lite/";
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $searchUrl);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, "q=" . $keywords . "&kl=&df=");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $html = curl_exec($ch);
    curl_close($ch);
    
    if ($html) {
        // DuckDuckGo Lite encodes URLs in uddg parameter
        preg_match_all('/uddg=([^&"\']+)/', $html, $matches);
        
        if (empty($matches[1])) {
            // Fallback for direct links if uddg is not present (DDG HTML Lite updated their DOM)
            preg_match_all('/href=[\'"]([^\'"]+)[\'"]\s+class=[\'"]result-link[\'"]/i', $html, $matches);
        }

        $urls = array_unique(array_map('urldecode', $matches[1] ?? []));
        
        if (empty($urls)) {
            $errorMsg = "No search results found or search engine blocked the request. Try varying your keywords.";
        } else {
            $urlsToVisit = array_slice($urls, 0, 10); // Visit top 10 websites
            
            foreach ($urlsToVisit as $url) {
                $ch = curl_init($url);
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_TIMEOUT, 6); // Max 6 seconds per site
                curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
                curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
                curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
                $pageHtml = curl_exec($ch);
                curl_close($ch);
                
                if ($pageHtml) {
                    // Extract emails using Regex
                    preg_match_all('/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/', $pageHtml, $emailMatches);
                    if (!empty($emailMatches[0])) {
                        foreach ($emailMatches[0] as $e) {
                            $e = strtolower($e);
                            // Filter out common false positives (image files, etc)
                            if (!preg_match('/\.(png|jpg|jpeg|gif|webp|svg|css|js)$/', $e)) {
                                $emailsFound[] = $e;
                            }
                        }
                    }
                }
            }
            $emailsFound = array_unique($emailsFound);
            $statusMsg = "Scanned " . count($urlsToVisit) . " websites and discovered " . count($emailsFound) . " emails.";
        }
    } else {
        $errorMsg = "Failed to connect to the search engine. Check your connection.";
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <title>Lead Scraper | <?php echo $app_name; ?></title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css">
    <style>
        body { background: #f8f9fa; padding: 40px 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        .card { border: none; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
        .spin { display: inline-block; animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
    </style>
</head>
<body>
<div class="container">
    <div class="row justify-content-center">
        <div class="col-lg-9">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h3 class="fw-bold"><i class="bi bi-search text-primary me-2"></i>Lead Scraper</h3>
                <div class="d-flex gap-2">
                    <a href="beta/?session=active#/scraper" class="btn btn-warning text-dark fw-bold"><i class="bi bi-stars me-1"></i>Try Beta Scraper</a>
                    <a href="index.php" class="btn btn-outline-primary">Back to Dashboard</a>
                </div>
            </div>

            <!-- Explainer -->
            <div class="alert alert-primary shadow-sm rounded border-0 mb-4">
                <h5 class="alert-heading fw-bold">How it Works</h5>
                <p class="mb-0">Enter keywords below (e.g. <code>plumbers in london</code> or <code>marketing agencies "@gmail.com"</code>). The engine queries the web, visits the top search results, and automatically parses the websites to extract contact emails.</p>
            </div>

            <?php if (!empty($errorMsg)): ?>
                <div class="alert alert-danger fw-bold"><i class="bi bi-exclamation-triangle-fill me-2"></i><?php echo $errorMsg; ?></div>
            <?php endif; ?>

            <?php if (!empty($statusMsg)): ?>
                <div class="alert alert-success fw-bold"><i class="bi bi-check-circle-fill me-2"></i><?php echo $statusMsg; ?></div>
            <?php endif; ?>

            <div class="card p-4 mb-4">
                <form method="POST" id="scrapeForm">
                    <label class="form-label fw-bold">Keywords / Search Tags</label>
                    <input type="text" name="keywords" class="form-control form-control-lg mb-3" placeholder="e.g. SEO experts in New York" required value="<?php echo isset($_POST['keywords']) ? htmlspecialchars($_POST['keywords']) : ''; ?>">
                    <button type="submit" class="btn btn-primary w-100 py-3 fw-bold fs-5 shadow-sm" id="scrapeBtn" onclick="this.innerHTML='<i class=\'bi bi-arrow-repeat spin\'></i> Scraping Web... This may take up to 60 seconds.';">
                        START SCRAPING LEADS
                    </button>
                </form>
            </div>

            <?php if ($_SERVER["REQUEST_METHOD"] == "POST" && empty($errorMsg)): ?>
            <div class="card p-4 bg-dark text-white shadow-lg">
                <h5 class="fw-bold"><i class="bi bi-envelope-check me-2"></i>Extracted Emails (<?php echo count($emailsFound); ?>)</h5>
                <p class="small text-secondary mb-2">Copy this list and paste it into the <strong>Verifier</strong> to clean it before sending.</p>
                <?php if (count($emailsFound) > 0): ?>
                    <textarea class="form-control bg-dark text-success border-secondary font-monospace" rows="10" readonly><?php echo implode("\n", $emailsFound); ?></textarea>
                <?php else: ?>
                    <textarea class="form-control bg-dark text-danger border-secondary" rows="5" readonly>No emails found on the top websites for this search query.</textarea>
                <?php endif; ?>
            </div>
            <?php endif; ?>

        </div>
    </div>
</div>
</body>
</html>
