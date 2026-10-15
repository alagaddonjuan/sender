# Q4iltd

React 18 + TypeScript + Vite frontend for the Q4 Campaign Manager backend.
The live API base URL is `https://sender.q4iltd.com` and is configured through
`VITE_API_URL`. During development, browser requests go through the same-origin
`/q4-api` path, which Vite proxies to that configured upstream so the PHP session
cookie remains same-origin.

## Run the frontend

```bash
npm ci
npm run dev
npm run format
npm run format:check
npm test
npm run build
```

`npm test` runs the strict TypeScript check. Prettier formats supported frontend,
configuration, and documentation files; PHP files are excluded because Prettier
does not provide a PHP parser. `composer test` delegates to the same frontend check.

The live backend session is unlocked with the access password configured by the API
operator. No API password or provider secret belongs in this frontend or a `VITE_*`
variable.

For production, serve the app and proxy `/q4-api` to `https://sender.q4iltd.com`
under the same origin. Direct browser requests to the backend require credentialed
CORS and cross-site PHP session-cookie settings, which the backend currently does
not return.

## Connected workflows

| Route                    | API operation                                           |
| ------------------------ | ------------------------------------------------------- |
| `/scraper`               | `POST /scraper.php`                                     |
| `/verify`                | `POST /verify.php`                                      |
| `/campaigns`             | `POST /mailer.php` with streamed progress               |
| `/campaigns` AI controls | `POST /spam_checker.php`, `POST /ai_variant.php`        |
| `/sms`                   | `POST /sms_sender.php`                                  |
| `/analytics`             | `GET /analytics.php` (HTML page parsed by the frontend) |
| `/history`               | `GET /history.php` (HTML page parsed by the frontend)   |

Authentication uses `POST /login.php` and `GET /index.php?logout=1`. See
[docs/API.md](docs/API.md) for the external API contract and its limitations.

Only contact people who have given permission, identify the sender clearly, honor
opt-outs, and follow applicable law and the provider's terms. The API's scraper
returns data for review; finding a public email address does not establish consent.
