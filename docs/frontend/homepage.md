## 1. Overall Theme & Style

**Theme:**  
A dark, futuristic yet classic web3 look that balances cutting‑edge motion and interactivity with clean, legible design. Think “DeFi meets modern art” with a slightly industrial edge.

**Color Palette:**  
- **Primary Background:** Deep charcoal/dark slate – HEX `#121212`  
- **Accent 1 (Neon Blue):** HEX `#00E0FF` for highlights, buttons, and hover borders  
- **Accent 2 (Electric Purple):** HEX `#BB00FF` used sparingly for secondary callouts  
- **Text – Primary:** Crisp white – HEX `#FFFFFF`  
- **Text – Secondary:** Light grey – HEX `#B0B0B0`  
- **Borders/Shadows:** Subtle, using translucent white (e.g. rgba(255, 255, 255, 0.1))  

**Typography:**  
- **Headings & Hero Text:** Use *Montserrat* (Bold weight, e.g. 700) with sizes ranging from 48px (hero) down to 24px for section titles.  
- **Body Copy & Descriptions:** Use *Inter* (Regular weight, 400) with sizes around 16px–18px.  
- **Buttons & Captions:** Also Montserrat, medium weight (500) with uppercase styling for clarity.  
- **Fallback:** Sans-serif stacks in case of unavailable fonts.

---

## 2. Layout & Structure

### A. **Overall Page Layout**
- **Grid System:** Use the “Layout Grid” component to create a responsive 12‑column layout.  
- **Spacing:** Standardized margins/padding (e.g., 20px – 40px between sections) with generous whitespace to let interactive animations breathe.
- **Background Effects:**  
  - **Aurora Background:** Use as a full‑page backdrop with subtle “Gradient Animation” to gently shift hues.  
  - **Background Beams / Background Lines:** Apply as accent overlays in hero and feature sections for depth.
  
### B. **Navigation & Header**
- **Navbar:**  
  - **Component:** *Floating Navbar* combined with *Navbar Menu*  
  - **Placement:** Sticky at the top, spanning full width.  
  - **Left:** Your logo – use a **3D Pin** effect on your logo icon for a futuristic, tactile feel.  
  - **Right:** Menu items (Home, Features, Roadmap, Docs, Contact) with *Text Hover Effect* to change to Accent 1 (Neon Blue) on hover.
- **Additional Touch:**  
  - A subtle “Lamp effect” behind the logo in the navbar for extra emphasis.

---

## 3. Detailed Homepage Sections

### **Hero Section (Above the Fold)**
- **Background:**  
  - Use **Aurora Background** layered with **Wavy Background** and subtle **Gradient Animation**.  
  - Add **Glowing Stars** or **Shooting Stars** for dynamic motion.
- **Hero Content Layout:**  
  - **Left Side (Text):**  
    - **Headline:** “Decentralized Solana Lending, Redefined”  
      - Font: Montserrat, 48px, Bold, white with a slight neon outer glow (via CSS shadow in Accent 1).  
    - **Subheadline:** “Empowering DeFi with Trustless Smart Contracts – Fast, Secure, and Community Driven”  
      - Font: Inter, 18px, light grey.  
    - **Dynamic Text Element:** Use **Text Generate Effect** or **Typewriter Effect** to cycle through key phrases (e.g., “Low Fees”, “High Security”, “Instant Settlements”).  
    - **Call-to-Action Button:**  
      - Component: *Tailwind CSS buttons* styled with a **Glowing Effect** on hover.  
      - Text: “Launch App”  
      - Use Accent 1 as the background, with a subtle border using *Hover Border Gradient*.
  - **Right Side (Visual):**  
    - An interactive “device mockup” featuring your lending dashboard.  
      - Wrap it in a **Macbook Scroll** component so that as the user scrolls, parts of your app UI are revealed.
    - Optionally, overlay with a **Canvas Reveal Effect** for added interactivity.

### **Features Section**
- **Background & Transition:**  
  - Use a **Background Gradient** to demarcate the section.  
  - Transition elements using **Container Scroll Animation**.
- **Content Layout:**  
  - **Feature Headline:** “Why Choose [Your Platform Name]?”  
    - Font: Montserrat, 36px.  
  - **Feature Cards:**  
    - Use **3D Card Effect** and **Card Hover Effect** for each feature.  
    - Each card details one feature:  
      - **Secure Smart Contracts:** “Trustless and audited code ensuring top-notch security.”  
      - **Lightning-Fast Settlements:** “Experience near-instant transactions on Solana.”  
      - **Low Transaction Fees:** “Maximize your yield with minimal costs.”  
      - **Community Governance:** “Decisions made by you, for you.”  
    - Use a **Card Spotlight** on the most compelling feature (e.g., “Secure Smart Contracts”) for emphasis.
- **Layout Arrangement:**  
  - Arrange cards in a **Bento Grid** or **Card Stack** for an engaging, layered look.
- **Interactive Effects:**  
  - Incorporate **Direction Aware Hover** to have subtle parallax effects when users move their mouse over cards.

### **Token & Lending Options Display**
- **Section Title:** “Lending Options & Token Stats”  
  - Use **Colourful Text** for dynamic highlights.
- **Display:**  
  - Use **Card Stack** or **Infinite Moving Cards** to showcase multiple lending products.  
  - Each card (built with **Expandable Card**) details a lending product, interest rates, and available tokens.
- **Supplementary:**  
  - Optionally integrate **Compare** components for side‑by‑side comparisons of lending rates.
- **Visual Cue:**  
  - Add a **Glare Card** effect on mouseover to reinforce interactivity.

### **Testimonials & Social Proof**
- **Section Background:**  
  - Use **Background Boxes** with a subtle drop shadow.
- **Testimonial Carousel:**  
  - Component: *Animated Testimonials*  
  - **Layout:**  
    - Each testimonial includes a short quote (“This platform transformed my DeFi experience – fast, reliable, and innovative.”), client name, and avatar.  
    - Use **Animated Tooltip** on avatars to reveal more details (e.g., “Verified Trader”).
- **Additional Social Stats:**  
  - Embed a **GitHub Globe** component to show open‑source contributions or commit stats.  
  - Use **World Map** (if applicable) to display global usage statistics.

### **Roadmap / Timeline Section**
- **Title:** “Our Roadmap to Decentralized Excellence”  
  - Use **Timeline** component to detail past milestones and future updates.  
  - Each milestone appears with a **Sticky Scroll Reveal** effect.
- **Content:**  
  - Brief text for each milestone, animated via **Text Reveal Card**.
  
### **Signup / Onboarding Section**
- **Background:**  
  - Use **Background Lines** to subtly separate this section from others.
- **Component:**  
  - Use **Signup Form** integrated with **Placeholders And Vanish Input** for modern input behavior.
- **Copy:**  
  - “Join the revolution in decentralized lending. Sign up now to get early access and exclusive benefits.”  
  - Button: “Get Started” styled with **Tailwind CSS buttons** and a **Sparkles** hover effect.

### **Footer**
- **Components:**  
  - **Floating Dock:** for social media icons (Twitter, Discord, GitHub) with a **Following Pointer** effect to draw attention on hover.
  - **Sidebar:** Optionally include a collapsible footer sidebar with additional links (Docs, FAQ, Terms & Conditions).
  - **Spotlight:** Use for highlighting a brief copyright notice.
- **Design:**  
  - Keep the footer dark with Accent 2 (Electric Purple) borders at the top for separation.

---

## 4. Image & Media Assets

**High‑Quality Images:**  
- **Hero & Backgrounds:**  
  - Search Unsplash (e.g., “blockchain abstract,” “futuristic background,” “crypto night”) or Pexels for high‑resolution, free‑to‑use images.  
  - Recommended search terms: “Solana blockchain,” “DeFi futuristic,” “digital aurora.”
- **Testimonial Avatars:**  
  - Use placeholder avatar services like [UI Avatars](https://ui-avatars.com/) or generate realistic avatars from [RandomUser.me](https://randomuser.me/).
- **Icons & Illustrations:**  
  - Consider using SVG illustrations from [undraw.co](https://undraw.co/) that match your crypto/DeFi theme.  
- **Implementation:**  
  - All images should be optimized for web (compressed without loss of quality) and integrated with the **SVG Mask Effect** or **Lens** component for dynamic reveals.

---

## 5. Exact Component Usage Recap

- **Navigation:** *Floating Navbar*, *Navbar Menu*, with integrated **3D Pin** on logo.
- **Hero Section:** *Hero Parallax*, *Hero Highlight*, *Text Generate Effect* / *Typewriter Effect*, *Tailwind CSS buttons* with *Glowing Effect*, and device mockup via *Macbook Scroll*.
- **Features:** *Feature sections*, *Bento Grid*, *3D Card Effect*, *Card Hover Effect*, *Card Spotlight*, *Direction Aware Hover*.
- **Token Options:** *Card Stack*, *Infinite Moving Cards*, *Expandable Card*, *Compare*.
- **Testimonials:** *Animated Testimonials*, *Animated Tooltip*, *GitHub Globe*, *World Map*.
- **Roadmap:** *Timeline*, *Sticky Scroll Reveal*, *Text Reveal Card*.
- **Signup:** *Signup Form*, *Placeholders And Vanish Input*, *Sparkles*.
- **Additional Effects:** *Aurora Background*, *Background Beams*, *Background Gradient*, *Gradient Animation*, *Wavy Background*, *Glowing Stars*, *Shooting Stars*, *Canvas Reveal Effect*, *Floating Dock*.

---

## 6. Final Text & Copy Guidelines

- **Hero Headline:** “Decentralized Solana Lending, Redefined”  
- **Subheadline:** “Empowering DeFi with Trustless Smart Contracts – Fast, Secure, and Community Driven”  
- **CTAs:** “Launch App”, “Get Started”, “Learn More”  
- **Features List (sample):**  
  - “Secure Smart Contracts – Audited code for complete trust.”  
  - “Lightning-Fast Settlements – Experience near-instant transactions.”  
  - “Low Fees – More yield for you.”  
  - “Community Governance – You have the power.”  
- **Testimonial Quote (example):** “This platform transformed my DeFi experience – fast, reliable, and innovative.”  
- **Roadmap Milestone Example:** “Q2 2025 – Beta Launch & Community Incentives”