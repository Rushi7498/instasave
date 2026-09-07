# INSTASave — Hosting Ready

## Stack
- Node.js + Express
- yt-dlp for public media processing
- Responsive HTML/CSS/JS frontend

## Local setup

1. Install Node.js 18+.
2. Install `yt-dlp` and make sure the `yt-dlp` command is available in PATH.
3. In this folder run:
   `npm install`
4. Start:
   `npm start`
5. Open:
   `http://localhost:3000`

## Server requirements
A VPS/server that permits installing yt-dlp is recommended. A basic shared hosting plan usually cannot run this backend.

Optional environment variables:
- `PORT=3000`
- `YTDLP_PATH=/full/path/to/yt-dlp`
- `MAX_DOWNLOAD_SECONDS=180`

## Production notes
- Add HTTPS.
- Add rate limiting and request logging.
- Set a maximum download size and disk cleanup policy.
- Consider a queue for high traffic.
- Do not use this service to access private accounts, bypass authentication, or download content you are not authorized to download.
- Review Instagram/Meta terms and applicable copyright/privacy laws before public launch.


## Pro additions
- `/admin.html` — statistics dashboard
- `/privacy.html`, `/terms.html`, `/contact.html` — starter legal/contact pages
- `/data/stats.json` — local counters
- `ADMIN_KEY` environment variable protects admin statistics. **Change the default immediately in production.**
- Add your AdSense code only after your site is approved; use the marked layout areas in `public/index.html` for ad placements.
