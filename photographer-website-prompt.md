# Photographer Website Prompt

Build a single-file HTML photographer portfolio website with the following specifications:

## Design
- Color palette: soft earth tones using CSS variables — cream (`#f5f0e8`), sand (`#e8ddc8`), taupe (`#c4b49a`), clay (`#a8896a`), umber (`#7a5c42`), bark (`#4a3728`), warm-white (`#faf8f4`), sage (`#9aaa8c`)
- Grain texture overlay on the entire page using an inline SVG `feTurbulence` filter for a warm, analog feel
- Typography: Cormorant Garamond (serif, light/italic weights) for headings and display text, paired with Jost (sans-serif, 200–400 weights) for body and UI
- Do NOT use generic fonts like Inter, Roboto, or Arial

## Animations
- Hero section: staggered fade-up animation on load for eyebrow text, headline, subtext, and CTA button (use `opacity: 0` + `animation: fadeUp` with increasing `animation-delay`)
- Hero image: smooth clip-path reveal animation on page load
- Scroll-triggered fade-up reveals for all sections using `IntersectionObserver` — elements start at `opacity: 0; transform: translateY(40px)` and transition to visible
- Custom trailing cursor: a filled dot that follows the mouse instantly, plus a larger ring that lerps/eases behind it using `requestAnimationFrame`
- Hover lift effects on cards, gallery items, and testimonials (`transform: translateY(-4px to -6px)`)
- Vertical accent line animation on service cards (a left border that grows from `height: 0` to `height: 100%` on hover)
- Sticky nav that gains a frosted glass background (`backdrop-filter: blur`) on scroll

## Sections

### 1. Navigation (fixed)
- Logo on the left (text or image), nav links on the right
- Links: Work, About, Services, Book
- Underline hover animation on nav links
- Becomes frosted/solid on scroll

### 2. Hero (full viewport height)
- Two-column grid: left side has eyebrow text, large serif headline with italic colored word, subheading paragraph, and a CTA button linking to `#book`
- Right side has a large image/visual with a diagonal clip-path reveal
- "Scroll to explore" hint at bottom left with a decorative line

### 3. About
- Two-column layout: image left, content right
- Section label with decorative line prefix, large serif heading, two paragraphs of body text, italic signature in Cormorant Garamond

### 4. Portfolio Grid
- Asymmetric 12-column CSS grid with 8 items spanning different columns/rows
- Each item has an image/color background, scale-on-hover, and an overlay label that fades in on hover with a gradient

### 5. Services & Pricing
- Dark background section (bark color)
- Two-column header: heading left, intro paragraph right
- Three service cards side by side, each with: number label, service name (serif), description, starting price
- Cards have left border accent animation on hover

### 6. Testimonials
- Light background, centered layout
- Three testimonial cards in a row, each with: large quote mark, italic quote text in Cormorant Garamond, client attribution
- Cards lift on hover with a bottom colored border

### 7. Booking Form
- Two-column layout: info on left (location, email, booking window info items with icon boxes), form on right
- Form fields: First Name, Last Name, Email, Session Type (select), Preferred Date, Location, Message textarea
- All inputs are borderless except for a bottom border that changes color on focus
- Submit button spans full width
- On submit: validate required fields, then animate the form out and show a success message

### 8. Footer
- Three-column grid: brand info with logo, navigation links, social/contact links
- Bottom copyright bar

## Technical Requirements
- Everything in a single `.html` file (inline CSS and JS, no external dependencies except Google Fonts)
- Mobile responsive with a breakpoint around 900px (stack all grids to single column)
- Custom cursor: set `cursor: none` on body, implement JS cursor with a dot and trailing ring
- Use `scroll-behavior: smooth` on html
- Embed any logo as a base64 data URI if provided
- Use CSS `@keyframes fadeUp` for entrance animations
- Section reveal: add `.visible` class via IntersectionObserver with `threshold: 0.12`
- Form success state: hide form div, show success div with a fade/slide transition
