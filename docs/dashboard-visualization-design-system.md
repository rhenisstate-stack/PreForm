# PrepFord NCLEX — Dashboard Visualization Design System

## 1. Executive Summary & Design System Foundations

The PrepFord Dashboard Visualization Design System provides a coherent, clinically inspired, data-driven visual standard for all analytical views across the platform. Built on Next.js 16 (React 19), Tailwind CSS, shadcn/ui, Radix UI primitives, and Recharts v2.15, the system ensures pixel-perfect clarity, high contrast accessibility, and responsive fluidity across desktop, tablet, and mobile workspaces.

### 1.1 Brand & Palette Tokens

All charts, KPI indicators, badges, and progress lines adhere to the authoritative PrepFord clinical intelligence palette:

| Semantic Token | Hex Code | Tailwind / HSL Equivalent | Primary Usage |
| :--- | :--- | :--- | :--- |
| **Prepford Navy** | `#142B4A` | `hsl(215, 57%, 18%)` | Primary brand accent, executive metrics, NCLEX-RN pathway |
| **Medical Teal** | `#0D9488` | `teal-600` / `teal-400` | Clinical accuracy, passing thresholds, mastery indicators |
| **NCLEX-PN Slate/Violet** | `#8B5CF6` | `violet-500` / `violet-400` | NCLEX-PN specific cohort comparison and distinct pathway branding |
| **Success / Passing** | `#10B981` | `emerald-500` / `emerald-400` | Target pass lines, positive trends, completed exams |
| **Developing / Attention** | `#F59E0B` | `amber-500` / `amber-400` | Moderate clinical performance (60–74%), pending items |
| **Focus Area / Critical** | `#EF4444` | `rose-500` / `rose-400` | Clinical deficiency (<60%), abandoned attempts, failed transactions |
| **Muted Slate** | `#64748B` | `slate-500` / `muted-foreground` | Axis labels, unassessed categories, grid lines |

### 1.2 Chart Typography & Accessibility

- **Header / Titles:** Inter / System Sans, semi-bold `text-base` or `text-lg`.
- **Numerical Metrics & KPIs:** Monospaced tabular figures (`font-mono font-bold`) ensuring vertical number alignment without jitter during live updates.
- **Micro-labels & Tooltips:** High contrast `text-xs` (11–12px) with 4.5:1 minimum contrast ratio against both light card surfaces and dark themes.
- **Focus Rings:** Radix-compliant accessible keyboard focus rings (`ring-2 ring-ring ring-offset-2`).

---

## 2. Component Inventory & Architecture

All visualization primitives reside in `apps/web/src/components/analytics/`:

### 2.1 `AnalyticsKpiCard`
Executive high-density metric card displaying:
- Title and descriptive sublabel.
- Primary metric with tabular digits.
- Period-over-period delta badge (with directional Lucide icons).
- Trend inversion support (e.g. failure rate reduction is rendered in green).
- **Zero Hallucination Policy:** If historical comparison data is null or undefined, fake deltas (e.g. "+0%") are suppressed in favor of baseline context.
- Skeleton loading state.

### 2.2 `AnalyticsChartCard`
Standardized layout wrapper providing:
- Structured header with title, subtitle, and control slot (date range pickers, pathway toggles).
- Automatic integration with `ChartLoadingState`, `ChartEmptyState`, and `ChartErrorState`.
- Optional footer slot for aggregated totals or explanatory footnotes.

### 2.3 `TrendChart`
Recharts Area and Line visualization:
- Smooth cubic interpolation (`type="monotone"`).
- Gradient fills with customizable opacity.
- Reference line support for clinical target benchmarks (e.g., 75% NCLEX standard).
- Interactive tooltip displaying date and metric series.
- Empty state fallback.

### 2.4 `BarComparisonChart`
Recharts Bar visualization supporting:
- Grouped side-by-side comparisons (e.g., NCLEX-RN vs NCLEX-PN exam volumes).
- Stacked status breakdowns (e.g., Passed, Failed, Abandoned).
- Horizontal and vertical orientation options.

### 2.5 `DonutDistributionChart`
Recharts Pie/Donut visualization:
- Proportional composition of questions, subscriptions, or candidate demographics.
- Hollow center presenting total volume and category subtitle.
- Interactive hover slice expansion and custom tooltip.
- Responsive side legend with exact counts and calculated percentages.

### 2.6 `HorizontalRankingChart`
High-density progress bar ranking for NCLEX Client Needs and Domain Mastery:
- Categorizes performance into 4 tiers:
  - **Mastered (>= 75%):** Teal/Emerald.
  - **Developing (60–74%):** Amber.
  - **Focus Area (< 60%):** Rose.
  - **Unassessed:** Muted Slate.
- Displays target pass benchmark line across all bars for instant visual triage.

### 2.7 `ActivityTimeline`
Audit trail and operational stream:
- Categorized events (User, Assessment, Monetization, Content, Security, System).
- Privacy-sanitized actor display.
- Relative elapsed time indicators (`5m ago`, `2h ago`).

### 2.8 State & Filter Components
- `ChartLoadingState`: Smooth pulsing skeleton with branded spinner.
- `ChartEmptyState`: Dashed border container with icon and actionable guidance.
- `ChartErrorState`: Destructive boundary with explicit retry handler.
- `ChartDateRangeFilter`: Standardized pill selectors (`Today`, `7D`, `30D`, `90D`, `1Y`, `All`).
- `PathwayToggleFilter`: Controlled pill selector for `All`, `NCLEX-RN`, and `NCLEX-PN`.

---

## 3. Data Fetching & Caching Strategy

Analytics requests are powered by TanStack React Query v5:
- **Default Stale Time:** 60 seconds (`staleTime: 60_000`). Prevents redundant queries during intra-dashboard tab switching.
- **Garbage Collection Time:** 5 minutes (`gcTime: 300_000`).
- **Refetch on Window Focus:** Disabled for high-density administrative graphs to avoid flickering (`refetchOnWindowFocus: false`).
- **Manual Invalidation:** Exposed through standard query invalidation keys (`["analytics", "admin", ...]`).

---

## 4. Toast & System Notification Standards

- **Infrastructure:** `sonner` via `@/components/ui/sonner`.
- **Positioning:** Strictly centered at top viewport (`position="top-center"`).
- **Tone & Semantics:**
  - `toast.success`: Operations completed (e.g., report exported, filters saved).
  - `toast.error`: Data fetch failures or network interruptions.
  - `toast.warning`: Threshold warnings (e.g., exam capacity approaching limit).
