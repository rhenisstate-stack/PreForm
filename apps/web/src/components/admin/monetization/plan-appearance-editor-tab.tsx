"use client";

import * as React from "react";
import {
  Palette,
  Type,
  Layout,
  MousePointer,
  RotateCcw,
  Check,
  CheckCircle2,
  AlertTriangle,
  Monitor,
  Tablet,
  Smartphone,
  Save,
  Send,
  Layers,
  Sparkles,
  RefreshCw,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { checkContrastRatio, isValidHexColor } from "@/lib/color-contrast";
import { notify } from "@/lib/notifications";

// Predefined safe typography font families
const SAFE_FONT_FAMILIES = [
  { label: "Classic Serif (Playfair Display)", value: "Playfair Display, serif" },
  { label: "Modern Sans (Inter)", value: "Inter, sans-serif" },
  { label: "Display Sans (Outfit)", value: "Outfit, sans-serif" },
  { label: "Clean Sans (Plus Jakarta Sans)", value: "'Plus Jakarta Sans', sans-serif" },
  { label: "Editorial Georgia", value: "Georgia, serif" },
  { label: "System UI Default", value: "system-ui, -apple-system, sans-serif" },
];

export function PlanAppearanceEditorTab() {
  // Device Preview viewport width state
  const [viewportMode, setViewportMode] = React.useState<"desktop" | "tablet" | "mobile">("desktop");

  // Active appearance controls tab
  const [activeSection, setActiveSection] = React.useState<"typography" | "colors" | "card" | "button" | "layout">("colors");

  // Loading and saving states
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isPublishing, setIsPublishing] = React.useState(false);
  const [isReverting, setIsReverting] = React.useState(false);

  // Appearance State
  const [typography, setTypography] = React.useState({
    fontFamily: "Playfair Display, serif",
    titleFontSize: "24px",
    titleFontWeight: "700",
    priceFontSize: "36px",
    priceFontWeight: "800",
    descriptionFontSize: "13px",
    featuresFontSize: "14px",
    lineHeight: "1.5",
    letterSpacing: "-0.01em",
  });

  const [colors, setColors] = React.useState({
    titleColor: "#0f172a",
    priceColor: "#0f172a",
    descriptionColor: "#64748b",
    featuresColor: "#334155",
    billingPeriodColor: "#64748b",
    badgeBgColor: "#0d9488",
    badgeTextColor: "#ffffff",
    cardBgColor: "#ffffff",
    cardBorderColor: "#e2e8f0",
    featuredCardBgColor: "#f8fafc",
    featuredBorderColor: "#0d9488",
  });

  const [cardStyling, setCardStyling] = React.useState({
    borderRadius: "24px",
    borderWidth: "1px",
    shadow: "shadow-md",
    padding: "32px",
    hoverTransform: true,
  });

  const [buttonStyling, setButtonStyling] = React.useState({
    buttonLabel: "Choose Plan",
    buttonBgColor: "#0d9488",
    buttonTextColor: "#ffffff",
    buttonRadius: "14px",
    buttonFontSize: "14px",
    buttonFontWeight: "600",
    hoverBgColor: "#0f766e",
    hoverTextColor: "#ffffff",
  });

  const [layout, setLayout] = React.useState({
    cardSpacing: "24px",
    featureSpacing: "12px",
  });

  // Current version metadata
  const [appearanceMetadata, setAppearanceMetadata] = React.useState<{
    id?: string;
    version?: number;
    isPublished?: boolean;
    publishedAt?: string;
  }>({});

  // Fetch current appearance on mount
  const fetchAppearance = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/subscriptions/appearance");
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.appearance) {
          const app = data.appearance;
          setAppearanceMetadata({
            id: app.id,
            version: app.version,
            isPublished: app.isPublished,
            publishedAt: app.publishedAt,
          });

          if (app.typographyJson) {
            try {
              setTypography((prev) => ({ ...prev, ...JSON.parse(app.typographyJson) }));
            } catch {}
          }
          if (app.colorsJson) {
            try {
              setColors((prev) => ({ ...prev, ...JSON.parse(app.colorsJson) }));
            } catch {}
          }
          if (app.cardStylingJson) {
            try {
              setCardStyling((prev) => ({ ...prev, ...JSON.parse(app.cardStylingJson) }));
            } catch {}
          }
          if (app.buttonStylingJson) {
            try {
              setButtonStyling((prev) => ({ ...prev, ...JSON.parse(app.buttonStylingJson) }));
            } catch {}
          }
          if (app.layoutJson) {
            try {
              setLayout((prev) => ({ ...prev, ...JSON.parse(app.layoutJson) }));
            } catch {}
          }
        }
      }
    } catch (err) {
      console.error("Failed to load appearance configuration:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchAppearance();
  }, [fetchAppearance]);

  // WCAG AA Contrast evaluations
  const titleContrastRatio = React.useMemo(() => {
    return checkContrastRatio(colors.titleColor, colors.cardBgColor);
  }, [colors.titleColor, colors.cardBgColor]);

  const buttonContrastRatio = React.useMemo(() => {
    return checkContrastRatio(buttonStyling.buttonTextColor, buttonStyling.buttonBgColor);
  }, [buttonStyling.buttonTextColor, buttonStyling.buttonBgColor]);

  const badgeContrastRatio = React.useMemo(() => {
    return checkContrastRatio(colors.badgeTextColor, colors.badgeBgColor);
  }, [colors.badgeTextColor, colors.badgeBgColor]);

  const isTitleAccessible = titleContrastRatio >= 3.0; // Heading WCAG AA
  const isButtonAccessible = buttonContrastRatio >= 4.5; // Button text WCAG AA
  const isBadgeAccessible = badgeContrastRatio >= 3.0;

  // Save / Publish Actions
  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      const payload = {
        typographyJson: JSON.stringify(typography),
        colorsJson: JSON.stringify(colors),
        cardStylingJson: JSON.stringify(cardStyling),
        buttonStylingJson: JSON.stringify(buttonStyling),
        layoutJson: JSON.stringify(layout),
        publishImmediately: false,
      };

      const res = await fetch("/api/admin/subscriptions/appearance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to save draft");

      notify.success("Appearance draft saved successfully");
      fetchAppearance();
    } catch (err: any) {
      notify.error(err.message || "Failed to save draft");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    // Validate contrast before publishing
    if (!isTitleAccessible || !isButtonAccessible) {
      notify.error("Cannot publish: Color contrast does not meet WCAG AA standards (4.5:1 text, 3.0:1 large heading).");
      return;
    }

    setIsPublishing(true);
    try {
      const payload = {
        typographyJson: JSON.stringify(typography),
        colorsJson: JSON.stringify(colors),
        cardStylingJson: JSON.stringify(cardStyling),
        buttonStylingJson: JSON.stringify(buttonStyling),
        layoutJson: JSON.stringify(layout),
        publishImmediately: true,
      };

      const res = await fetch("/api/admin/subscriptions/appearance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to publish appearance");

      notify.success("Appearance published! Public pricing cards are updated.");
      fetchAppearance();
    } catch (err: any) {
      notify.error(err.message || "Failed to publish appearance");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleRevert = async () => {
    setIsReverting(true);
    try {
      const res = await fetch("/api/admin/subscriptions/appearance/revert", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to revert appearance");

      notify.success("Reverted to previous published version");
      fetchAppearance();
    } catch (err: any) {
      notify.error(err.message || "Failed to revert");
    } finally {
      setIsReverting(false);
    }
  };

  const handleResetToDefaults = () => {
    setTypography({
      fontFamily: "Playfair Display, serif",
      titleFontSize: "24px",
      titleFontWeight: "700",
      priceFontSize: "36px",
      priceFontWeight: "800",
      descriptionFontSize: "13px",
      featuresFontSize: "14px",
      lineHeight: "1.5",
      letterSpacing: "-0.01em",
    });
    setColors({
      titleColor: "#0f172a",
      priceColor: "#0f172a",
      descriptionColor: "#64748b",
      featuresColor: "#334155",
      billingPeriodColor: "#64748b",
      badgeBgColor: "#0d9488",
      badgeTextColor: "#ffffff",
      cardBgColor: "#ffffff",
      cardBorderColor: "#e2e8f0",
      featuredCardBgColor: "#f8fafc",
      featuredBorderColor: "#0d9488",
    });
    setCardStyling({
      borderRadius: "24px",
      borderWidth: "1px",
      shadow: "shadow-md",
      padding: "32px",
      hoverTransform: true,
    });
    setButtonStyling({
      buttonLabel: "Choose Plan",
      buttonBgColor: "#0d9488",
      buttonTextColor: "#ffffff",
      buttonRadius: "14px",
      buttonFontSize: "14px",
      buttonFontWeight: "600",
      hoverBgColor: "#0f766e",
      hoverTextColor: "#ffffff",
    });
    notify.success("Reset editor values to factory defaults");
  };

  return (
    <div className="space-y-6">
      {/* Editor Header & Control Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-muted/40 border border-border">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-serif font-semibold text-foreground">
              Subscription Card Appearance &amp; Typography Customizer
            </h2>
            {appearanceMetadata.version && (
              <Badge variant="outline" className="text-xs">
                v{appearanceMetadata.version} {appearanceMetadata.isPublished ? "• Published" : "• Draft"}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure card aesthetics, safe typography, button styling, and real-time WCAG AA accessibility contrast.
          </p>
        </div>

        {/* Global Toolbar Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleResetToDefaults}
            className="h-8 rounded-xl text-xs"
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Reset Defaults
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRevert}
            disabled={isReverting}
            className="h-8 rounded-xl text-xs"
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isReverting ? "animate-spin" : ""}`} />
            Revert Version
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleSaveDraft}
            disabled={isSaving}
            className="h-8 rounded-xl text-xs"
          >
            <Save className="mr-1.5 h-3.5 w-3.5" />
            {isSaving ? "Saving..." : "Save Draft"}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handlePublish}
            disabled={isPublishing}
            className="h-8 rounded-xl text-xs bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
          >
            <Send className="mr-1.5 h-3.5 w-3.5" />
            {isPublishing ? "Publishing..." : "Publish Changes"}
          </Button>
        </div>
      </div>

      {/* WCAG AA Safeguard Status Bar */}
      <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-card border border-border text-xs">
        <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">
          WCAG AA Contrast Monitor:
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Title vs Card:</span>
          <Badge
            variant={isTitleAccessible ? "default" : "destructive"}
            className="text-[10px] px-1.5 py-0 h-4 font-mono"
          >
            {titleContrastRatio.toFixed(1)}:1 {isTitleAccessible ? "✓ Pass" : "✕ Low"}
          </Badge>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Button vs Text:</span>
          <Badge
            variant={isButtonAccessible ? "default" : "destructive"}
            className="text-[10px] px-1.5 py-0 h-4 font-mono"
          >
            {buttonContrastRatio.toFixed(1)}:1 {isButtonAccessible ? "✓ Pass" : "✕ Low"}
          </Badge>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Badge vs Text:</span>
          <Badge
            variant={isBadgeAccessible ? "default" : "destructive"}
            className="text-[10px] px-1.5 py-0 h-4 font-mono"
          >
            {badgeContrastRatio.toFixed(1)}:1 {isBadgeAccessible ? "✓ Pass" : "✕ Low"}
          </Badge>
        </div>
      </div>

      {/* Split Interface: Left Controls, Right Real-Time Responsive Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Section: Customization Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Section Navigation Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/60 border border-border overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveSection("colors")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
                activeSection === "colors"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Palette className="h-3.5 w-3.5" />
              Colors
            </button>
            <button
              type="button"
              onClick={() => setActiveSection("typography")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
                activeSection === "typography"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Type className="h-3.5 w-3.5" />
              Typography
            </button>
            <button
              type="button"
              onClick={() => setActiveSection("card")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
                activeSection === "card"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Layout className="h-3.5 w-3.5" />
              Card Shape
            </button>
            <button
              type="button"
              onClick={() => setActiveSection("button")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
                activeSection === "button"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <MousePointer className="h-3.5 w-3.5" />
              Button
            </button>
          </div>

          {/* Section Controls Container */}
          <Card className="rounded-2xl border-border bg-card shadow-xs">
            <CardContent className="p-4 space-y-4">
              {/* COLORS SECTION */}
              {activeSection === "colors" && (
                <div className="space-y-3.5 text-xs">
                  <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                    <Palette className="h-4 w-4 text-primary" />
                    Color Palette Configuration
                  </h3>

                  <div className="space-y-1.5">
                    <label className="font-medium text-foreground">Card Background Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={colors.cardBgColor}
                        onChange={(e) => setColors({ ...colors, cardBgColor: e.target.value })}
                        className="h-8 w-10 p-0 rounded border cursor-pointer shrink-0"
                      />
                      <Input
                        value={colors.cardBgColor}
                        onChange={(e) => setColors({ ...colors, cardBgColor: e.target.value })}
                        className="h-8 font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-medium text-foreground">Plan Title Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={colors.titleColor}
                        onChange={(e) => setColors({ ...colors, titleColor: e.target.value })}
                        className="h-8 w-10 p-0 rounded border cursor-pointer shrink-0"
                      />
                      <Input
                        value={colors.titleColor}
                        onChange={(e) => setColors({ ...colors, titleColor: e.target.value })}
                        className="h-8 font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-medium text-foreground">Price Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={colors.priceColor}
                        onChange={(e) => setColors({ ...colors, priceColor: e.target.value })}
                        className="h-8 w-10 p-0 rounded border cursor-pointer shrink-0"
                      />
                      <Input
                        value={colors.priceColor}
                        onChange={(e) => setColors({ ...colors, priceColor: e.target.value })}
                        className="h-8 font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-medium text-foreground">Description &amp; Secondary Text</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={colors.descriptionColor}
                        onChange={(e) => setColors({ ...colors, descriptionColor: e.target.value })}
                        className="h-8 w-10 p-0 rounded border cursor-pointer shrink-0"
                      />
                      <Input
                        value={colors.descriptionColor}
                        onChange={(e) => setColors({ ...colors, descriptionColor: e.target.value })}
                        className="h-8 font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-medium text-foreground">Badge Background Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={colors.badgeBgColor}
                        onChange={(e) => setColors({ ...colors, badgeBgColor: e.target.value })}
                        className="h-8 w-10 p-0 rounded border cursor-pointer shrink-0"
                      />
                      <Input
                        value={colors.badgeBgColor}
                        onChange={(e) => setColors({ ...colors, badgeBgColor: e.target.value })}
                        className="h-8 font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-medium text-foreground">Badge Text Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={colors.badgeTextColor}
                        onChange={(e) => setColors({ ...colors, badgeTextColor: e.target.value })}
                        className="h-8 w-10 p-0 rounded border cursor-pointer shrink-0"
                      />
                      <Input
                        value={colors.badgeTextColor}
                        onChange={(e) => setColors({ ...colors, badgeTextColor: e.target.value })}
                        className="h-8 font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TYPOGRAPHY SECTION */}
              {activeSection === "typography" && (
                <div className="space-y-3.5 text-xs">
                  <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                    <Type className="h-4 w-4 text-primary" />
                    Typography &amp; Scale
                  </h3>

                  <div className="space-y-1.5">
                    <label className="font-medium text-foreground">Font Family</label>
                    <select
                      value={typography.fontFamily}
                      onChange={(e) => setTypography({ ...typography, fontFamily: e.target.value })}
                      className="w-full h-8 px-2.5 rounded-md border bg-background text-xs"
                    >
                      {SAFE_FONT_FAMILIES.map((f) => (
                        <option key={f.value} value={f.value}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="font-medium text-foreground">Title Font Size</label>
                      <Input
                        value={typography.titleFontSize}
                        onChange={(e) => setTypography({ ...typography, titleFontSize: e.target.value })}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="font-medium text-foreground">Title Weight</label>
                      <select
                        value={typography.titleFontWeight}
                        onChange={(e) => setTypography({ ...typography, titleFontWeight: e.target.value })}
                        className="w-full h-8 px-2.5 rounded-md border bg-background text-xs"
                      >
                        <option value="600">600 (Semi-bold)</option>
                        <option value="700">700 (Bold)</option>
                        <option value="800">800 (Extra Bold)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="font-medium text-foreground">Price Font Size</label>
                      <Input
                        value={typography.priceFontSize}
                        onChange={(e) => setTypography({ ...typography, priceFontSize: e.target.value })}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="font-medium text-foreground">Price Weight</label>
                      <select
                        value={typography.priceFontWeight}
                        onChange={(e) => setTypography({ ...typography, priceFontWeight: e.target.value })}
                        className="w-full h-8 px-2.5 rounded-md border bg-background text-xs"
                      >
                        <option value="700">700 (Bold)</option>
                        <option value="800">800 (Extra Bold)</option>
                        <option value="900">900 (Black)</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-medium text-foreground">Features Font Size</label>
                    <Input
                      value={typography.featuresFontSize}
                      onChange={(e) => setTypography({ ...typography, featuresFontSize: e.target.value })}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              )}

              {/* CARD SHAPE SECTION */}
              {activeSection === "card" && (
                <div className="space-y-3.5 text-xs">
                  <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                    <Layout className="h-4 w-4 text-primary" />
                    Card Border &amp; Padding
                  </h3>

                  <div className="space-y-1.5">
                    <label className="font-medium text-foreground">Border Radius</label>
                    <select
                      value={cardStyling.borderRadius}
                      onChange={(e) => setCardStyling({ ...cardStyling, borderRadius: e.target.value })}
                      className="w-full h-8 px-2.5 rounded-md border bg-background text-xs"
                    >
                      <option value="12px">12px (Subtle)</option>
                      <option value="16px">16px (Standard)</option>
                      <option value="24px">24px (Modern Rounded)</option>
                      <option value="32px">32px (Super Rounded)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-medium text-foreground">Card Padding</label>
                    <select
                      value={cardStyling.padding}
                      onChange={(e) => setCardStyling({ ...cardStyling, padding: e.target.value })}
                      className="w-full h-8 px-2.5 rounded-md border bg-background text-xs"
                    >
                      <option value="20px">20px (Compact)</option>
                      <option value="24px">24px (Medium)</option>
                      <option value="32px">32px (Spacious)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-medium text-foreground">Card Shadow</label>
                    <select
                      value={cardStyling.shadow}
                      onChange={(e) => setCardStyling({ ...cardStyling, shadow: e.target.value })}
                      className="w-full h-8 px-2.5 rounded-md border bg-background text-xs"
                    >
                      <option value="shadow-none">None</option>
                      <option value="shadow-xs">Extra Small</option>
                      <option value="shadow-md">Medium</option>
                      <option value="shadow-lg">Large</option>
                      <option value="shadow-xl">Extra Large</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-medium text-foreground">Border Width</label>
                    <select
                      value={cardStyling.borderWidth}
                      onChange={(e) => setCardStyling({ ...cardStyling, borderWidth: e.target.value })}
                      className="w-full h-8 px-2.5 rounded-md border bg-background text-xs"
                    >
                      <option value="1px">1px (Default hairline)</option>
                      <option value="2px">2px (Bold border)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* BUTTON SECTION */}
              {activeSection === "button" && (
                <div className="space-y-3.5 text-xs">
                  <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                    <MousePointer className="h-4 w-4 text-primary" />
                    Call-to-Action Button Styling
                  </h3>

                  <div className="space-y-1.5">
                    <label className="font-medium text-foreground">Button Label Template</label>
                    <Input
                      value={buttonStyling.buttonLabel}
                      onChange={(e) => setButtonStyling({ ...buttonStyling, buttonLabel: e.target.value })}
                      className="h-8 text-xs"
                      placeholder="e.g. Choose Plan, Get Started"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-medium text-foreground">Button Background Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={buttonStyling.buttonBgColor}
                        onChange={(e) => setButtonStyling({ ...buttonStyling, buttonBgColor: e.target.value })}
                        className="h-8 w-10 p-0 rounded border cursor-pointer shrink-0"
                      />
                      <Input
                        value={buttonStyling.buttonBgColor}
                        onChange={(e) => setButtonStyling({ ...buttonStyling, buttonBgColor: e.target.value })}
                        className="h-8 font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-medium text-foreground">Button Text Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={buttonStyling.buttonTextColor}
                        onChange={(e) => setButtonStyling({ ...buttonStyling, buttonTextColor: e.target.value })}
                        className="h-8 w-10 p-0 rounded border cursor-pointer shrink-0"
                      />
                      <Input
                        value={buttonStyling.buttonTextColor}
                        onChange={(e) => setButtonStyling({ ...buttonStyling, buttonTextColor: e.target.value })}
                        className="h-8 font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-medium text-foreground">Button Border Radius</label>
                    <select
                      value={buttonStyling.buttonRadius}
                      onChange={(e) => setButtonStyling({ ...buttonStyling, buttonRadius: e.target.value })}
                      className="w-full h-8 px-2.5 rounded-md border bg-background text-xs"
                    >
                      <option value="8px">8px (Standard)</option>
                      <option value="14px">14px (Rounded)</option>
                      <option value="9999px">Pill / Fully Rounded</option>
                    </select>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Section: Real-time Responsive Preview (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Responsive Preview Device Controls */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-1">
              <span className="text-xs font-semibold text-muted-foreground mr-2">Viewport Preview:</span>
              <button
                type="button"
                onClick={() => setViewportMode("desktop")}
                className={`p-1.5 rounded-lg text-xs flex items-center gap-1.5 ${
                  viewportMode === "desktop"
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Monitor className="h-4 w-4" />
                <span className="hidden sm:inline">Desktop</span>
              </button>
              <button
                type="button"
                onClick={() => setViewportMode("tablet")}
                className={`p-1.5 rounded-lg text-xs flex items-center gap-1.5 ${
                  viewportMode === "tablet"
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Tablet className="h-4 w-4" />
                <span className="hidden sm:inline">Tablet (768px)</span>
              </button>
              <button
                type="button"
                onClick={() => setViewportMode("mobile")}
                className={`p-1.5 rounded-lg text-xs flex items-center gap-1.5 ${
                  viewportMode === "mobile"
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Smartphone className="h-4 w-4" />
                <span className="hidden sm:inline">Mobile (375px)</span>
              </button>
            </div>
            <div className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              Live rendering
            </div>
          </div>

          {/* Interactive Responsive Canvas */}
          <div className="p-6 rounded-2xl border border-dashed border-border bg-muted/20 flex justify-center items-center overflow-x-auto min-h-[500px]">
            <div
              style={{
                width:
                  viewportMode === "mobile" ? "375px" : viewportMode === "tablet" ? "680px" : "100%",
                maxWidth: "100%",
                transition: "width 0.25s ease-in-out",
              }}
              className="grid grid-cols-1 md:grid-cols-2 gap-5"
            >
              {/* Card 1: Standard Plan Preview */}
              <div
                style={{
                  backgroundColor: colors.cardBgColor,
                  borderRadius: cardStyling.borderRadius,
                  borderWidth: cardStyling.borderWidth,
                  borderColor: colors.cardBorderColor,
                  padding: cardStyling.padding,
                  fontFamily: typography.fontFamily,
                  lineHeight: typography.lineHeight,
                }}
                className={`flex flex-col justify-between relative border ${cardStyling.shadow} transition-transform hover:-translate-y-1`}
              >
                <div>
                  <h3
                    style={{
                      fontSize: typography.titleFontSize,
                      fontWeight: typography.titleFontWeight,
                      color: colors.titleColor,
                      letterSpacing: typography.letterSpacing,
                    }}
                  >
                    NCLEX-RN Starter
                  </h3>
                  <p
                    style={{
                      fontSize: typography.descriptionFontSize,
                      color: colors.descriptionColor,
                    }}
                    className="mt-1"
                  >
                    RN Pathway • 30 Days Access
                  </p>

                  <div className="mt-5 flex items-baseline gap-2">
                    <span
                      style={{
                        fontSize: typography.priceFontSize,
                        fontWeight: typography.priceFontWeight,
                        color: colors.priceColor,
                      }}
                    >
                      $29
                    </span>
                    <span
                      style={{
                        fontSize: "12px",
                        color: colors.billingPeriodColor,
                      }}
                    >
                      USD / month
                    </span>
                  </div>

                  <ul
                    style={{
                      fontSize: typography.featuresFontSize,
                      color: colors.featuresColor,
                    }}
                    className="mt-6 space-y-2.5"
                  >
                    <li className="flex items-center gap-2">
                      <CheckCircle2 style={{ color: buttonStyling.buttonBgColor }} className="h-4 w-4 shrink-0" />
                      <span>Full NCLEX-RN Question Bank</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 style={{ color: buttonStyling.buttonBgColor }} className="h-4 w-4 shrink-0" />
                      <span>Clinical Judgment Rationales</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 style={{ color: buttonStyling.buttonBgColor }} className="h-4 w-4 shrink-0" />
                      <span>Domain Performance Analytics</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-8">
                  <button
                    type="button"
                    style={{
                      backgroundColor: buttonStyling.buttonBgColor,
                      color: buttonStyling.buttonTextColor,
                      borderRadius: buttonStyling.buttonRadius,
                      fontSize: buttonStyling.buttonFontSize,
                      fontWeight: buttonStyling.buttonFontWeight,
                    }}
                    className="w-full py-2.5 px-4 shadow-sm hover:opacity-90 transition-opacity font-medium"
                  >
                    {buttonStyling.buttonLabel}
                  </button>
                </div>
              </div>

              {/* Card 2: Featured / Most Popular Plan Preview */}
              <div
                style={{
                  backgroundColor: colors.featuredCardBgColor,
                  borderRadius: cardStyling.borderRadius,
                  borderWidth: "2px",
                  borderColor: colors.featuredBorderColor,
                  padding: cardStyling.padding,
                  fontFamily: typography.fontFamily,
                  lineHeight: typography.lineHeight,
                }}
                className={`flex flex-col justify-between relative border ${cardStyling.shadow} transition-transform hover:-translate-y-1`}
              >
                {/* Floating Badge */}
                <div
                  style={{
                    backgroundColor: colors.badgeBgColor,
                    color: colors.badgeTextColor,
                    borderRadius: "9999px",
                  }}
                  className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-1 text-xs font-semibold shadow-sm whitespace-nowrap"
                >
                  Most Popular • High Yield
                </div>

                <div>
                  <h3
                    style={{
                      fontSize: typography.titleFontSize,
                      fontWeight: typography.titleFontWeight,
                      color: colors.titleColor,
                      letterSpacing: typography.letterSpacing,
                    }}
                  >
                    NCLEX-RN &amp; PN All-Access
                  </h3>
                  <p
                    style={{
                      fontSize: typography.descriptionFontSize,
                      color: colors.descriptionColor,
                    }}
                    className="mt-1"
                  >
                    RN &amp; PN Dual Access • 90 Days
                  </p>

                  <div className="mt-5 flex items-baseline gap-2">
                    <span
                      style={{
                        fontSize: typography.priceFontSize,
                        fontWeight: typography.priceFontWeight,
                        color: colors.priceColor,
                      }}
                    >
                      $89
                    </span>
                    <span
                      style={{
                        fontSize: "12px",
                        color: colors.billingPeriodColor,
                      }}
                    >
                      USD / quarter
                    </span>
                  </div>

                  <ul
                    style={{
                      fontSize: typography.featuresFontSize,
                      color: colors.featuresColor,
                    }}
                    className="mt-6 space-y-2.5"
                  >
                    <li className="flex items-center gap-2">
                      <CheckCircle2 style={{ color: buttonStyling.buttonBgColor }} className="h-4 w-4 shrink-0" />
                      <span>Full Dual Access (RN &amp; PN)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 style={{ color: buttonStyling.buttonBgColor }} className="h-4 w-4 shrink-0" />
                      <span>Readiness Assessment Tests (RATs)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 style={{ color: buttonStyling.buttonBgColor }} className="h-4 w-4 shrink-0" />
                      <span>AI Clinical Judgment Coach</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 style={{ color: buttonStyling.buttonBgColor }} className="h-4 w-4 shrink-0" />
                      <span>Spaced Repetition Flashcards</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-8">
                  <button
                    type="button"
                    style={{
                      backgroundColor: buttonStyling.buttonBgColor,
                      color: buttonStyling.buttonTextColor,
                      borderRadius: buttonStyling.buttonRadius,
                      fontSize: buttonStyling.buttonFontSize,
                      fontWeight: buttonStyling.buttonFontWeight,
                    }}
                    className="w-full py-2.5 px-4 shadow-sm hover:opacity-90 transition-opacity font-medium"
                  >
                    {buttonStyling.buttonLabel}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
