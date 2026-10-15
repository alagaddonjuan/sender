# Q4 Campaign Manager & Mailer Backend API Documentation

**Live Server Base URL:** `https://sender.q4iltd.com`  
**API Version:** 1.0  
**Transport:** HTTPS  
**Default Content Formats:** `application/json`, `multipart/form-data`, `text/plain` (streaming)

---

## 1. Authentication & Session Management

All management and dispatch endpoints require an active session authenticated with the system password.

### 1.1 Login / Unlock Engine
Authenticates the client and initializes a PHP session cookie (`PHPSESSID`).

- **Endpoint:** `POST /login.php`
- **Content-Type:** `multipart/form-data` or `application/x-www-form-urlencoded`
- **Request Parameters:**

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `password` | `string` | **Yes** | The backend access password configured in `config.php` |

- **Response:**
  - HTTP `302 Found` redirecting to `index.php` on success (or `index.php?error=1` on failure).
  - Sets `Set-Cookie: PHPSESSID=<session_id>; path=/; HttpOnly` header.

#### Frontend Fetch Example:
```javascript
const formData = new FormData();
formData.append('password', 'YOUR_ACCESS_PASSWORD');

const response = await fetch('https://sender.q4iltd.com/login.php', {
  method: 'POST',
  body: formData,
  credentials: 'include' // CRITICAL: Preserves PHPSESSID cookie
});
```

> **Important Note for Frontend Engineers:**  
> When making cross-origin requests from frontend apps (e.g. React/Vue/Next.js), ensure you send `credentials: 'include'` (in `fetch`) or `withCredentials: true` (in `axios`) so the session cookie is passed along with subsequent requests.

### 1.2 Logout
Destroys the active session.

- **Endpoint:** `GET /index.php?logout=1`
- **Authentication:** Session cookie required.
- **Response:** Redirects to `index.php` login screen.

---

## 2. Smart Mailer Engine (Email Dispatch)

Dispatches cold email campaigns with SMTP inbox rotation, real-time chunked progress streaming, automatic click/open tracking injection, optional A/B testing, and AI personalization.

- **Endpoint:** `POST /mailer.php`
- **Content-Type:** `multipart/form-data`
- **Authentication:** Active session required (`credentials: 'include'`).

### Request Parameters

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `fromName` | `string` | **Yes** | Sender display name (e.g., `Q4 Team`) |
| `fromEmail` | `string` | **Yes** | Sender email address (used as primary Reply-To address) |
| `replyToEmail` | `string` | No | Custom Reply-To address (if different from `fromEmail`) |
| `toEmail` | `string` | **Yes** | Recipient emails. Supports multiple addresses separated by newlines, commas, or spaces |
| `cc` | `string` | No | CC recipients (comma, space, or newline-separated) |
| `bcc` | `string` | No | BCC recipients (comma, space, or newline-separated) |
| `subjectLine` | `string` | **Yes** | Email subject line (Variant A) |
| `richMessageText` | `string` | **Yes\*** | HTML content of the email |
| `rawMessageText` | `string` | No\* | Plain text content fallback (\*at least one body is required) |
| `attachment` | `file` | No | File upload (PDF, PNG, JPG, DOCX, etc.) |
| `enableAiPersonalization` | `string` | No | Set to `"1"` to automatically generate an AI-tailored opening sentence for each recipient's company domain |
| `enableABTesting` | `string` | No | Set to `"1"` to enable 50/50 A/B split testing |
| `subjectLineB` | `string` | No | Subject line for Variant B (required if `enableABTesting` is `"1"`) |
| `richMessageTextB` | `string` | No | HTML content for Variant B (required if `enableABTesting` is `"1"`) |
| `enableFollowUp` | `string` | No | Set to `"1"` to queue an automated follow-up sequence |
| `followUpDays` | `number` | No | Days to wait before follow-up (default: `2`) |
| `followUpSubject` | `string` | No | Follow-up email subject |
| `richFollowUpText` | `string` | No | Follow-up email HTML body |

### Response Stream

This endpoint streams plain-text lines in real time using HTTP chunked transfer. Each chunk represents a progress update or status.

- Progress Update line:
  ```text
  PROGRESS:50|SENT:customer@example.com [Via hello@q4iltd.com]
  ```
  *(Format: `PROGRESS:<percentage>|SENT:<recipient_email> [Via <smtp_account>]`)*
- Completion line:
  ```text
  SUMMARY:Batch Complete. Load dynamically distributed across 1 SMTP accounts using Keep-Alive efficiency.
  ```
- Error line:
  ```text
  ERROR: Transmission failed on account hello@q4iltd.com - <error details>
  ```

### Frontend Streaming Reader Example:
```javascript
async function sendCampaign(formData) {
  const response = await fetch('https://sender.q4iltd.com/mailer.php', {
    method: 'POST',
    body: formData,
    credentials: 'include'
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    lines.forEach(line => {
      if (line.startsWith('PROGRESS:')) {
        const parts = line.replace('PROGRESS:', '').split('|SENT:');
        const percentage = parts[0];
        const status = parts[1];
        console.log(`Progress: ${percentage}% - Sent to: ${status}`);
      } else if (line.startsWith('SUMMARY:')) {
        console.log('Finished:', line.replace('SUMMARY:', ''));
      } else if (line.startsWith('ERROR:')) {
        console.error('Error:', line.replace('ERROR:', ''));
      }
    });
  }
}
```

---

## 3. AI Spam Score & Deliverability Analyzer

Uses Google Gemini AI to analyze the subject and body for spam triggers, calculate a deliverability score, and suggest safe rewrites.

- **Endpoint:** `POST /spam_checker.php`
- **Content-Type:** `multipart/form-data` or `application/x-www-form-urlencoded`
- **Authentication:** Active session required (`credentials: 'include'`).

### Request Parameters

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `subject` | `string` | **Yes** | The proposed email subject line |
| `body` | `string` | **Yes** | The proposed email message body |

### Response Format: `application/json`

#### Success (200 OK):
```json
{
  "score": 25,
  "risk_level": "Low",
  "suggestions": [
    "Subject line is clear and concise.",
    "Good text-to-link balance."
  ],
  "rewritten_subject": "Strategic Partnership Opportunities with Q4",
  "rewritten_body": "Hello,\n\nI wanted to reach out regarding potential collaboration between our teams..."
}
```

#### Error Response:
```json
{
  "error": "Gemini API key is not configured in config.php."
}
```

---

## 4. AI A/B Test Variant Generator

Generates an alternative email variant (Variant B) with a different psychological hook, tone, and framing while maintaining the original offer.

- **Endpoint:** `POST /ai_variant.php`
- **Content-Type:** `multipart/form-data` or `application/x-www-form-urlencoded`
- **Authentication:** Active session required (`credentials: 'include'`).

### Request Parameters

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `subject` | `string` | **Yes** | Variant A subject line |
| `body` | `string` | **Yes** | Variant A body text |

### Response Format: `application/json`

#### Success (200 OK):
```json
{
  "variant_subject": "Quick question regarding your marketing operations",
  "variant_body": "Hi there,\n\nMost teams we speak with find managing delivery rates challenging..."
}
```

#### Error Response:
```json
{
  "error": "No content provided."
}
```

---

## 5. SMS Broadcasting Engine

Dispatches bulk SMS notifications via Africa's Talking gateway.

- **Endpoint:** `POST /sms_sender.php`
- **Content-Type:** `multipart/form-data` or `application/x-www-form-urlencoded`
- **Authentication:** Active session required (`credentials: 'include'`).

### Request Parameters

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `toNumbers` | `string` | **Yes** | Comma, space, or newline-separated phone numbers with country code (e.g., `+254711223344, +2348012345678`) |
| `smsMessage` | `string` | **Yes** | Plain text message (160 characters per SMS unit) |

### Response Format: `text/plain`

#### Success:
```text
Preparing to send 2 SMS messages...
✅ Broadcast Dispatched successfully to Africa's Talking!

Delivery Report:
 -> +254711223344 | Status: Success | Cost: KES 0.8000
 -> +2348012345678 | Status: Success | Cost: NGN 4.0000
```

#### Error:
```text
❌ Error: Phone numbers and message are required.
```

---

## 6. Email List Verifier

Performs 3-layer hygiene on email lists: syntax validation, DNS MX record resolution, and role-based prefix flagging.

- **Endpoint:** `POST /verify.php`
- **Content-Type:** `application/x-www-form-urlencoded` or `multipart/form-data`
- **Authentication:** Active session required (`credentials: 'include'`).

### Request Parameters

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `emailList` | `string` | **Yes** | Multi-line text list of email addresses, one per line |

### Processing Results:
- **Safe (Domain Verified):** Valid syntax & active MX record.
- **Safe (Role-Based/Generic):** Valid MX record, but generic mailbox (`admin@`, `info@`, `sales@`, `support@`).
- **Dead Domain (No MX Records):** Domain does not have mail exchange records.
- **Invalid Format:** Fails RFC email format validation.

---

## 7. Web & Lead Scraper

Scrapes organic search results via DuckDuckGo and extracts contact emails from top matching websites.

- **Endpoint:** `POST /scraper.php`
- **Content-Type:** `application/x-www-form-urlencoded` or `multipart/form-data`
- **Authentication:** Active session required (`credentials: 'include'`).

### Request Parameters

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `keywords` | `string` | **Yes** | Targeted search terms (e.g. `logistics companies in Nairobi`) |

---

## 8. Public Engagement Tracking

Public endpoints invoked automatically by recipient email clients or link clicks. No authentication required.

### 8.1 Open Tracking Pixel
- **Endpoint:** `GET /track.php?id=<TRACKING_ID>&type=open`
- **Response:** `image/gif` (1x1 transparent GIF).
- **Behavior:** Logs timestamp, IP, User-Agent, and tracking ID to `tracking_logs.csv`.

### 8.2 Click Tracking Redirector
- **Endpoint:** `GET /track.php?id=<TRACKING_ID>&type=click&url=<BASE64_DESTINATION_URL>`
- **Response:** HTTP `302 Found` redirect to decoded destination URL.
- **Behavior:** Logs click event and forwards user to target link.

---

## 9. Background Automation & Webhooks

Endpoints intended for scheduled cron jobs or server-side triggers.

### 9.1 Follow-Up Cron Dispatcher
- **Endpoint:** `GET /cron_worker.php?token=cron123`
- **Authentication:** URL Token `token=cron123` or CLI execution.
- **Actions:**
  1. Executes IMAP checker to cancel follow-ups for recipients who already replied.
  2. Dispatches pending follow-ups whose scheduled date has arrived.

### 9.2 IMAP Reply Checker
- **Endpoint:** `GET /imap_checker.php?token=cron123`
- **Authentication:** URL Token `token=cron123` or CLI execution.
- **Actions:** Connects to Gmail IMAP, reads unseen replies, and updates `followup_queue.csv` to `cancelled_replied`.

---

## 10. Frontend Integration Checklist

1. **Base URL:** Ensure all calls target `https://sender.q4iltd.com/`.
2. **CORS & Credentials:** Set `credentials: 'include'` on all `fetch()` calls or `axios.defaults.withCredentials = true` so the session cookie (`PHPSESSID`) persists.
3. **Authentication Flow:**
   - Call `/login.php` first with the admin password.
   - Store session state upon receiving the successful redirect or 200 response.
4. **Streaming Progress:** The `/mailer.php` endpoint uses chunked plain-text output. Do not wait for `await response.text()` to complete—use `response.body.getReader()` to parse lines starting with `PROGRESS:` and update progress bars in real time.
