# Multi-Site Inventory Exporter (Chrome Extension)

Captures product table rows from supplier catalog pages and lets you:

- Download captured data as JSON
- Download captured data as CSV
- Send captured data to an InvenTree API endpoint
- Optionally map and include per-product image URLs
- Optionally upload images to InvenTree when part IDs are returned by the endpoint

## What This Is Good For

- Building an import staging file from McMaster category listings
- Sending raw captured rows to a custom InvenTree plugin endpoint
- Keeping a repeatable workflow before final InvenTree part creation
- Working across multiple source sites with one extension

## Install (Developer Mode)

1. Open `chrome://extensions`
2. Enable Developer mode
3. Click **Load unpacked**
4. Select this folder: `chrome-multi-site-inventree-export`

## Integration Tests

This extension includes Playwright-based integration tests that load the real extension in Chromium and validate popup/background behavior.

### What Is Covered

- Popup renders and exposes multi-source capture options.
- Settings persist via `chrome.storage.local` and reload correctly.
- Validation errors appear when actions are attempted without a capture.
- Unsupported-page capture behavior returns a user-visible error.
- Linked-page preview behavior on unsupported pages returns zero results safely.

### Run Tests

From this extension folder:

```bash
npm install
npm run test:integration
```

Notes:

- Tests launch Chromium with the extension loaded.
- The default run mode is headed because Chromium extension testing requires extension support at runtime.
- A GitHub Actions workflow is included at `.github/workflows/integration-tests.yml` to run the same suite on push and pull requests.

## Usage

1. Open a supported supplier page.
2. Open the extension popup.
3. Choose `Capture Source` (or leave `Auto Detect`).
4. If using Bolt Depot parent category pages, optionally enable linked-page crawl.
5. Optionally click **Preview Linked Pages**.
6. To choose child pages, use the filter box, Select All/Clear All, Select Filtered/Clear Filtered, Invert Visible, and individual checkboxes.
7. Click **Capture Current Page**.
8. Review the row count and preview.
9. Either:
   - Click **Download JSON** or **Download CSV**, or
   - Fill InvenTree URL/token/endpoint and click **Send To InvenTree**.

## Supported Sources

- McMaster-Carr category table pages.
  - Optional linked-page preview/selection/crawl for filter/refinement child pages.
- Bolt Depot pages:
  - Direct table pages.
  - Parent pages with size/thread links (one-level crawl to linked child pages).
  - Preview/filter/select workflow lets you include only chosen child links.

## InvenTree Endpoint Notes

The extension posts a JSON payload to your configured endpoint path.
Default endpoint path is:

- `/api/plugin/product-import/`

You can change it to any path that accepts your payload.

### Authorization Header

The extension sends:

- `Authorization: Token <your_token>`
- `Content-Type: application/json`

## Optional Product Images

The popup includes image options:

- `Image URL header (optional)`: explicit header name to use for image URL extraction.
- `Include image URL in exported/sent items`: adds `image_url` to exported JSON/CSV and POST payload items.
- `Upload images to InvenTree if part IDs are returned`: after a successful send, attempts image upload for each returned part ID.
- `Part upload path`: defaults to `/api/part/{id}/upload/`.
- `Part ID response path`: optional JSON path to IDs in response (dot path with `[]`), e.g. `created_parts[].id` or `data.parts[].pk`.
- `Test Path`: validates the configured path against the last saved API response body.
- `Existing match strategy`: choose whether matching existing parts are skipped or marked for update.

Notes:

- Image upload is best-effort and depends on your InvenTree/API response shape.
- If your API response shape is custom, set `Part ID response path` so image upload can map IDs reliably.
- If no part IDs are present in the send response, image upload is skipped safely.
- For table pages where rows do not include direct images, extraction now applies a section-level product image fallback and marks `RowImageSource`.

## Existing Match Strategy

Before sending payload items, the extension can check existing InvenTree parts using `GET /api/part/?search=...` and match by exact `IPN` or exact `name`.

- `Skip matching existing entries`: matching items are omitted from payload.
- `Update matching existing entries`: matching items stay in payload and include `existing_part_id` with `sync_action: update`.

Notes:

- Strategy metadata is also included in payload `options.existing_match_strategy` for compatible server-side handling.
- Matching uses best-effort heuristics (supplier part number, MPN, then name) and may require endpoint-specific logic for strict control.

### Payload Shape

```json
{
  "source": "mcmaster-carr",
  "captured_at": "2026-06-26T12:34:56.000Z",
  "page_title": "Fasteners",
  "page_url": "https://www.mcmaster.com/...",
  "header_list": ["Part Number", "Description", "ProductURL", "McMasterPartNumber"],
  "item_count": 2,
  "items": [
    {
      "name": "...",
      "description": "...",
      "mpn": "...",
      "supplier_part_number": "...",
      "supplier_link": "https://www.mcmaster.com/...",
      "source_fields": ["Part Number", "Description", "ProductURL", "McMasterPartNumber"],
      "raw": {
        "Part Number": "...",
        "Description": "...",
        "ProductURL": "...",
        "McMasterPartNumber": "..."
      }
    }
  ]
}
```

## Header Mapping Hints

You can enter optional header names in the popup to improve mapping for:

- Name
- Description
- MPN
- Supplier part number

The extension also applies fallback header names when hints are blank.

## Notes and Limitations

- Extraction targets the most likely product table on each page using heuristics.
- If a page has unusual structure, row capture may need adjustment.
- Direct creation of InvenTree parts is intentionally not hard-coded; this extension sends a flexible payload suitable for a plugin or import step.
