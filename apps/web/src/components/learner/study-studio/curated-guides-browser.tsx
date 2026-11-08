"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Compass,
  Copy,
  FileText,
  Layers,
  Search,
  Sparkles,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  studyService,
  CuratedCategory,
  CuratedGuideSummary,
  CuratedGuideDetail,
} from "@/lib/study-client-service";
import { notify as toast } from "@/lib/notifications";

export function CuratedGuidesBrowser() {
  const [programme, setProgramme] = React.useState<string>("rn");
  const [categories, setCategories] = React.useState<CuratedCategory[]>([]);
  const [guides, setGuides] = React.useState<CuratedGuideSummary[]>([]);
  const [selectedCategory, setSelectedCategory] = React.useState<string>("all");
  const [selectedGuide, setSelectedGuide] = React.useState<CuratedGuideDetail | null>(null);
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [loading, setLoading] = React.useState<boolean>(true);
  const [cloning, setCloning] = React.useState<boolean>(false);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([
      studyService.getGuideCategories(),
      studyService.getGuides(selectedCategory === "all" ? undefined : selectedCategory, programme),
    ])
      .then(([catsRes, guidesRes]) => {
        if (cancelled) return;
        setCategories(catsRes.categories);
        setGuides(guidesRes.guides);
      })
      .catch((err) => {
        if (cancelled) return;
        toast.error(err.message || "Failed to load curated study guides.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [programme, selectedCategory]);

  const handleOpenGuide = async (guide: CuratedGuideSummary) => {
    try {
      setLoading(true);
      const res = await studyService.getGuideById(guide.id);
      setSelectedGuide(res.guide);
    } catch (err: any) {
      toast.error(err.message || "Failed to load study guide details.");
    } finally {
      setLoading(false);
    }
  };

  const handleCloneToNotes = async () => {
    if (!selectedGuide) return;
    try {
      setCloning(true);
      const note = await studyService.createNote({
        title: `[Guide] ${selectedGuide.title}`,
        contentJson: JSON.stringify({
          schema: "prepford-note-v1",
          html: `
            <h2>${selectedGuide.title}</h2>
            <p><strong>Clinical Summary:</strong> ${selectedGuide.summary}</p>
            <h3>Key Takeaways</h3>
            <ul>${selectedGuide.clinicalKeyTakeaways.map((t) => `<li>${t}</li>`).join("")}</ul>
          `,
        }),
        contentPlainText: `${selectedGuide.title}\n\n${selectedGuide.summary}\n\nTakeaways:\n${selectedGuide.clinicalKeyTakeaways.join("\n")}`,
        programme: selectedGuide.programme,
        tags: ["curated-guide", selectedGuide.categorySlug],
      });

      toast.success("Guide saved to your Personal Notes! You can now edit and annotate it.");
    } catch (err: any) {
      toast.error(err.message || "Failed to clone guide to notes.");
    } finally {
      setCloning(false);
    }
  };

  const handleGenerateCardsFromGuide = async () => {
    if (!selectedGuide || selectedGuide.clinicalKeyTakeaways.length === 0) return;
    try {
      setCloning(true);
      const deck = await studyService.createDeck({
        name: `Cards: ${selectedGuide.title}`,
        description: `Generated from official guide: ${selectedGuide.title}`,
        programme: selectedGuide.programme,
      });

      for (const t of selectedGuide.clinicalKeyTakeaways) {
        await studyService.createCard(deck.deck.id, {
          front: `[${selectedGuide.title}] What is the clinical priority for this finding?`,
          back: t,
          explanation: `Reference: Official PrepFord Guide (${selectedGuide.readTime}).`,
          difficulty: "high_yield",
        });
      }

      toast.success(`Generated ${selectedGuide.clinicalKeyTakeaways.length} flashcards in new deck.`);
    } catch (err: any) {
      toast.error(err.message || "Failed to generate flashcards.");
    } finally {
      setCloning(false);
    }
  };

  const filteredGuides = guides.filter((g) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return g.title.toLowerCase().includes(q) || g.summary.toLowerCase().includes(q);
  });

  return (
    <div data-testid="curated-guides-browser" className="space-y-6 max-w-5xl mx-auto">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl border border-border bg-card shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Compass className="h-5 w-5 text-teal-600" />
            <h1 className="font-serif font-bold text-xl text-foreground">Official Curated Study Guides</h1>
            <Badge variant="outline" className="text-xs uppercase">
              Peer-Reviewed Content
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Clinical guides authored by PrepFord nursing educators. Read, annotate into your personal notes, or convert to flashcard decks.
          </p>
        </div>

        {/* Programme selector */}
        <div className="flex rounded-lg bg-muted p-0.5 text-xs">
          {["rn", "pn"].map((p) => (
            <button
              key={p}
              onClick={() => setProgramme(p)}
              className={`px-3 py-1 font-medium rounded-md uppercase transition-all ${
                programme === p ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {selectedGuide ? (
        /* ── Guide Detail Reader ── */
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedGuide(null)}
              className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to All Guides</span>
            </Button>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={cloning}
                onClick={handleCloneToNotes}
                className="gap-1.5 text-xs text-teal-700 dark:text-teal-300 border-teal-500/30"
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Save to My Notes</span>
              </Button>
              <Button
                size="sm"
                disabled={cloning}
                onClick={handleGenerateCardsFromGuide}
                className="gap-1.5 text-xs bg-teal-600 hover:bg-teal-700 text-white rounded-xl"
              >
                <Layers className="h-3.5 w-3.5" />
                <span>Create Flashcard Deck</span>
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 sm:p-10 space-y-6 shadow-xs">
            <div className="space-y-3 border-b border-border pb-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-teal-600 text-white text-xs">{selectedGuide.categoryTitle || "Core"}</Badge>
                <Badge variant="outline" className="text-xs uppercase font-mono">{selectedGuide.programme}</Badge>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{selectedGuide.readTime}</span>
                </span>
              </div>
              <h2 className="font-serif font-bold text-2xl sm:text-3xl text-foreground">
                {selectedGuide.title}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">
                {selectedGuide.summary}
              </p>
            </div>

            {/* Clinical Key Takeaways Box */}
            {selectedGuide.clinicalKeyTakeaways.length > 0 && (
              <div className="p-5 rounded-xl border border-teal-500/40 bg-teal-500/10 space-y-2">
                <h4 className="font-bold text-teal-900 dark:text-teal-200 text-sm flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-teal-600" />
                  <span>Clinical Key Takeaways & NCLEX Traps</span>
                </h4>
                <ul className="list-disc pl-5 space-y-1.5 text-xs text-teal-950 dark:text-teal-100 leading-relaxed">
                  {selectedGuide.clinicalKeyTakeaways.map((point, idx) => (
                    <li key={idx}>{point}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Guide Content Sections */}
            <div className="prose dark:prose-invert max-w-none text-sm text-foreground leading-relaxed space-y-4">
              <p>
                Clinical practice demands strict adherence to physiological stability baselines and evidence-based nursing interventions. When reviewing this module, cross-reference high-risk pharmacology actions with corresponding client vital signs and diagnostic laboratories.
              </p>
              <div className="p-4 rounded-xl border border-amber-500/40 bg-amber-500/10 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block mb-0.5">High-Yield Clinical Alert:</span>
                  Never delegate initial client assessments, titration of vasopressors, or clinical discharge education to unlicensed assistive personnel (UAP) or practical nurses.
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ── Guides List & Categories ── */
        <div className="space-y-6">
          {/* Categories Horizontal Scroller */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === "all"
                  ? "bg-teal-600 text-white shadow-xs"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              All Categories
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.slug)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  selectedCategory === c.slug
                    ? "bg-teal-600 text-white shadow-xs"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                <span>{c.title}</span>
                <Badge variant="secondary" className="text-[10px] h-4 px-1">
                  {c.guideCount}
                </Badge>
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search curated guides by concept or topic..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 rounded-xl text-xs"
            />
          </div>

          {/* Guides Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loading ? (
              <div className="col-span-full py-12 text-center text-xs text-muted-foreground">
                Loading curated study guides...
              </div>
            ) : filteredGuides.length === 0 ? (
              <div className="col-span-full py-12 text-center text-xs text-muted-foreground">
                No published study guides found matching your filters.
              </div>
            ) : (
              filteredGuides.map((g) => (
                <div
                  key={g.id}
                  onClick={() => handleOpenGuide(g)}
                  className="group p-5 rounded-2xl border border-border bg-card hover:border-teal-500/50 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-semibold text-teal-700 dark:text-teal-300">{g.categoryTitle}</span>
                      <span className="flex items-center gap-1 text-[11px]">
                        <Clock className="h-3 w-3" />
                        <span>{g.readTime}</span>
                      </span>
                    </div>
                    <h3 className="font-serif font-bold text-base text-foreground group-hover:text-teal-600 transition-colors">
                      {g.title}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {g.summary}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-3 border-t border-border/50">
                    <Badge variant="outline" className="text-[10px] uppercase font-mono">
                      {g.programme}
                    </Badge>
                    <span className="font-semibold text-teal-600 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      <span>Read Guide</span>
                      <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
