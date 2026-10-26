// Google Images results for a search, one row per image, written to images.csv:
// the full-size address and its size, the page it is on, and Google's licence label.
//
//   APIFY_TOKEN=... node images.mjs "lisbon tram 28"
//   APIFY_TOKEN=... LICENCE=cc MIN_WIDTH=3000 node images.mjs "lisbon tram 28"
import { ApifyClient } from 'apify-client';
import { writeFileSync } from 'node:fs';

const query = process.argv.slice(2).join(' ');
if (!query) throw new Error('Give a search, e.g. node images.mjs "lisbon tram 28"');
const client = new ApifyClient({ token: process.env.APIFY_TOKEN });

const run = await client.actor('simple.actor/google-images').call({
    queries: [query],
    maxItems: Number(process.env.MAX_IMAGES ?? 100), // Google has roughly 300-400 a search
    // Google's Creative Commons label. A label, not a licence: check it on pageUrl.
    usageRights: process.env.LICENCE === 'cc' ? 'creativeCommons' : 'any',
    // Exact, on Google's stated width; leave it out for no floor.
    minWidth: process.env.MIN_WIDTH ? Number(process.env.MIN_WIDTH) : undefined,
});
const { items } = await client.dataset(run.defaultDatasetId).listItems();

// A search that could not be read is a row of its own, and the run stays green.
for (const row of items.filter((r) => r.type === 'error')) {
    console.error(`${row.query}: ${row.error} (${row.errorDescription})`);
}
const images = items.filter((r) => r.type === 'image');

const columns = ['position', 'imageWidth', 'imageHeight', 'fileSize', 'title', 'domain', 'pageUrl', 'imageUrl', 'imageId'];
const cell = (v) => (v == null ? '' : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
writeFileSync('images.csv', [columns.join(','), ...images.map((r) => columns.map((c) => cell(r[c])).join(','))].join('\n') + '\n');

for (const r of images.slice(0, 10)) console.log(`  ${r.imageWidth}x${r.imageHeight}  ${r.domain}  ${r.title.slice(0, 50)}`);
console.log(`${images.length} image(s) for "${query}" -> images.csv`);
