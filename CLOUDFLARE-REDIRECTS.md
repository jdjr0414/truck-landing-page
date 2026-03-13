# Cloudflare Redirect Setup

**No HTML redirect pages exist.** All redirects are server-side 301 only (via `_redirects`).

The `_redirects` file works automatically with **Cloudflare Pages**. No extra setup needed.

If you use **Cloudflare** with Workers, or need to add redirects in the dashboard:

## Option 1: Redirect Rules (Dashboard)

1. Cloudflare Dashboard → your domain → **Rules** → **Redirect Rules**
2. Create rule → **Dynamic redirect**
3. Add each redirect:

| When incoming requests match | Then | Type |
|------------------------------|------|------|
| URI Path equals `/semi-truck-financing.html` | `/vehicles/semi-truck-financing.html` | 301 |
| URI Path equals `/dump-truck-financing.html` | `/vehicles/dump-truck-financing.html` | 301 |
| URI Path equals `/box-truck-financing.html` | `/vehicles/box-truck-financing.html` | 301 |
| URI Path equals `/vac-truck-financing.html` | `/vehicles/vac-truck-financing.html` | 301 |
| URI Path equals `/tow-truck-financing.html` | `/vehicles/tow-truck-financing.html` | 301 |
| URI Path equals `/bucket-truck-financing.html` | `/vehicles/bucket-truck-financing.html` | 301 |
| URI Path equals `/service-truck-financing.html` | `/vehicles/service-truck-financing.html` | 301 |
| URI Path equals `/truck-financing-for-construction-companies.html` | `/industries/construction-truck-financing.html` | 301 |
| URI Path equals `/truck-financing-for-utility-contractors.html` | `/industries/utility-contractor-truck-financing.html` | 301 |
| URI Path equals `/truck-financing-for-environmental-services.html` | `/industries/environmental-service-vehicle-financing.html` | 301 |
| URI Path equals `/fleet-truck-financing.html` | `/guides/commercial-fleet-financing-guide.html` | 301 |

**If your site lives at a subpath** (e.g. `axiantpartners.com/truckhub/`), prefix paths with `/truckhub`:
- From: `/truckhub/semi-truck-financing.html`
- To: `/truckhub/vehicles/semi-truck-financing.html`

## Option 2: Bulk Redirects

1. **Rules** → **Bulk Redirects** → **Create list**
2. Add redirects in bulk (Source URL → Target URL, 301)

## Option 3: Cloudflare Pages

`_redirects` is read automatically. Deploy as usual; no dashboard config needed.
