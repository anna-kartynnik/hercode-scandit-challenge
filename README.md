# [Scandit x HerCode] Hackathon Challenge: In-Store AI Concierge

Welcome to Scandit's HerCode hackathon challenge. This repo is your starting point: the challenge brief, a sample dataset, and the setup instructions to build on top of Scandit. Good luck, and have fun.

## The challenge

Build an AI concierge for a Swiss outdoor retailer that helps shoppers find and buy the right gear in the store, on their phone, on top of Scandit's scanning and AR technology.

This challenge pairs with the Zenline challenge: Zenline's system decides what a retailer should stock, and yours helps the shopper find and buy it in the store.

The setting: a customer is standing in front of a wall of jackets, boots, and tents. They have no idea which one fits their trip, their budget, or their needs. Build the companion that guides them.

## What you can build

These are just example ideas to get you started, not a checklist. There is a lot more to build, so use them as inspiration and run with your own. Pick one direction and make it work well. One capability that runs live beats four that are half finished.

- Highlight the right gear on the shelf through the camera. Show only "waterproof shells under 400g", "boots in size 42", or "rated for -10°C". Built with MatrixScan AR.
- Find my product: point the camera at the wall and get guided to the exact model on your list. Built with MatrixScan AR.
- Plan, then checklist, then scan: turn a trip plan like "3-day winter hike" into a gear checklist, then scan items off it in a tap. Built with SparkScan.
- Voice product Q&A: ask a scanned product anything by voice, like its waterproof rating, care instructions, sizes in stock, or a cheaper alternative. Built with ElevenLabs.

The best submissions will surprise us. Combine these, take them further, or solve a part of the in-store experience we did not list.

## What's in this repo

- `dataset/products.json`: a sample outdoor-gear catalog to build against (249 product variants with scannable barcodes, color/size, weight, waterproof rating, material, tags, prices, and stock). See `dataset/README.md`.
- `dataset/sample-barcodes.pdf`: real product barcodes you can scan (print it or scan it off a screen) to test scanning, AR overlays, and your whole app without a physical store. They match the catalog, so a scan returns real product data.
- `dataset/store-map.png`: the store floor plan, so your app can guide shoppers aisle by aisle to the right product.
- `.env.example`: a template for your Scandit license key.

## Get started

1. Fork this repo to your own GitHub account. Your fork is where you build, and its link is what you submit at the end.
2. Copy the env template and add your key: `cp .env.example .env`, then paste the license key the organizers gave you. Keep `.env` out of git.
3. Install the Scandit skills for your tool (see below).

## Set up the Scandit skills

The Scandit skills teach your AI tool how to integrate the SDK correctly, so you don't paste docs around. Install the ones you need.

**Any coding agent (Claude Code, Codex, Cursor, Copilot, Gemini, and 40+ others).**
Install with one command and follow the prompts to pick your agent and the skills you want:

```
npx skills add scandit/skills
```

Full options and per-agent details: https://github.com/Scandit/skills

**Lovable (web apps).**
Lovable imports skills as ZIPs, one at a time. Download the Scandit skills repo (open https://github.com/Scandit/skills, then Code → Download ZIP, or `git clone` it). Zip each skill folder you want on its own, then upload each one in Settings → Skills → Add → Upload ZIP (guide: https://docs.lovable.dev/features/skills).

Lovable only builds web apps, so take the web skills. For this challenge we suggest these three:

- `sparkscan-web`: our ready-to-use fast-scanning UI. It floats like a widget on top of your app.
- `matrixscan-ar-web`: scan many barcodes at once while showing AR overlays on top of them.
- `barcode-capture-web`: single-barcode scanning with a classic full-screen camera.

Not sure which Scandit product fits? Add the `data-capture-sdk` skill too. It asks a few questions about your idea and points you to the right product and platform.

## License key

You'll get a Scandit license key from the organizers. Put it in your `.env` file as `SCANDIT_LICENSE_KEY` (see `.env.example`), then wire it in where the skill for your platform tells you to. The key is shared separately, so it's not in this repo.

## What to submit

1. Your code: the link to your forked repo (or another GitHub/GitLab repo, or a `.zip` folder).
2. A video walkthrough of the app that shows the features and how they work. Add it to the root of your repo as `video.mp4` when you push. If it's too large for GitHub (over 100 MB), share a link instead (Drive, YouTube unlisted) and put the link in your README.

On the day, you present a 3-minute live demo with 2 minutes of questions. There's a pre-submission checkpoint at 15:00 so we can see your progress. The live slot stays demo-focused. We judge the technical depth from your submission.

## How we judge

| Criterion | What we look for |
|-----------|------------------|
| UI and UX | Is it clear, pleasant, and usable in a real store? Would a shopper actually use it? |
| Feature completeness | Is the chosen capability built end to end and working, not just mocked up? |
| Scandit implementation | Is Scandit's scanning or AR used correctly and as a real part of the experience, not bolted on? |
| Smart AI implementation | Is the AI used in a genuinely helpful, well thought out way? |
| Uniqueness | Is there a fresh angle on the in-store problem? |

## Useful links

- Scandit skills (install instructions): https://github.com/Scandit/skills
- Scandit documentation: https://docs.scandit.com
