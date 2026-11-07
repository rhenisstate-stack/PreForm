/**
 * PrepFord Learning Video & Media Service
 * Governs clinical video playlists, privacy-enhanced video embedding (youtube-nocookie.com),
 * and candidate completion tracking.
 */

export interface LearningVideo {
  id: string;
  slug: string;
  title: string;
  description: string;
  provider: "youtube" | "vimeo";
  externalVideoId: string;
  durationMinutes: number;
  thumbnailUrl: string;
  category: "Clinical Judgment" | "Pharmacology" | "Cardiovascular" | "Prioritization & Delegation" | "Pediatrics" | "Safety & Infection";
  programme: "rn" | "pn" | "both";
  requiredTier: "free" | "1_month" | "2_months" | "3_months";
  isPublished: boolean;
  orderIndex: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface LearnerVideoProgress {
  videoId: string;
  completed: boolean;
  progressPercent: number;
  lastWatchedSeconds: number;
  lastWatchedAt: string;
}

const INITIAL_VIDEOS: LearningVideo[] = [
  {
    id: "vid-ncjmm-overview",
    slug: "ncsbn-clinical-judgment-measurement-model",
    title: "Mastering the NCSBN Clinical Judgment Measurement Model (NCJMM)",
    description: "In-depth breakdown of the 6 cognitive steps: Recognize Cues, Analyze Cues, Prioritize Hypotheses, Generate Solutions, Take Actions, and Evaluate Outcomes in Next Gen NCLEX unfolding cases.",
    provider: "youtube",
    externalVideoId: "dQw4w9WgXcQ", // Sample standard privacy-compliant ID
    durationMinutes: 18,
    thumbnailUrl: "/images/blog/prepford-clinical-judgment-hero.jpg",
    category: "Clinical Judgment",
    programme: "both",
    requiredTier: "free",
    isPublished: true,
    orderIndex: 1,
    tags: ["NGN", "NCJMM", "Clinical Judgment", "Case Studies"],
    createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 30).toISOString(),
  },
  {
    id: "vid-cardio-ecg",
    slug: "lethal-cardiac-dysrhythmias-and-emergency-interventions",
    title: "Lethal Cardiac Dysrhythmias & ACLS Emergency Interventions",
    description: "Visual analysis of Ventricular Fibrillation, Pulseless V-Tach, Asystole, and PEA. Differentiating shockable vs non-shockable rhythms, energy joules, and epinephrine/amiodarone timing.",
    provider: "youtube",
    externalVideoId: "kJQP7kiw5Fk",
    durationMinutes: 24,
    thumbnailUrl: "/images/ecg-lead2.png",
    category: "Cardiovascular",
    programme: "rn",
    requiredTier: "1_month",
    isPublished: true,
    orderIndex: 2,
    tags: ["Cardiology", "ECG", "ACLS", "Lethal Rhythms", "Emergency"],
    createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 20).toISOString(),
  },
  {
    id: "vid-pharm-high-alert",
    slug: "high-alert-medications-anticoagulants-and-insulin",
    title: "High-Alert Medications: Heparin Protocols, Warfarin & Insulin Management",
    description: "Critical safety rules for anticoagulants, target aPTT/INR ranges, antidotes (Protamine Sulfate, Vitamin K), and double-check protocols for narrow therapeutic index drugs.",
    provider: "youtube",
    externalVideoId: "9bZkp7q19f0",
    durationMinutes: 21,
    thumbnailUrl: "/images/blog/prepford-high-alert-medications-hero.jpg",
    category: "Pharmacology",
    programme: "both",
    requiredTier: "1_month",
    isPublished: true,
    orderIndex: 3,
    tags: ["Pharmacology", "High-Alert", "Heparin", "Insulin", "Lab Values"],
    createdAt: new Date(Date.now() - 86400000 * 15).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 15).toISOString(),
  },
  {
    id: "vid-prioritization-delegation",
    slug: "delegation-rules-rn-lpn-uap-assignment",
    title: "Delegation Principles: RN vs LPN/VN vs UAP Scope of Practice",
    description: "The 5 Rights of Delegation on the NCLEX. What the RN cannot delegate (EAT: Evaluate, Assess, Teach), stable vs unstable clients, and legal accountability boundaries.",
    provider: "youtube",
    externalVideoId: "fJ9rUzIMcZQ",
    durationMinutes: 16,
    thumbnailUrl: "/images/blog/prepford-delegation-rules-hero.jpg",
    category: "Prioritization & Delegation",
    programme: "both",
    requiredTier: "free",
    isPublished: true,
    orderIndex: 4,
    tags: ["Delegation", "Scope of Practice", "UAP", "LPN", "Prioritization"],
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 10).toISOString(),
  },
  {
    id: "vid-peds-dosage",
    slug: "pediatric-weight-based-dosage-calculations",
    title: "Pediatric Weight-Based Dosage Calculations & Safe Range Verification",
    description: "Step-by-step mg/kg/day dimensional analysis, dividing daily doses into Q8H/Q12H, and verifying prescribed dose against pediatric drug handbook therapeutic limits.",
    provider: "youtube",
    externalVideoId: "RgKAFK5djSk",
    durationMinutes: 19,
    thumbnailUrl: "/images/blog/prepford-pediatric-dosage-hero.jpg",
    category: "Pediatrics",
    programme: "rn",
    requiredTier: "2_months",
    isPublished: true,
    orderIndex: 5,
    tags: ["Pediatrics", "Math", "Dosage Calculations", "Safe Range"],
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
];

let videosStore: LearningVideo[] = [...INITIAL_VIDEOS];
let progressStore: Record<string, LearnerVideoProgress> = {
  "vid-ncjmm-overview": {
    videoId: "vid-ncjmm-overview",
    completed: true,
    progressPercent: 100,
    lastWatchedSeconds: 1080,
    lastWatchedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  "vid-prioritization-delegation": {
    videoId: "vid-prioritization-delegation",
    completed: false,
    progressPercent: 45,
    lastWatchedSeconds: 432,
    lastWatchedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
};

export const videoService = {
  async getVideos(params?: {
    category?: string;
    programme?: string;
    search?: string;
    isPublished?: boolean;
  }): Promise<LearningVideo[]> {
    let result = [...videosStore];

    if (params?.isPublished !== undefined) {
      result = result.filter((v) => v.isPublished === params.isPublished);
    }

    if (params?.programme && params.programme !== "all") {
      result = result.filter((v) => v.programme === "both" || v.programme === params.programme);
    }

    if (params?.category && params.category !== "all") {
      result = result.filter((v) => v.category === params.category);
    }

    if (params?.search) {
      const q = params.search.toLowerCase().trim();
      result = result.filter(
        (v) =>
          v.title.toLowerCase().includes(q) ||
          v.description.toLowerCase().includes(q) ||
          v.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    return result.sort((a, b) => a.orderIndex - b.orderIndex);
  },

  async getVideoBySlug(slug: string): Promise<LearningVideo | null> {
    return videosStore.find((v) => v.slug === slug || v.id === slug) || null;
  },

  async createVideo(
    data: Omit<LearningVideo, "id" | "createdAt" | "updatedAt" | "slug"> & {
      id?: string;
      slug?: string;
    }
  ): Promise<LearningVideo> {
    const slug =
      data.slug?.trim() ||
      data.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

    const newVideo: LearningVideo = {
      ...data,
      id: data.id || `vid-${Date.now()}`,
      slug,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    videosStore.push(newVideo);
    return newVideo;
  },

  async updateVideo(id: string, updates: Partial<LearningVideo>): Promise<LearningVideo> {
    const idx = videosStore.findIndex((v) => v.id === id || v.slug === id);
    if (idx === -1) throw new Error("Video not found");

    const updated = {
      ...videosStore[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    videosStore[idx] = updated;
    return updated;
  },

  async deleteVideo(id: string): Promise<boolean> {
    const idx = videosStore.findIndex((v) => v.id === id || v.slug === id);
    if (idx === -1) throw new Error("Video not found");
    videosStore.splice(idx, 1);
    delete progressStore[id];
    return true;
  },

  async getLearnerProgress(): Promise<Record<string, LearnerVideoProgress>> {
    return { ...progressStore };
  },

  async updateProgress(data: {
    videoId: string;
    progressPercent: number;
    lastWatchedSeconds: number;
    completed?: boolean;
  }): Promise<LearnerVideoProgress> {
    const completed = data.completed ?? data.progressPercent >= 90;
    const record: LearnerVideoProgress = {
      videoId: data.videoId,
      progressPercent: Math.min(100, Math.max(0, data.progressPercent)),
      lastWatchedSeconds: data.lastWatchedSeconds,
      completed,
      lastWatchedAt: new Date().toISOString(),
    };
    progressStore[data.videoId] = record;
    return record;
  },
};
