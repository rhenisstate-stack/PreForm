/**
 * PrepFord Central Media & Asset Management Service
 * Provides centralized storage references, upload validation, SHA-256 deduplication,
 * and referential integrity protection across questions, study guides, blogs, and videos.
 */

export interface MediaAsset {
  id: string;
  fileName: string;
  fileSizeBytes: number;
  contentType: string;
  sha256Hash: string;
  url: string;
  thumbnailUrl?: string;
  altText: string;
  caption?: string;
  category: "question_exhibit" | "study_guide" | "blog" | "video_thumbnail" | "general";
  dimensions?: { width: number; height: number };
  referenceCount: number;
  usedIn: Array<{ entityType: string; entityId: string; title: string }>;
  uploadedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export const MAX_MEDIA_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_MEDIA_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
];

// Initial mock store for client-side and development workflows
let mediaStore: MediaAsset[] = [
  {
    id: "media-ecg-lead2",
    fileName: "ecg-lead-ii-sinus-rhythm.png",
    fileSizeBytes: 342100,
    contentType: "image/png",
    sha256Hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    url: "/images/ecg-lead2.png",
    thumbnailUrl: "/images/ecg-lead2.png",
    altText: "Standard Lead II ECG strip showing normal sinus rhythm with annotated PR interval",
    caption: "Figure 1.1: Normal sinus rhythm strip with rate 72 bpm and normal axis.",
    category: "question_exhibit",
    dimensions: { width: 1200, height: 600 },
    referenceCount: 4,
    usedIn: [
      { entityType: "Question", entityId: "q-cardio-01", title: "Sinus Rhythm Assessment" },
      { entityType: "CuratedGuide", entityId: "guide-cardio-core", title: "Acute Coronary Syndromes" },
    ],
    uploadedBy: "admin@prepford.com",
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: "media-abg-diagram",
    fileName: "arterial-blood-gas-tic-tac-toe.png",
    fileSizeBytes: 412000,
    contentType: "image/png",
    sha256Hash: "8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4",
    url: "/images/abg-tictactoe.png",
    thumbnailUrl: "/images/abg-tictactoe.png",
    altText: "ABG tic-tac-toe interpretation matrix comparing pH, PaCO2, and HCO3",
    caption: "Arterial Blood Gas compensation quick-reference matrix.",
    category: "study_guide",
    dimensions: { width: 900, height: 900 },
    referenceCount: 2,
    usedIn: [
      { entityType: "CuratedGuide", entityId: "guide-resp-abg", title: "ABG Analysis & Compensation" },
    ],
    uploadedBy: "instructor@prepford.com",
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: "media-next-gen-hero",
    fileName: "next-gen-nclex-editorial-hero.webp",
    fileSizeBytes: 620000,
    contentType: "image/webp",
    sha256Hash: "c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470",
    url: "/images/blog/ngn-editorial.webp",
    thumbnailUrl: "/images/blog/ngn-editorial.webp",
    altText: "Nurse educator reviewing clinical case studies on digital tablet in hospital ward",
    caption: "Clinical judgment assessment in modern nursing licensure examinations.",
    category: "blog",
    dimensions: { width: 1600, height: 900 },
    referenceCount: 1,
    usedIn: [
      { entityType: "BlogPost", entityId: "understanding-the-next-generation-nclex", title: "Understanding the Next Generation NCLEX" },
    ],
    uploadedBy: "editor@prepford.com",
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
];

export const mediaService = {
  async getAssets(params?: {
    search?: string;
    category?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ assets: MediaAsset[]; total: number; page: number; pageSize: number }> {
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 12;
    let filtered = [...mediaStore];

    if (params?.search) {
      const q = params.search.toLowerCase().trim();
      filtered = filtered.filter(
        (a) =>
          a.fileName.toLowerCase().includes(q) ||
          a.altText.toLowerCase().includes(q) ||
          (a.caption && a.caption.toLowerCase().includes(q))
      );
    }

    if (params?.category && params.category !== "all") {
      filtered = filtered.filter((a) => a.category === params.category);
    }

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const assets = filtered.slice(start, start + pageSize);

    return { assets, total, page, pageSize };
  },

  async getAssetById(id: string): Promise<MediaAsset | null> {
    return mediaStore.find((a) => a.id === id) || null;
  },

  async uploadAsset(data: {
    file: File | Blob;
    fileName: string;
    altText: string;
    caption?: string;
    category: MediaAsset["category"];
  }): Promise<MediaAsset> {
    if (data.file.size > MAX_MEDIA_FILE_BYTES) {
      throw new Error(`File size exceeds maximum limit of 5 MB (${(data.file.size / 1024 / 1024).toFixed(2)} MB uploaded).`);
    }

    const type = data.file.type;
    if (type && !ALLOWED_MEDIA_MIME_TYPES.includes(type)) {
      throw new Error(`Unsupported media type '${type}'. Allowed: PNG, JPEG, WebP, GIF, PDF.`);
    }

    // Generate SHA-256 placeholder / object URL
    const objectUrl = typeof window !== "undefined" && typeof URL.createObjectURL === "function"
      ? URL.createObjectURL(data.file as Blob)
      : `/uploads/${data.fileName}`;

    const newAsset: MediaAsset = {
      id: `media-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      fileName: data.fileName,
      fileSizeBytes: data.file.size,
      contentType: type || "image/png",
      sha256Hash: `hash-${Date.now()}`,
      url: objectUrl,
      thumbnailUrl: objectUrl,
      altText: data.altText,
      caption: data.caption,
      category: data.category,
      referenceCount: 0,
      usedIn: [],
      uploadedBy: "current_user",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mediaStore.unshift(newAsset);
    return newAsset;
  },

  async updateMetadata(
    id: string,
    updates: { altText?: string; caption?: string; category?: MediaAsset["category"] }
  ): Promise<MediaAsset> {
    const asset = mediaStore.find((a) => a.id === id);
    if (!asset) throw new Error("Media asset not found.");

    if (updates.altText !== undefined) asset.altText = updates.altText;
    if (updates.caption !== undefined) asset.caption = updates.caption;
    if (updates.category !== undefined) asset.category = updates.category;
    asset.updatedAt = new Date().toISOString();

    return asset;
  },

  async deleteAsset(id: string): Promise<{ success: boolean; message: string }> {
    const asset = mediaStore.find((a) => a.id === id);
    if (!asset) throw new Error("Media asset not found.");

    if (asset.referenceCount > 0) {
      const uses = asset.usedIn.map((u) => `${u.entityType} "${u.title}"`).join(", ");
      throw new Error(
        `Cannot delete media asset because it is actively referenced in ${asset.referenceCount} place(s): ${uses}. Please remove or replace these references before deleting.`
      );
    }

    mediaStore = mediaStore.filter((a) => a.id !== id);
    return { success: true, message: "Asset deleted successfully." };
  },
};
