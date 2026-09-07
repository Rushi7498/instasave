const express = require("express");
const path = require("path");
const { spawn } = require("child_process");
const fs = require("fs");
const crypto = require("crypto");
const statsFile = path.join(__dirname, "data", "stats.json");
fs.mkdirSync(path.dirname(statsFile), { recursive: true });
if (!fs.existsSync(statsFile)) fs.writeFileSync(statsFile, JSON.stringify({downloads:0, requests:0, errors:0, lastDownloads:[]}, null, 2));

const app = express();
const PORT = process.env.PORT || 3000;
const MAX_SECONDS = Number(process.env.MAX_DOWNLOAD_SECONDS || 180);

app.use(express.json({ limit: "20kb" }));
app.use(express.static(path.join(__dirname, "public")));

function validInstagramUrl(value) {
  try {
    const u = new URL(value);
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    return (host === "instagram.com" || host === "instagr.am") &&
      /^\/(p|reel|tv|share)\//i.test(u.pathname);
  } catch {
    return false;
  }
}

function safeName(s) {
  return (s || "instasave").replace(/[^a-z0-9._-]/gi, "_").slice(0, 80);
}

app.post("/api/info", (req, res) => {
  const url = req.body?.url;
  const stats = JSON.parse(fs.readFileSync(statsFile, "utf8")); stats.requests++; fs.writeFileSync(statsFile, JSON.stringify(stats, null, 2));
  if (!validInstagramUrl(url)) {
    return res.status(400).json({ error: "Enter a valid public Instagram post/reel URL." });
  }

  const args = [
    "--no-warnings", "--no-playlist",
    "--dump-single-json", "--skip-download",
    "--no-check-certificates", url
  ];

  const child = spawn(process.env.YTDLP_PATH || "yt-dlp", args, {
    stdio: ["ignore", "pipe", "pipe"]
  });

  let out = "", err = "";
  const timer = setTimeout(() => child.kill("SIGKILL"), MAX_SECONDS * 1000);

  child.stdout.on("data", d => out += d.toString());
  child.stderr.on("data", d => err += d.toString());

  child.on("close", code => {
    clearTimeout(timer);
    if (code !== 0 || !out.trim()) {
      const stats = JSON.parse(fs.readFileSync(statsFile, "utf8")); stats.errors++; fs.writeFileSync(statsFile, JSON.stringify(stats, null, 2));
      return res.status(422).json({
        error: "Media could not be fetched. Make sure the URL is public and supported."
      });
    }
    try {
      const data = JSON.parse(out);
      res.json({
        title: data.title || "Instagram media",
        thumbnail: data.thumbnail || null,
        duration: data.duration || null,
        type: data.ext || "media",
        formats: Array.isArray(data.formats) ? data.formats.filter(f => f.url).slice(-8).map(f => ({
          format_id: f.format_id,
          ext: f.ext,
          quality: f.format_note || f.resolution || "Available",
          has_video: !!f.vcodec && f.vcodec !== "none",
          has_audio: !!f.acodec && f.acodec !== "none"
        })) : []
      });
    } catch {
      res.status(500).json({ error: "Unexpected media information response." });
    }
  });
});

app.get("/api/download", (req, res) => {
  const url = req.query.url;
  if (!validInstagramUrl(url)) {
    return res.status(400).send("Invalid public Instagram URL.");
  }

  const id = crypto.randomBytes(8).toString("hex");
  const output = path.join(require("os").tmpdir(), `instasave-${id}.%(ext)s`);

  const args = [
    "--no-warnings", "--no-playlist",
    "-o", output,
    "--merge-output-format", "mp4",
    "--no-check-certificates",
    url
  ];

  const child = spawn(process.env.YTDLP_PATH || "yt-dlp", args, {
    stdio: ["ignore", "pipe", "pipe"]
  });

  let err = "";
  child.stderr.on("data", d => err += d.toString());

  const timer = setTimeout(() => child.kill("SIGKILL"), MAX_SECONDS * 1000);

  child.on("close", async code => {
    clearTimeout(timer);
    if (code !== 0) {
      const stats = JSON.parse(fs.readFileSync(statsFile, "utf8")); stats.errors++; fs.writeFileSync(statsFile, JSON.stringify(stats, null, 2));
      return res.status(422).send("Download failed. The public media may be unavailable.");
    }

    const dir = require("os").tmpdir();
    const candidates = fs.readdirSync(dir)
      .filter(n => n.startsWith(`instasave-${id}.`))
      .map(n => path.join(dir, n));

    if (!candidates.length) return res.status(500).send("Downloaded file was not found.");

    const file = candidates[0];
    const stats = JSON.parse(fs.readFileSync(statsFile, "utf8"));
    stats.downloads++;
    stats.lastDownloads.unshift({at:new Date().toISOString(), ext:path.extname(file)});
    stats.lastDownloads = stats.lastDownloads.slice(0, 50);
    fs.writeFileSync(statsFile, JSON.stringify(stats, null, 2));
    const ext = path.extname(file) || ".mp4";
    res.download(file, `INSTASave${ext}`, () => {
      fs.unlink(file, () => {});
    });
  });
});


app.get("/admin/api/stats", (req, res) => {
  const key = req.headers["x-admin-key"] || req.query.key;
  if (key !== (process.env.ADMIN_KEY || "change-me-now")) return res.status(401).json({error:"Unauthorized"});
  res.json(JSON.parse(fs.readFileSync(statsFile, "utf8")));
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => console.log(`INSTASave running on port ${PORT}`));
