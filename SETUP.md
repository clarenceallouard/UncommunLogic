# What still needs you

Nine items. Four block the site being complete, five are judgement calls only
you and Clarence can make. Nothing here is guessed at in the live pages: where
a fact was missing, the page either carries a visible bracketed placeholder or
the section does not render at all.

---

## Blocking

### 1. The ABN

`[to be advised]` appears in two places, as agreed:

- the footer of every page,
- the entity block at the top of all five legal pages.

Search the repository for `[to be advised]` and replace it.

### 2. The State of registration

The legal pages say **`[State of registration to be confirmed]`**, and the
governing-law clause in the terms of use points at "the State identified in the
entity details on this page". A governing-law clause with no State named is not
usable, so this has to be filled before the terms mean anything.

I did not guess. Corematic is in Queensland and you are there, so Queensland is
the likely answer, but guessing a jurisdiction on a legal page is exactly the
kind of thing that should not be inferred.

Search for `[State of registration to be confirmed]`.

### 3. The two founder portraits

Drop these into `assets/founders/`:

- `clarence-allouard.jpg`
- `clement-puig.jpg`

4:5 portrait, 800 × 1000 px, JPEG, under 250 KB. Full specification in
`assets/founders/README.md`.

**Until they exist the page shows the brand seal in the portrait frame**, so
nothing looks broken. Two 404s appear in the browser console and stop the
moment the files land.

**I could not get these from LinkedIn.** Both profile URLs return HTTP 999
behind an authentication wall, so there is no profile photo and no profile text
to read. Export the originals from wherever the photos came from, or take two
new ones against a plain wall. Per your instruction there are no LinkedIn links
anywhere on the site.

### 4. Clarence's background

The `who-we-are` page gives Clarence a role and a paragraph that are true from
what I was told: co-founder, first point of contact, runs the first hour, holds
the costing document. His background list is **not published**, because I have
no verified source for it and I will not invent one.

In `who-we-are/index.html`, find the comment block marked
`BACKGROUND, TO BE SUPPLIED BY CLARENCE`. Three to five lines in the same shape
as the list under Clement's name, then remove the `hidden` attribute from
that `<ul class="cvlist" hidden>`.

Your own background is published from your CV: IÉSEG, St Xavier's Mumbai, IBB
France / Asahi Group, Corematic Europe, Metal Global Concept, with the figures
your CV states (221 stores, 550 visits, 200+ listings, an 80-page market
analysis). Check that you are happy with all of it being public.

**One thing I deliberately left out:** your current position at Corematic
Australia. It is not on the site. Publishing a current employer alongside a
competing consultancy is a conflict-of-interest question and a decision for
you, not a formatting one. Tell me either way.

---

## Judgement calls

### 5. The Google Calendar booking page

The booking page is built and tested. It needs one URL.

1. Google Calendar → **Create** → **Appointment schedule**.
2. Set it to 60 minutes, and set your real availability.
3. **Open booking page** → **Share** → copy the link.
4. Paste it into `bookingUrl` in `assets/js/config.js`.

Nothing else to change. With the URL set, the page embeds the scheduler and
demotes the email-and-phone panel to a secondary option. With it empty, the
page shows email and phone as the primary route, which is a perfectly good
booking page on its own.

Two consequences to be aware of, both already written into the cookie notice:
the embed is Google's code in our page, and it sets Google's cookies. If you
would rather keep the site entirely free of third parties, leave `bookingUrl`
empty and the notice stays accurate either way.

An appointment schedule needs a Google Workspace plan that includes the
feature. If your plan does not, leave it empty.

### 6. "Forum": I read it as publishing, not a discussion board

You asked for "de quoi poster des forum". I built **Notes**: a publishing
section with three real pieces already written, an index, and a template with a
checklist. Adding a post is copy a file, edit it, add one row, push.

If you actually meant a discussion forum where visitors post and reply, that
needs accounts, a database, moderation and a login, all of which contradict
"les gens n'ont pas besoin de se connecter". Say the word and I will scope it
separately.

The three pieces published are: why we cost the return before quoting, what we
will not build, and why seven days is a constraint rather than a promise about
everything. They are statements of your own method, so nothing in them is
invented. Read them before they go public, they are written in your voice and
they commit you to things.

### 7. The words "ROI guarantee" are not on the site, on purpose

You said "on va garantir le ROI avant de pricer la solution". What the site
says is that you **calculate and evidence** the return before you price, and
that the price is set at one week to one month of it.

That is deliberate. An unqualified "guaranteed ROI" on a public website is a
representation about a future matter under section 4 of the Australian Consumer
Law: if challenged, the burden falls on **you** to show you had reasonable
grounds for it, and without that it is misleading conduct under section 18.
"We show you the return and the arithmetic before you see the price" is just as
strong commercially, and it is defensible.

If you do want to guarantee an outcome contractually, that is a real option,
but it has to be a clause in the engagement terms with a defined measurement
method and a defined remedy. It is not a headline. Tell me and I will draft it.

### 8. Two promises on the site you should confirm you can keep

Both are stated as commitments and both are yours to honour:

- **"You will hear back within one business day"** on the contact page.
- **"We will reply within five business days"** on the accessibility page.

Say the word and I will soften or remove either.

Also confirm: **the first hour is free**. The site says so in six places. Note
that the brand guidelines use an illustrative line about invoicing one hour, so
the two documents currently disagree. I followed the process you described.

### 9. The legal pages are drafts, not advice

I am not your lawyer and these are not legal advice. They are carefully written
and they cite real Australian law: the *Privacy Act 1988* (Cth) and the
Australian Privacy Principles, section 6D on small business operators, the
Notifiable Data Breaches scheme in Part IIIC, the Australian Consumer Law in
Schedule 2 to the *Competition and Consumer Act 2010* (Cth), the *Spam Act
2003* (Cth), the *Copyright Act 1968* (Cth) and the *Disability Discrimination
Act 1992* (Cth).

Two things to have checked by an Australian practitioner before you rely on
them:

- **The privacy notice states you are probably exempt** as a small business
  operator under section 6D, and that you comply with the Australian Privacy
  Principles voluntarily anyway. That is accurate and it is good positioning,
  but voluntarily binding yourself is a real commitment, so read section 7 of
  that page and make sure you can actually do what it says about client data.
- **Australian privacy law has been moving.** I have avoided asserting the
  status of reform, and the notice carries a version and a review date rather
  than a claim of current compliance. Have it reviewed once.

A one-hour review by a small-business commercial lawyer will cost less than the
first job this site wins you.

---

## Verified before handover

- 18 pages, every internal link resolves, no 404s inside the site.
- Zero console errors, zero Content-Security-Policy violations at runtime.
- Zero contrast failures under the WCAG 2.1 formula, measured against computed
  styles on light and dark surfaces, including the catalogue panel open.
- 115 focusable elements, all with an accessible name.
- No inline script, no inline style attribute, no inline event handler anywhere,
  which is what lets the policy forbid inline execution.
- No third-party request on load. Fonts are self-hosted.
- Catalogue: 78 items, 11 families, 8 filters, all driven from one JSON file.
- Booking logic tested both ways: no URL configured, and a configured
  `calendar.google.com` URL. A URL on any other host is rejected.
- Tested at 1440 px and at 390 px.

## Not verified

- Any browser other than Chromium. Safari and Firefox behaviour on the
  scroll-linked rail and `@view-transition` is untested.
- Real-device iOS and Android.
- Screen readers. No testing across a reader and browser matrix, and the
  accessibility statement says so rather than claiming conformance.
- Search Console and the sitemap have not been submitted. Do that once the
  domain is live: <https://search.google.com/search-console>.
- The name. The brand brief flags this and it is still open: no prior-use
  search has been done on `uncommun` or `uncommon`, no IP Australia trade mark
  search, nothing. That is a real commercial risk sitting under a live website.
