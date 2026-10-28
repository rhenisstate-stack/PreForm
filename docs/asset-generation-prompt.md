# PrepFord — Master Visual Asset Design Prompt & Scene Specification

This document establishes the standardized, reusable visual asset generation specification for **PrepFord**, a professional NCLEX-RN and NCLEX-PN exam-preparation platform.

---

## 1. Master Image-Generation Prompt

Use this standardized prompt when generating visual assets (blog feature banners, testimonial graphics, study-guide thumbnails, and clinical scenario illustrations):

```text
Create a premium corporate visual asset for PrepFord, a professional NCLEX-RN and NCLEX-PN exam-preparation platform.

Asset type: [BLOG FEATURE BANNER / TESTIMONIAL CARD GRAPHIC / STUDY GUIDE THUMBNAIL]

Specific scene: [DESCRIBE THE SUBJECT AND VISUAL STORY]

Purpose and placement: The asset will appear within a modern nursing education website and must remain legible, visually balanced, and recognizable when displayed in a responsive card or banner.

Brand identity: Use PrepFord's cohesive visual identity: deep navy blue #142B4A, medical teal #0D9488, clean white, soft neutral backgrounds, and restrained warm-gold accents where appropriate.

Visual style: Professional, clean, reassuring, modern, educational, and inspiring. Use crisp edges, refined lighting, restrained depth, balanced composition, and polished editorial art direction. A modern flat-vector aesthetic with subtle dimensional lighting is preferred when appropriate for the scene.

Composition: Create a clear visual focal point, strong hierarchy, generous negative space, and a composition that accommodates responsive cropping. Keep important subjects away from crop-sensitive edges. Avoid unnecessary visual complexity.

Technical quality: High-resolution output suitable for professional web use, preferably 2K where supported. Match the aspect ratio to the actual component. Use a clean, uncluttered background where appropriate.

Content accuracy: Use nursing and medical education elements only when relevant to the subject. Any clinical equipment, interface, chart, or medical illustration must be plausible and contextually appropriate.

Restrictions:
- Do not imitate Archer Review's logo, proprietary illustrations, exact page design, or branding.
- Do not generate a fake PrepFord logo. Use the official supplied prepford-logo.png asset when the actual logo is needed.
- Do not include unrelated objects, decorative clutter, random lettering, or garbled interface text.
- Do not invent exam results, student identities, testimonials, credentials, or pass-rate statistics.
- Do not embed essential text in images unless the asset specifically requires text and it can be rendered accurately.
- Keep the image visually consistent with the PrepFord website and suitable for use in a professional educational setting.
```

---

## 2. Standardized Scene Variants

### Variant A: Testimonial Card Graphic
- **Asset type:** `testimonial card graphic`
- **Aspect ratio:** 1:1 or 4:3
- **Specific scene:**
  > A refined, original visual symbolizing nursing exam achievement, featuring a graduation cap and a carefully integrated medical stethoscope. Use a restrained combination of deep navy and medical teal, with a subtle metallic or warm-gold highlight. The composition should feel encouraging and professional without suggesting an unverified individual outcome.
- **Intended placement:** Candidate testimonial cards on `/testimonials`, `/nclex-rn`, `/nclex-pn`, and the homepage.

### Variant B: Blog Feature Banner — Next-Generation NCLEX Question Formats
- **Asset type:** `blog feature banner`
- **Aspect ratio:** 16:9 or 2:1
- **Specific scene:**
  > A modern tablet on a clean nursing study desk displaying a simplified, generic educational question interface with abstract charts and selectable answer elements. Include subtle nursing-study context and carefully composed medical-teal and navy accents. Do not use real patient data, legible fabricated clinical findings, or copied interfaces from other platforms.
- **Intended placement:** Article headers and card previews on `/blog` and `/blog/[slug]`.

### Variant C: Study Guide Thumbnail
- **Asset type:** `study guide thumbnail`
- **Aspect ratio:** 16:9 or 4:3
- **Specific scene:**
  > A clean, contemporary nursing study guide represented by an open digital notebook, organized study cards, subtle clinical diagrams, and a small medical stethoscope detail. Use clear geometric forms, a deep navy and medical-teal palette, and generous negative space for responsive thumbnail cropping.
- **Intended placement:** Category and subject cards on `/study-guide`, `/study-guide/[category]`, and `/study-guide/[category]/[subject]`.

---

## 3. Brand Tokens & Color Palette Reference

| Token | Hex | Role | Usage |
| :--- | :--- | :--- | :--- |
| **Primary Navy** | `#142B4A` | Brand Anchor | Dominant foundation, headers, card borders, deep shadows |
| **Medical Teal** | `#0D9488` | Clinical Highlight | Secondary accent, interactive pills, checkmarks, hero accents |
| **Clean White** | `#FFFFFF` | Canvas / Surfaces | Clean background cards, high-contrast typography |
| **Neutral Slate** | `#F8FAFC` / `#0F172A` | Backgrounds | Light and dark mode surface backgrounds |
| **Warm Gold** | `#F59E0B` | Achievement Accent | Restrained accent for badges, stars, and milestones |
