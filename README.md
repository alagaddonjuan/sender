# Q4 Campaign Manager & Outreach Engine

An enterprise-grade, multi-channel outreach automation platform built with PHP. Combines high-deliverability SMTP inbox rotation, Google Gemini AI personalization and deliverability scoring, automated multi-touch follow-ups with smart IMAP reply detection, bulk SMS broadcasting via Africa's Talking, and real-time lead scraping and verification.

---

## 🚀 Key Features

### 1. Smart Mailer Engine (`mailer.php`, `send.php`)
- **Multi-Account SMTP Rotation:** Dynamically distributes cold email batches across multiple authenticated Google Workspace, Gmail, or custom SMTP accounts to bypass daily sending quotas and protect sender reputation.
- **Persistent Keep-Alive Connection Pooling:** Reuses active SMTP sockets via PHPMailer for fast transmission speeds.
- **Real-Time Chunked Progress Streaming:** Streams live delivery updates and percentage completion to the browser using HTTP chunked transfer encoding (`Transfer-Encoding: chunked`).
- **Rich HTML & WYSIWYG Editor:** Fully formatted messages with Simditor, plus raw text fallback.
- **File Attachments:** Native upload and delivery for documents, contracts, RFQs, and image attachments.
- **50/50 A/B Split Testing:** Simultaneously test two different subject lines and message bodies to measure winning conversion rates.

### 2. Google Gemini AI Intelligence (`gemini_helper.php`, `spam_checker.php`, `ai_variant.php`)
- **Deliverability & Spam Trigger Analysis:** Evaluates email copy and subjects against modern ISP spam filters, computes a 0–100 risk score, and generates clean rewrites.
- **AI A/B Test Variant Generator:** Automatically crafts alternative Variant B angles using distinct psychological hooks (curiosity, urgency, value proposition).
- **Domain-Tailored Icebreakers:** Dynamically extracts the recipient's domain and crafts unique, context-aware opening sentences for every lead.

### 3. Automated Follow-Ups & Smart Reply Detection (`cron_worker.php`, `imap_checker.php`)
- **Scheduled Sequences:** Queue automated follow-ups with custom delay intervals (e.g. 2–5 days).
- **Automated IMAP Reply Detection:** Background worker connects to your IMAP inbox, detects incoming replies from prospects, and **instantly halts pending follow-ups** to prevent awkward double-messaging.

### 4. Bulk SMS Broadcasting Engine (`sms.php`, `sms_sender.php`)
- **Africa's Talking Gateway:** Global and regional SMS dispatch across Nigeria (+234), Kenya (+254), and international destinations.
- **Number Normalization:** Cleans and formats phone numbers automatically.
- **Live Dispatch Reports:** Displays real-time per-number delivery status and carrier cost reporting.

### 5. 3-Layer Email Hygiene & List Verifier (`verify.php`)
- **Syntax Validation:** Strict RFC format checks.
- **DNS MX Record Resolution:** Validates that target domains have active mail exchange records before sending to reduce bounce rates.
- **Role-Based Mailbox Flagging:** Highlights generic inboxes (`admin@`, `support@`, `sales@`, `info@`).
- **Export Clean Lists:** One-click CSV export of verified leads.

### 6. Automated Lead & Web Scraper (`scraper.php`)
- **Targeted Lead Discovery:** Scrapes organic search results via DuckDuckGo without requiring expensive third-party search APIs.
- **In-Depth Email Extraction:** Parses target domain homepages and contact pages to harvest relevant contact emails.
- **Export to CSV:** Direct download of newly discovered prospect lists.

### 7. Campaign Analytics & Real-Time Tracking (`analytics.php`, `track.php`, `history.php`)
- **Open Tracking:** 1x1 invisible tracking pixel records recipient opens, timestamps, IP addresses, and User-Agents.
- **Click Tracking:** Rewrites outgoing links through a fast 302 redirect handler to record CTR metrics.
- **A/B Performance Comparison:** Side-by-side open and click metrics for Variant A vs. Variant B.

### 8. Full REST API & Headless Integration (`API_DOCUMENTATION.md`)
- Complete headless REST API supporting cross-origin frontend apps (React, Next.js, Vue, mobile apps) with session-based authentication (`PHPSESSID`).
- Full API documentation available in [API_DOCUMENTATION.md](file:///c:/wamp64/www/mail/API_DOCUMENTATION.md).

---

## 📁 Repository Structure

```
├── API_DOCUMENTATION.md    # Full REST API documentation & frontend integration guide
├── README.md               # Project overview and deployment guide
├── config.example.php      # Starter configuration template (credentials sanitized)
├── .gitignore              # Protects config.php, uploads, vendor, and logs from Git
├── composer.json           # Composer dependencies (PHPMailer, Africa's Talking)
│
├── index.php               # Central dashboard & authentication gate
├── login.php               # Session authentication handler
├── guide.php               # In-app visual step-by-step master guide
│
├── send.php                # Smart Mailer UI (A/B testing, AI icebreakers, file uploads)
├── mailer.php              # Real-time streaming SMTP dispatch engine
│
├── gemini_helper.php       # Google Gemini AI API integration helper
├── spam_checker.php        # AI spam score & deliverability recommendations
├── ai_variant.php          # AI-powered A/B copy generator
│
├── cron_worker.php         # Automated follow-up dispatcher (CLI or Cron URL)
├── imap_checker.php        # IMAP listener for detecting recipient replies
│
├── sms.php                 # SMS broadcast interface
├── sms_sender.php          # Africa's Talking SMS API gateway dispatcher
│
├── verify.php              # 3-layer email list cleaner and MX validator
├── scraper.php             # Organic search web lead crawler & email scraper
│
├── analytics.php           # Campaign open/click performance metrics dashboard
├── track.php               # Public pixel and click redirect tracking endpoint
└── history.php             # Historical dispatch logs and batch summaries
```

---

## 🛠️ Installation & Setup

### 1. Prerequisites
- **Web Server:** Apache or Nginx (e.g. WampServer, XAMPP, or Linux VPS).
- **PHP Version:** PHP 8.0 or higher.
- **Required PHP Extensions:** `curl`, `openssl`, `imap`, `mbstring`, `fileinfo`.
- **Composer:** Installed globally.

### 2. Clone & Install Dependencies
```bash
git clone https://github.com/alagaddonjuan/sender.git
cd sender
composer install
```

### 3. Configure Credentials
1. Copy the template configuration file:
   ```bash
   cp config.example.php config.php
   ```
2. Open `config.php` and configure your credentials:
   - **Dashboard Access:** Set `$secret_password` for securing the web interface.
   - **Google Gemini AI:** Set `$gemini_api_key` (get yours from [Google AI Studio](https://aistudio.google.com/)).
   - **Africa's Talking SMS:** Configure `$at_username` and `$at_api_key`.
   - **SMTP Accounts (Inbox Rotation):** Add one or more Gmail / Google Workspace SMTP accounts with their 16-character Google App Passwords:
     ```php
     $smtp_accounts = [
         [
             'host' => 'smtp.gmail.com',
             'user' => 'outreach@yourdomain.com',
             'pass' => 'your-16-char-app-password',
             'port' => 587
         ],
         // Add additional accounts for load balancing:
         [
             'host' => 'smtp.gmail.com',
             'user' => 'sales@yourdomain.com',
             'pass' => 'your-second-app-password',
             'port' => 587
         ]
     ];
     ```
   - **IMAP Reply Listener:** Set `$imap_host`, `$imap_user`, and `$imap_pass` for automated reply detection.

> 🔒 **Security Notice:** `config.php` is strictly excluded in `.gitignore` to prevent secret exposure on GitHub. Never commit live passwords or API keys.

---

## ⏰ Cron Jobs & Automation

To enable automatic follow-ups and reply detection, set up cron jobs on your server:

```bash
# Check for incoming replies and dispatch due follow-ups every 15 minutes
*/15 * * * * php /path/to/sender/cron_worker.php >> /path/to/sender/cron.log 2>&1
```

Or trigger securely via HTTP webhook with your cron token:
```bash
curl "https://your-domain.com/cron_worker.php?token=cron123"
```

---

## 📖 API Documentation

The platform includes a complete REST API for headless integrations. Refer to [API_DOCUMENTATION.md](file:///c:/wamp64/www/mail/API_DOCUMENTATION.md) for endpoint details, parameter schemas, and frontend code samples (React, Next.js, and Vanilla JavaScript).

---

## 📄 License

This software is licensed for internal enterprise and marketing operations under [LICENSE](file:///c:/wamp64/www/mail/LICENSE).
