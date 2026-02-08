# Hera Booking — UI Redesign Instructions

## OVERVIEW
Redesign the entire Hera Booking UI to match a luxury, warm, editorial salon aesthetic. The current UI looks generic and bland. I want it to feel premium, elegant, and cohesive — like a high-end beauty brand.

## DESIGN SYSTEM (Apply to ALL pages)

### Color Palette
```css
--cream: #FBF8F4;          /* Main background */
--cream-dark: #F3EDE4;      /* Secondary background, cards */
--ink: #1A1715;              /* Primary text */
--ink-light: #4A4640;        /* Secondary text */
--ink-muted: #8A857E;        /* Muted text, labels */
--rose: #C4686D;             /* Primary accent — buttons, highlights */
--rose-light: #E8A5A8;       /* Light accent */
--rose-pale: #F5DEDE;        /* Badges, tags */
--gold: #C6A96C;             /* Secondary accent — premium feel */
--gold-light: #E8D5A8;       /* Discount badges */
--sage: #7A8F7A;             /* Success, confirmations */
--sage-light: #B5C5B5;       /* Available slots */
--white: #FFFFFF;            /* Cards */
```

### Typography
- Headings: `'Playfair Display', serif` — elegant, editorial
- Body: `'DM Sans', sans-serif` — clean, modern
- Import: `https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap`

### Border Radius
- Cards: 16px
- Buttons: 50px (pill shape)
- Inputs: 12px
- Small elements: 8px

### Shadows
- Small: `0 1px 3px rgba(26,23,21,0.06)`
- Medium: `0 4px 16px rgba(26,23,21,0.08)`
- Large: `0 12px 40px rgba(26,23,21,0.12)`

### Buttons
- Primary: dark ink background (#1A1715), cream text, pill shape, hover lifts up 2px with shadow
- Accent: rose background (#C4686D), white text, pill shape
- Secondary: transparent with 1.5px ink border, hover fills ink
- All buttons: font-weight 600, padding 12px 28px

---

## PAGE 1: BOOKING PAGE (Public — /booking)

Current: Generic white cards, plain layout, no personality
Goal: Warm, inviting, feels like stepping into a luxury salon

### Layout Changes:
1. **Left sidebar** — Keep but restyle:
   - Background: var(--ink) dark sidebar
   - Salon name in Playfair Display, white text
   - Step indicators: use rose accent for active step, cream circles with numbers
   - Booking Policy section: softer styling, use icons with rose/gold colors
   - Add subtle gradient overlay on sidebar

2. **Service cards** — Complete restyle:
   - Background: var(--white) with 1px var(--cream-dark) border
   - Border-radius: 16px
   - Hover: subtle lift (translateY -3px) + medium shadow
   - Service name: DM Sans 600 weight, var(--ink)
   - Description: var(--ink-light), 0.9rem
   - Price: Playfair Display, var(--ink), right-aligned
   - Duration: small badge, var(--cream) background, var(--ink-muted) text
   - Discount badge: var(--gold-light) background with var(--gold) text instead of green, use "20% OFF" in elegant pill shape

3. **Category filters** (All Services, BIAB, Mani & Pedi, Acrylic):
   - Pill-shaped buttons
   - Active: var(--ink) background, var(--cream) text
   - Inactive: var(--cream-dark) background, var(--ink-light) text
   - Hover: smooth transition to active state

4. **Main content area**:
   - Background: var(--cream)
   - "Choose a Service" heading: Playfair Display
   - Subtitle: DM Sans, var(--ink-muted)

### Specialist Selection Page:
- Staff cards: circular avatar with initials (use rose, sage, gold backgrounds)
- Name in DM Sans 600
- Role in var(--ink-muted)
- Selected state: rose border + rose-pale background

### Date & Time Selection Page:
- Calendar: clean grid, today highlighted with rose circle
- Selected date: ink background, cream text
- Time slots: pill-shaped buttons in grid
- Available: var(--cream-dark) background
- Selected: var(--rose) background, white text
- Unavailable: very faint, var(--cream) with strikethrough

### Your Info (Customer Form):
- Input fields: var(--cream) background, 1px var(--cream-dark) border, 12px radius
- Focus state: 1.5px var(--rose) border
- Labels: DM Sans 500, var(--ink-light), above field
- Submit button: full-width var(--rose) pill button

### Confirmed Page:
- Big checkmark in sage circle
- Confirmation details in elegant card
- "Add to Calendar" button in secondary style

---

## PAGE 2: ADMIN DASHBOARD — CALENDAR (/admin/calendar)

Current: Bland grid, generic avatars, no visual hierarchy
Goal: Clean, professional, easy to scan, warm tones

### Top Bar:
- Date: Playfair Display, large (1.5rem)
- "TODAY" badge: var(--rose-pale) background, var(--rose) text, pill shape
- Navigation arrows: var(--cream-dark) circles, hover var(--rose-pale)
- Date picker: styled input with var(--cream) bg
- Search: var(--cream) background, subtle border, rounded
- "+ Add" button: var(--rose) pill button

### Stats Bar:
- "Confirmed: 0" — sage colored badge
- "Total: 0" — ink-muted
- "Staff: 6" — ink-muted
- Background: subtle var(--cream-dark) strip

### Staff Headers:
- Avatar circles: use colored backgrounds (rose, sage, gold, ink rotating) instead of generic dark
- Name: DM Sans 600, var(--ink)
- Role: DM Sans 400, var(--ink-muted), smaller
- "OFF" indicator: var(--rose-pale) badge, var(--rose) text

### Calendar Grid:
- Background: var(--white)
- Grid lines: 1px var(--cream-dark) — very subtle
- Time labels: var(--ink-muted), DM Sans
- Empty slots: var(--cream) background on hover (inviting to click)
- Day off columns: subtle rose-pale background with diagonal pattern or very light crosshatch
- Booked slots: colored blocks with rounded corners (12px)
  - Confirmed: var(--sage-light) background, var(--sage) left border 3px
  - Pending: var(--gold-light) background, var(--gold) left border 3px
  - Hover on slot: lift + shadow

### Admin Sidebar (Left Navigation):
- Background: var(--ink) — dark, elegant
- Logo: Playfair Display, white, with rose dot
- Menu items: cream text, 0.92rem
- Active item: var(--rose) left border 3px, slight cream-dark background tint
- Icons: line-style, cream colored
- "Booking Page" link at bottom: var(--rose) pill button, small

---

## PAGE 3: ADMIN — OTHER PAGES

Apply the same design system to all admin pages:

### Services Page:
- Service list in elegant cards (white bg, cream-dark border, 16px radius)
- Add service button: rose pill
- Edit/Delete: subtle icon buttons

### Staff Page:
- Staff cards with colored avatars
- Clean form for adding/editing staff

### Settings Page:
- Clean form layout
- Section headings in Playfair Display
- Input styling consistent with booking form

### Receipts Page:
- Table with alternating cream/white rows
- Status badges: sage for paid, gold for pending, rose for cancelled

---

## GENERAL RULES:
1. NO generic blue/indigo colors anywhere
2. NO sharp corners (always rounded)
3. NO default system fonts — always Playfair Display + DM Sans
4. Background is ALWAYS cream (#FBF8F4), never pure white for page bg
5. Cards are white (#FFFFFF) on cream background
6. All transitions: 0.2s-0.3s ease
7. Hover states on ALL interactive elements
8. Consistent spacing: use 8px grid (8, 16, 24, 32, 40, 48, 64, 80)
9. Page headings: Playfair Display
10. Body text: DM Sans

## HOW TO IMPLEMENT:
1. First create a global CSS variables file / update globals.css with the design tokens above
2. Update the layout component to import Google Fonts
3. Redesign the booking page components one by one
4. Redesign the admin layout (sidebar + header)
5. Redesign the calendar page
6. Apply consistent styling to all other admin pages
7. Test on mobile — ensure responsive design works

Start with globals.css and the booking page, then move to admin.
