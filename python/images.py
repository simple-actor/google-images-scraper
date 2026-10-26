"""Google Images results for a search, one row per image, written to images.csv:
the full-size address and its size, the page it is on, and Google's licence label.

    APIFY_TOKEN=... python images.py "lisbon tram 28"
    APIFY_TOKEN=... LICENCE=cc MIN_WIDTH=3000 python images.py "lisbon tram 28"
"""
import csv
import os
import sys

from apify_client import ApifyClient

query = " ".join(sys.argv[1:])
if not query:
    sys.exit('Give a search, e.g. python images.py "lisbon tram 28"')
client = ApifyClient(os.environ["APIFY_TOKEN"])

run_input = {
    "queries": [query],
    "maxItems": int(os.environ.get("MAX_IMAGES", 100)),  # Google has roughly 300-400 a search
    # Google's Creative Commons label. A label, not a licence: check it on pageUrl.
    "usageRights": "creativeCommons" if os.environ.get("LICENCE") == "cc" else "any",
}
if os.environ.get("MIN_WIDTH"):
    run_input["minWidth"] = int(os.environ["MIN_WIDTH"])  # exact, on Google's stated width
run = client.actor("simple.actor/google-images").call(run_input=run_input)
items = list(client.dataset(run.default_dataset_id).iterate_items())

# A search that could not be read is a row of its own, and the run stays green.
for row in items:
    if row.get("type") == "error":
        print(f"{row['query']}: {row['error']} ({row['errorDescription']})", file=sys.stderr)
images = [r for r in items if r.get("type") == "image"]

columns = ["position", "imageWidth", "imageHeight", "fileSize", "title", "domain", "pageUrl", "imageUrl", "imageId"]
with open("images.csv", "w", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=columns, extrasaction="ignore")
    writer.writeheader()
    writer.writerows(images)

for r in images[:10]:
    print(f"  {r['imageWidth']}x{r['imageHeight']}  {r['domain']}  {r['title'][:50]}")
print(f'{len(images)} image(s) for "{query}" -> images.csv')
