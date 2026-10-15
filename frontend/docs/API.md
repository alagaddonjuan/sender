# Q4 Campaign Manager API

This frontend uses the live PHP API documented by the service operator:

- **Base URL:** `https://sender.q4iltd.com`
- **Frontend environment variable:** `VITE_API_URL`
- **Authentication:** `PHPSESSID` cookie; Axios `withCredentials: true`
- **Request formats:** `multipart/form-data` for the PHP forms; JSON for AI responses
- **Configuration:** set `VITE_API_URL=https://sender.q4iltd.com`; local browser requests use `/q4-api`, proxied by Vite to that URL
- **Production:** serve a same-origin reverse proxy at `/q4-api` that maps requests to the backend's root-level PHP paths (including `/analytics.php` and `/history.php`), or configure the API for credentialed CORS and cross-site session cookies

Vite exposes only `VITE_*` settings to the browser. Do not put the backend password,
SMTP credentials, or provider/API keys in `.env` or any `VITE_*` value.

The live API's responses observed from a local development origin did not include
`Access-Control-Allow-Origin` or `Access-Control-Allow-Credentials`, and its
`PHPSESSID` cookie did not include `SameSite=None; Secure`. A direct cross-origin
browser login therefore cannot reliably follow the documented redirect or persist
the session. The Vite proxy avoids this during local development; deployed apps need
a same-origin reverse proxy or corresponding backend configuration.

## Authentication

| Method | Path                  | Request                    | Result                                                                                    |
| ------ | --------------------- | -------------------------- | ----------------------------------------------------------------------------------------- |
| POST   | `/login.php`          | multipart field `password` | Redirects to `index.php`; failed login redirects to `index.php?error=1`; sets `PHPSESSID` |
| GET    | `/index.php?logout=1` | Session cookie             | Ends session and redirects to login                                                       |

The login UI stores only an in-tab session marker; it never stores the password.
The API documentation does not define a session-status endpoint. Protected API
requests remain authenticated by the server session cookie.

## Supported frontend operations

| Method | Path                | Request fields                                                                                                                                                                                                                        | Response                                                                                                                                                    |
| ------ | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/mailer.php`       | multipart: `fromName`, `fromEmail`, `toEmail`, `subjectLine`, at least one of `richMessageText` / `rawMessageText`; optional `replyToEmail`, `cc`, `bcc`, `attachment`, `enableAiPersonalization=1`, A/B fields, and follow-up fields | Streaming plain text: `PROGRESS:`, `SUMMARY:`, `ERROR:` lines                                                                                               |
| POST   | `/spam_checker.php` | multipart `subject`, `body`                                                                                                                                                                                                           | JSON with `score`, `risk_level`, `suggestions`, `rewritten_subject`, `rewritten_body`                                                                       |
| POST   | `/ai_variant.php`   | multipart `subject`, `body`                                                                                                                                                                                                           | JSON with `variant_subject`, `variant_body`                                                                                                                 |
| POST   | `/sms_sender.php`   | multipart `toNumbers`, `smsMessage`                                                                                                                                                                                                   | Plain-text delivery report or error                                                                                                                         |
| POST   | `/verify.php`       | multipart `emailList`                                                                                                                                                                                                                 | Email syntax/MX/role-address verification; HTML responses are parsed into status, details, and data tables, while plain-text responses remain readable text |
| POST   | `/scraper.php`      | multipart `keywords`                                                                                                                                                                                                                  | HTML page containing a status alert, scanned-site count, and extracted-email textarea; the frontend parses these into a results summary and email list      |
| GET    | `/analytics.php`    | Session cookie                                                                                                                                                                                                                        | HTML page with campaign metrics, daily timeline, and recent activity; the frontend extracts the rendered data                                               |
| GET    | `/history.php`      | Session cookie                                                                                                                                                                                                                        | HTML page with transmission history; the frontend extracts the rendered table                                                                               |

All these requests include credentials. The frontend reads the mailer stream as it
arrives and reports progress, completion, and streamed errors.

The spam-check score is presented as a risk score: higher means greater spam risk,
and lower means better inbox prospects. It is an estimate, not a delivery guarantee.

## Public tracking

- `GET /track.php?id=<TRACKING_ID>&type=open` returns a 1x1 GIF.
- `GET /track.php?id=<TRACKING_ID>&type=click&url=<BASE64_DESTINATION_URL>` records
  a click and redirects to the destination.

Tracking events can also be read from the authenticated analytics and history
endpoints listed above.

## Backend-only automation

- `GET /cron_worker.php?token=...` runs follow-up dispatch and reply checks.
- `GET /imap_checker.php?token=...` checks IMAP replies.

The sample cron token in the API document must be replaced with a strong secret on
the server. These cron endpoints are not invoked by the frontend.

## API documentation gaps

The supplied contract does not define a stable response schema for `verify.php`,
`analytics.php`, or `history.php`, a session-validation endpoint, or a contact-list
read endpoint. The analytics UI extracts aggregate sent/open/click metrics and daily chart values
from the HTML page's inline chart data or rendered tables, plus recent activity rows
when available. It shows every daily point and date supplied by analytics and does not use
transmission history to fill missing graph series. Its activity table paginates
all sent/open/click events supplied by analytics, 50 rows at a time. The history UI extracts
timestamp, status, recipient, and subject columns from its HTML table.
Verify consent and recipient authorization before sending; a public search result
is not permission to contact someone.
