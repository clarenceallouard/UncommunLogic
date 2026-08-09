# Security review — www.uncommunlogic.com

Reviewed 9 August 2026 against the code in this repository at the commit that
introduced it. Reviewer: internal. No external penetration test has been
commissioned, and this document does not claim one.

## 1. What this site is, in security terms

| Property | Value |
|---|---|
| Type | Static HTML, CSS and JavaScript |
| Server-side code | None |
| Database | None |
| Authentication | None. No accounts, no login, no session |
| Payments | None. No card data, no payment processor, no redirect to one |
| Forms posting to a server | None |
| Cookies set by this site | None |
| Third-party scripts | None |
| Third-party frames | One, optional: Google Calendar on `/book/` only |
| Host | GitHub Pages |

The attack surface is therefore: the host, the DNS, the repository, the one
optional embed, and the browser-side code. There is no application to exploit
and no data at rest to steal, because the site holds none.

## 2. Controls in place

**Content-Security-Policy.** Every page carries a policy delivered by
`<meta http-equiv>`:

```
default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self';
font-src 'self'; connect-src 'self'; media-src 'self'; manifest-src 'self';
base-uri 'none'; form-action 'none'; upgrade-insecure-requests
```

`/book/` adds `frame-src https://calendar.google.com` and nothing else.

Two consequences are enforced by the code, not by convention:

- **No inline script anywhere.** Not one `<script>` block with a body, not one
  `onclick` attribute. Verified by scanning every HTML file. The capability
  class that would normally be set inline is set by `/assets/js/boot.js`
  instead, precisely so the policy can forbid inline execution.
- **No inline style attributes.** Dynamic values are written through the CSSOM
  (`element.style.setProperty`), which CSP does not govern, so `style-src`
  stays at `'self'` without an `'unsafe-inline'` escape hatch.

`default-src 'none'` means anything not explicitly allowed above is blocked:
no XHR to a third party, no web socket, no object, no worker.

**No third-party requests on page load.** Typefaces are self-hosted WOFF2, not
Google Fonts. There is no CDN, no tag manager, no analytics, no chat widget and
no social embed. A visit to this site tells no other company that the visit
happened. This is a privacy control and a supply-chain control at the same
time: there is no third-party script that could be compromised upstream and
served into our pages.

**No user input reaches a server.** The brief builder on `/contact/` runs
entirely in the browser and hands the composed message to the visitor's own
mail client via a `mailto:` URL. Nothing is transmitted, logged or stored by
us. `form-action 'none'` blocks any form submission outright, including one
injected by a malicious extension.

**Output encoding.** The catalogue on `/solutions/` is the only page that
builds HTML from data. Every value interpolated into markup passes through an
escaping function that encodes `& < > " '`. The data file is our own,
same-origin, and fetched with `credentials: 'omit'`.

**The one embed is validated before it is used.** `/assets/js/booking.js`
parses the configured booking URL and refuses it unless the scheme is `https:`
and the host is exactly `calendar.google.com`. A mistyped or substituted URL in
the config file produces no frame at all rather than an embed of somewhere
else. The CSP `frame-src` is the second line of defence behind that check.

**Transport.** HTTPS only, with `upgrade-insecure-requests` in the policy.
GitHub Pages provisions and renews the certificate.

**Referrer discipline.** `<meta name="referrer" content="strict-origin-when-cross-origin">`
on every page. External links use `rel="noopener noreferrer"`. The booking
iframe carries `referrerpolicy="no-referrer"`.

**Anti-harvesting.** The contact address is injected at runtime from
`/assets/js/config.js` rather than sitting in the served HTML, which defeats
the simplest scraping. This is friction, not protection: a headless browser
still gets it. The terms of use prohibit harvesting and cite the *Spam Act
2003* (Cth), which is the actual remedy.

**Disclosure route.** `/.well-known/security.txt` per RFC 9116, with a contact
address, an expiry date and a scope note.

## 3. Known gaps, stated plainly

**A. Security headers cannot be set on GitHub Pages.** This is the real
limitation of the current hosting and it affects three things:

| Header | Effect of its absence | Severity here |
|---|---|---|
| `Content-Security-Policy: frame-ancestors` | The site can be framed by another origin, so clickjacking is possible. Note that `frame-ancestors` is *ignored* in a `<meta>` tag, so it is not in our policy and it cannot be. | Low. There is nothing to click that performs an action: no forms, no auth, no payment. The worst outcome is a passing-off framing of our brand. |
| `Strict-Transport-Security` | First-visit downgrade is theoretically possible before the redirect to HTTPS. | Low. GitHub Pages enforces HTTPS when "Enforce HTTPS" is enabled, which it must be. |
| `X-Content-Type-Options: nosniff` | MIME sniffing. | Very low. All content types served are correct and there are no user uploads. |

**Fix, when it is worth doing:** put Cloudflare (free tier) in front of the
domain and set the three headers there. That is a thirty-minute change, it
does not touch this repository, and it also removes the meta-tag CSP's
limitations. Until then the gaps above stand as written.

**B. The Google Calendar embed is third-party code in our page.** If the
booking URL is configured, Google's script runs in that frame, sets Google's
cookies and receives whatever the visitor types into it. We cannot audit it and
we cannot switch off its cookies. Mitigations in place: it is on one page only,
`frame-src` allows that one host and no other, email and phone are offered on
every page as an equal route, and the cookie notice says exactly what the embed
does.

**C. Repository and account security is the actual weak point.** With no
server to attack, the realistic path to defacing this site is compromising a
GitHub account with push access, or the domain registrar. Required, and outside
this repository:

- Hardware or app-based multi-factor authentication on every GitHub account
  with write access to `clarenceallouard/UncommunLogic`.
- Branch protection on `main`, so a deploy cannot happen by accident.
- Multi-factor authentication and registrar lock on the `uncommunlogic.com`
  registrar account.
- The `CNAME` file in this repository is what binds the domain. Anyone who can
  edit it can move the site. Treat it as a production credential.

**D. Domain takeover of the DNS record.** If the GitHub Pages site is ever
deleted while the DNS `CNAME` still points at it, another GitHub user can claim
the name and serve content on our domain. Do not delete the Pages site without
first removing the DNS record.

**E. No independent test.** No penetration test, no automated dependency
scanning (there are no dependencies to scan), no third-party accessibility or
security audit. This review is self-assessed.

## 4. What was checked, and the result

| Check | Method | Result |
|---|---|---|
| Inline script present anywhere | Scan of all 18 HTML files | None |
| Inline `style` attributes | Scan of all HTML files | None |
| Inline event handlers (`onclick`, `onerror`, …) | Scan of all HTML files | None |
| CSP present on every page | Scan of all HTML files | 18 of 18 |
| Console errors on load | Browser, every page | None, other than the two founder photographs that are not yet supplied |
| CSP violations at runtime | Browser console | None |
| Third-party network requests | Network panel, cold load | None, unless the booking embed is configured |
| Broken internal links | Static resolution of every `/`-rooted `href` | None of 100+ |
| HTML injection in the catalogue | Read of the interpolation path | Escaped |
| Booking URL validation | Test with a foreign host and a malformed URL | Rejected, no frame rendered |
| Text contrast | WCAG 2.1 luminance formula against computed styles, home, catalogue and privacy pages, dark and light surfaces, panel open | 0 failures |
| Focusable elements without an accessible name | Browser query | 0 of 115 |

## 5. If the site ever grows

Each of these changes the analysis above, and each requires this document and
the privacy and cookie notices to be updated **before** it ships:

- **Adding analytics.** Introduces a third-party script, third-party cookies
  and a `connect-src` exception. It also makes the cookie notice, which
  currently says we run none, untrue.
- **Adding a contact form.** Introduces a processor, personal information in
  transit and at rest, a `form-action` exception, and spam handling. Prefer a
  provider that will sign a data processing agreement, and say who it is in the
  privacy notice.
- **Adding a client portal or any login.** A different class of application
  entirely. Do not bolt it onto this repository.
- **Publishing case studies with client data.** Requires written client
  consent, and the confidentiality obligations in the engagement terms apply.

## 6. Actions, in priority order

1. Enable "Enforce HTTPS" in the repository's GitHub Pages settings. **Verify
   this now**, it is a checkbox and it is the single most important control.
2. Turn on multi-factor authentication for every account with push access, and
   for the domain registrar.
3. Add branch protection to `main`.
4. Decide whether the booking embed is used. If it is, re-read section 3B and
   confirm the cookie notice matches what is live.
5. Optional, when convenient: front the domain with Cloudflare and set
   `Strict-Transport-Security`, `X-Content-Type-Options` and
   `Content-Security-Policy: frame-ancestors 'none'`.

Items 1 to 3 are configuration outside this repository and cannot be done from
here.
