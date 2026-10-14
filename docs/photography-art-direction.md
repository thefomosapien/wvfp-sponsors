# Sponsorship Page: Photography Art Direction

The sponsorship page uses seven images, and each one has a specific job. This
brief covers what each image needs to show so the set reads as one consistent
collection. Picking random softball photos for each spot won't give that result.

**Preview the placements:** open the site with `?slots` added to the URL (for example,
`index.html?slots`). Every image placement is then outlined and labeled with its brief.

**Replacing an image:** each placement has a fixed filename in `assets/img/photos/`.
Export your image at the listed ratio and size, overwrite the file, and keep the
filename the same.

## Two kinds of images

| Type | Purpose | Used for |
| --- | --- | --- |
| **Documentary photography** | Emotional connection. Real WVFP players, coaches, families, and moments. | Hero, About, Custom partnerships |
| **Placement photography / mockups** | Shows businesses exactly where their sponsorship appears. | Field, Jersey, Snack Shack, Digital |

## The look (all documentary images)

- Natural light, ideally golden hour.
- Warm color grading with a little film texture. Avoid artificial "vintage" filters, heavy blur, or HDR.
- Authentic expressions and plenty of environmental context: dirt, chalk lines, fences, dugouts, bleachers.
- The page adds a light warm grade (`.photo` in the CSS). Deliver images neutral-to-warm, not pre-tinted.
- Show the girls as athletes and teammates. Avoid posed, staring-at-camera shots.

## Placements

### 1. Hero: the community in action
**File:** `hero.jpg` · **Ratio:** 2:1 (16:9 minimum) · **Size:** 2400 × 1200 px

- **Show:** a wide shot of a real WVFP game taken from the spectator side. Players on the field, with families along the fence or in the foreground.
- **Message:** softball brings the whole community together.
- **Composition:** headline copy sits over the **left third**. Keep that area darker and uncluttered, and put the interesting subjects center-right. The page adds a deep red-to-brown overlay on the left.
- **Avoid:** close-ups of softballs, empty fields, professional stadiums, and tight action crops that lose the community.

### 2. About WVFP: friendship and belonging
**File:** `about.jpg` · **Ratio:** 4:5 portrait · **Size:** 1200 × 1500 px

- **Show:** two or three WVFP players sitting together, laughing, talking, or sharing a moment between games.
- **Message:** supports the headline "More than softball. It's a tradition." The theme is friendship, confidence, and belonging.
- **Composition:** subjects interacting naturally, with a hint of the dugout, bleachers, or field. A "Play with heart." label overlaps the lower-left corner, so keep faces out of the bottom-left 20%.
- **Avoid:** staged team portraits, trophy presentations, and isolated action shots.

### 3. Field sponsorship: the advertising opportunity
**File:** `field.jpg` · **Ratio:** 4:3 · **Size:** 1600 × 1200 px

- **Show:** a real WVFP field with a professionally designed sponsor banner installed on the fence.
- **Final asset:** build two branded mockups from actual WVFP field photos: (a) a **six-logo shared banner** and (b) a **large dedicated banner**. The card uses one; the "View options" modal already shows a diagram of both.
- **Composition:** fence and signage are the subject, with enough of the diamond to establish the setting.
- **Avoid:** a cropped banner graphic with no environment.
- **Accuracy:** the shared banner must not look like it gets the same exposure as a dedicated banner.

### 4. Jersey sponsorship: the actual sponsor placement
**File:** `jersey.jpg` · **Ratio:** 4:3 · **Size:** 1600 × 1200 px

- **Show:** a WVFP player in the official recreational uniform, framed so that the sponsor logo location is clearly visible.
- **Composition:** tight medium shot of the shoulder and torso, with the field in the background.
- **Accuracy:** use the approved jersey colorway and the real sponsor location. A mockup is fine until real jerseys exist.
- **Avoid:** uniforms that don't match WVFP's actual jerseys or sponsor placement.

### 5. Snack Shack: the gathering place
**File:** `snack-shack.jpg` · **Ratio:** 4:3 · **Size:** 1600 × 1200 px
*(Currently an illustrated placeholder in the HTML. To swap in a photo, replace the `.shack` mockup markup in the Snack Shack card with an `<img class="photo" src="assets/img/photos/snack-shack.jpg">`.)*

- **Show:** WVFP's actual Snack Shack on a busy game day, with service windows, parents, and players.
- **Final asset:** add the "Snack Shack presented by [Business]" signs as a realistic mockup on the doors or other approved locations.
- **Composition:** wide enough to show both sign locations and the surrounding activity.
- **Avoid:** generic food photography. Use an empty building only as the base for the placement mockup.

### 6. Digital sponsorship: our real website
**No photograph.** The card uses a branded browser-and-phone mockup built in HTML/CSS. It shows a sponsor logo in its intended placement, annotated "Sitewide sponsor placement" and "Clickable business logo."

- **Upgrade later:** replace the mockup with a screenshot-based mockup of the real wvfastpitch.org once the sitewide sponsor strip exists. Keep both annotations.

### 7. Custom partnerships: what investment makes possible
**File:** `custom.jpg` · **Ratio:** 16:9 · **Size:** 2400 × 1350 px

- **Show:** a coach helping a young player, teammates encouraging each other, or a team celebrating together.
- **Message:** aspirational. This is what significant community investment makes possible.
- **Avoid:** renderings of a future facility, unless they are clearly labeled as concepts, and anything implying a project already exists.

### Not photographed
- **Community Supporter levels (Bronze, Silver, Gold):** typographic cards only. Levels are distinguished by type, borders, and restrained metal-tone accents.
- **Community Partner directory:** real sponsor logos only, never stock imagery.

## Inventory

| Placement | File | Type | Ratio |
| --- | --- | --- | --- |
| Hero | `hero.jpg` | Documentary: wide community game day | 2:1 |
| About WVFP | `about.jpg` | Documentary: candid friendship | 4:5 |
| Field sponsorship | `field.jpg` | Placement: real field + banner mockup | 4:3 |
| Jersey sponsorship | `jersey.jpg` | Placement: uniform + sponsor location | 4:3 |
| Snack Shack | `snack-shack.jpg` | Placement: real building + sign mockup | 4:3 |
| Digital sponsorship | — (HTML mockup) | Placement: website + phone | 4:3 |
| Custom partnerships | `custom.jpg` | Documentary: coach/team moment | 16:9 |

## Current placeholders

The images in `assets/img/photos/` now are **stand-ins** carried over from the brand guide's mockups.
They show the intended composition and ratio for each slot but are not real WVFP photos.
Replace them before launch.

## Permissions (required)

- Get written permission from a parent or guardian for any **identifiable minor**. The release must cover use in **sponsorship and fundraising materials**, not just league communications.
- Prefer images where players are not named. Never pair a photo with a player's full name on this page.
- Keep a record of releases alongside the original files.
- Confirm WVFP owns or has a license for every image, including images from volunteer parent photographers.
