# Founder portraits

Two files are expected here. Until they exist, the site shows the brand seal
inside the portrait frame instead of a broken image, so nothing looks wrong.

| File | Who |
|---|---|
| `clarence-allouard.jpg` | Clarence Allouard |
| `clement-puig.jpg` | Clement Puig |

## Specification

- **Aspect ratio 4:5** (portrait). The frame crops to 4:5, so anything else
  loses the top and bottom.
- **800 x 1000 px** is the target. Larger is fine, it will scale down.
- **JPEG**, quality 80, under 250 KB each. Compress before committing.
- Face in the upper half. A caption bar sits across the bottom of the frame.
- Plain or quiet background. The page ground is `#F4F1EA` and the frame is
  `#0A0A0A`, so a busy background fights both.

## Where the photos should come from

Export them from the source, not from a LinkedIn page. A LinkedIn profile
image is served at low resolution and downloading one is not a reliable or
permitted way to source it. Use the original file from whoever took the photo,
or take two new ones against a plain wall.

## After adding them

Nothing else to change. The filenames above are already referenced in
`/who-we-are/index.html`. Commit the files and the portraits appear.
