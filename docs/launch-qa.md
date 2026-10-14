# Launch QA: Sponsorship Page

Run this on the **live URL** after the Apps Script is deployed and `formEndpoint` is set.
It takes about 15 minutes. Do it once on a phone and once on a computer.

Most of these checks are also covered by an automated browser test during development.
This list is for the parts only a real deployment can prove: the real Sheet, the real
inbox, and real devices.

## 1. First impression (on a phone, 20 seconds)
- [ ] Without scrolling far, can you tell you can either **advertise** or **support the league**, and where to click next?
- [ ] "Opportunities starting at $250" is visible under the hero buttons.
- [ ] After you scroll past the hero, the gold **Become a Sponsor** button appears at the bottom. It hides when the form is on screen.

## 2. Every option
For each card (Field, Jersey, Snack Shack, Digital):
- [ ] The card shows a price, a duration label, and three benefits.
- [ ] **View details** opens the options, exclusivity, and terms. No counts, open slots, or sold-out labels appear anywhere.
- [ ] **Full terms** expands.
- [ ] Each **Inquire about…** button closes the details, scrolls to the form, and shows the right selection under **Your interest**.
- [ ] For Jersey, the Spring/Fall choice matches the button you clicked.
- [ ] The card's own **Inquire →** link preselects the category.

Also check:
- [ ] Bronze, Silver, Gold, and **Discuss a Custom Partnership** each preselect correctly.
- [ ] The **Become a Sponsor** buttons in the header, closer, and mobile bar don't overwrite a choice you already made.

## 3. Test inquiry
First, open the `/exec` URL in a browser. You should see `{"ok":true,"service":"wvfp-sponsorship-inquiries"}`. If you see a Google sign-in page instead, the deployment's access isn't set to **Anyone**.

Submit with a real inbox you can check and a business name like `TEST – delete me`.
- [ ] The confirmation screen appears.
- [ ] A new row appears in the tracker's **Website Inquiries** tab with Status **New Inquiry**, the right "Interested in" value, and the booking season.
- [ ] The owner notification email arrives at sponsors@wvfastpitch.org, replying goes to the test address, and the row's **Email notification** column says `Sent …`.
- [ ] Double-click **Send my inquiry** on a fresh form. Only one row and one email are created.
- [ ] Submit the same email again. The new row shows **Possible duplicate**, and the email subject starts with **[Repeat]**.
- [ ] The owner email includes an **Internal availability** line for the product you picked, matching the Inventory tab.
- [ ] The test business does **not** appear under "Our Community Partners", and the Inventory tab didn't change.
- [ ] Delete the test rows.

## 4. Edge cases
- [ ] Submitting with required fields empty highlights them and doesn't send.
- [ ] Turn off Wi-Fi and submit. The page says it couldn't confirm the inquiry (no thank-you screen). Turn Wi-Fi back on and press Send again. Exactly one row appears.
- [ ] The **Integration Log** tab is empty or only shows expected entries.
- [ ] The form works with the phone keyboard (email/phone keyboards appear, nothing hidden behind the keyboard).
- [ ] Open a deep link, e.g. `…/sponsors/?opportunity=snack-shack#inquire`. It lands on the form with the Snack Shack selected.
- [ ] In the Inventory tab, temporarily set one product's Committed equal to its Capacity. The website looks exactly the same and the option can still be chosen. An inquiry for it goes through, and the owner email says "fully committed". Then revert the change.

## 5. Content sign-off
- [ ] Prices, benefits, and terms match the board-approved program. Then set `pricingStatus: "approved"`.
- [ ] Contact email is correct in the page and the Apps Script.
- [ ] Photos are real WVFP images with releases on file (see `photography-art-direction.md`).
- [ ] Any past supporters listed have been verified.
