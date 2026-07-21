# Channel Health Management

## Health Check

Run a full health check against all channel URLs:

```bash
npm run check:channels
```

This reads `src/data/channels.ts` and `src/data/pildunChannels.ts`, issues a HEAD request to every stream URL with an 8-second timeout and 10-way concurrency, and writes the results to `scripts/channel-health-report.json`.

## Sync Results

After generating a fresh report, sync the results back into the channel data files:

```bash
npm run sync:health
```

This flags DEAD channels with `verified: false` and marks channels on known CORS-restrictive domains with `needsProxy: true`.

## Recommended Workflow

Run both steps together after each channel catalog refresh:

```bash
npm run check:channels && npm run sync:health
```

## Periodic Re-checks

IPTV sources go offline frequently. Re-run the health check weekly (e.g., via a GitHub Action scheduled workflow) to keep the dead-channel flags current.
