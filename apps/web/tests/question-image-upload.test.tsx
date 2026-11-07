import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import * as React from "react";
import {
  QuestionImageUpload,
  MAX_QUESTION_IMAGE_BYTES,
  MAX_QUESTION_IMAGE_MB,
  ALLOWED_IMAGE_MIME_TYPES,
  ALLOWED_EXTENSIONS,
} from "@/components/questions/question-image-upload";

// Mock URL.createObjectURL and revokeObjectURL for jsdom environment
const mockCreateObjectURL = vi.fn((file: File) => `blob:http://localhost/${file.name}`);
const mockRevokeObjectURL = vi.fn();

let originalFetch: typeof globalThis.fetch;

beforeEach(() => {
  vi.restoreAllMocks();
  globalThis.URL.createObjectURL = mockCreateObjectURL;
  globalThis.URL.revokeObjectURL = mockRevokeObjectURL;
  mockCreateObjectURL.mockClear();
  mockRevokeObjectURL.mockClear();

  originalFetch = globalThis.fetch;
  globalThis.fetch = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
  globalThis.fetch = originalFetch;
});

describe("QuestionImageUpload Component", () => {
  it("exports correct 5 MB size constants and supported MIME types", () => {
    expect(MAX_QUESTION_IMAGE_MB).toBe(5);
    expect(MAX_QUESTION_IMAGE_BYTES).toBe(5 * 1024 * 1024); // 5,242,880 bytes
    expect(ALLOWED_IMAGE_MIME_TYPES).toContain("image/png");
    expect(ALLOWED_IMAGE_MIME_TYPES).toContain("image/jpeg");
    expect(ALLOWED_IMAGE_MIME_TYPES).toContain("image/webp");
    expect(ALLOWED_IMAGE_MIME_TYPES).toContain("image/gif");
    expect(ALLOWED_EXTENSIONS).toContain(".png");
    expect(ALLOWED_EXTENSIONS).toContain(".jpg");
    expect(ALLOWED_EXTENSIONS).toContain(".jpeg");
    expect(ALLOWED_EXTENSIONS).toContain(".webp");
    expect(ALLOWED_EXTENSIONS).toContain(".gif");
  });

  it("renders upload dropzone with 5 MB guidance and accessible file input", () => {
    render(
      <QuestionImageUpload
        label="Clinical Exhibit Image"
        fieldKey="option_A"
        onChange={vi.fn()}
      />
    );

    expect(screen.getByText("Clinical Exhibit Image")).toBeInTheDocument();
    expect(screen.getByText(/Click to select or drag and drop image here/i)).toBeInTheDocument();
    expect(screen.getByText(/Max 5 MB \(PNG, JPEG, WebP, GIF\)/i)).toBeInTheDocument();

    const fileInput = screen.getByLabelText("Clinical Exhibit Image");
    expect(fileInput).toBeInTheDocument();
    expect(fileInput).toHaveAttribute("type", "file");
    expect(fileInput).toHaveAttribute("accept", ALLOWED_EXTENSIONS.join(","));
  });

  it("rejects files exceeding 5 MB limit (5,242,881 bytes) and prevents upload", async () => {
    const handleChange = vi.fn();

    render(
      <QuestionImageUpload
        label="ECG Strip"
        fieldKey="option_A"
        onChange={handleChange}
      />
    );

    const oversizedFile = new File(["a".repeat(100)], "oversized.png", {
      type: "image/png",
    });
    Object.defineProperty(oversizedFile, "size", {
      value: 5 * 1024 * 1024 + 1, // 5,242,881 bytes
    });

    const fileInput = screen.getByLabelText("ECG Strip");
    fireEvent.change(fileInput, { target: { files: [oversizedFile] } });

    await waitFor(() => {
      expect(
        screen.getByText(/exceeds the maximum allowed limit of 5 MB/i)
      ).toBeInTheDocument();
    });

    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(handleChange).not.toHaveBeenCalled();
  });

  it("rejects files with unsupported format or extension", async () => {
    const handleChange = vi.fn();

    render(
      <QuestionImageUpload
        label="Lab Report"
        fieldKey="option_A"
        onChange={handleChange}
      />
    );

    const pdfFile = new File(["dummy-pdf-content"], "document.pdf", {
      type: "application/pdf",
    });

    const fileInput = screen.getByLabelText("Lab Report");
    fireEvent.change(fileInput, { target: { files: [pdfFile] } });

    await waitFor(() => {
      expect(screen.getByText(/Unsupported file format/i)).toBeInTheDocument();
    });

    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(handleChange).not.toHaveBeenCalled();
  });

  it("generates instant preview and completes upload for valid image under 5 MB", async () => {
    const handleChange = vi.fn();
    (globalThis.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        media: {
          id: "media-uuid-1234",
          fileName: "chest-xray.png",
          contentType: "image/png",
          fileSizeBytes: 2048,
          url: "/api/questions/media/media-uuid-1234",
        },
      }),
    });

    render(
      <QuestionImageUpload
        label="Diagnostic Chest X-Ray"
        fieldKey="option_B"
        questionId="q-existing-456"
        onChange={handleChange}
      />
    );

    const validFile = new File(["valid-image-bytes"], "chest-xray.png", {
      type: "image/png",
    });
    Object.defineProperty(validFile, "size", { value: 2048 });

    const fileInput = screen.getByLabelText("Diagnostic Chest X-Ray");
    fireEvent.change(fileInput, { target: { files: [validFile] } });

    // Instant local preview created
    expect(mockCreateObjectURL).toHaveBeenCalledWith(validFile);

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/api/admin/questions/q-existing-456/media",
        expect.objectContaining({
          method: "POST",
        })
      );
    });

    await waitFor(() => {
      expect(handleChange).toHaveBeenCalledWith("/api/questions/media/media-uuid-1234");
    });

    expect(screen.getByText("chest-xray.png")).toBeInTheDocument();
  });

  it("renders existing saved image when reopening a question", () => {
    render(
      <QuestionImageUpload
        label="Saved Wound Photograph"
        fieldKey="option_C"
        value="/api/questions/media/media-wound-789"
        onChange={vi.fn()}
        onRemove={vi.fn()}
      />
    );

    // Existing saved image preview should be rendered
    const previewImg = screen.getByRole("img", { name: /Clinical question exhibit preview/i });
    expect(previewImg).toBeInTheDocument();
    expect(previewImg).toHaveAttribute("src", "/api/questions/media/media-wound-789");

    // Action buttons visible
    expect(screen.getByRole("button", { name: /^Replace$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Remove$/i })).toBeInTheDocument();
  });

  it("removes image and resets preview when Remove button is clicked", async () => {
    const handleRemove = vi.fn();
    const handleChange = vi.fn();

    render(
      <QuestionImageUpload
        label="Saved Exhibit"
        fieldKey="option_D"
        value="/api/questions/media/media-wound-789"
        onChange={handleChange}
        onRemove={handleRemove}
      />
    );

    const removeBtn = screen.getByRole("button", { name: /Remove/i });
    fireEvent.click(removeBtn);

    expect(handleRemove).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith("");

    // Should return to dropzone upload state
    expect(screen.getByText(/Click to select or drag and drop image here/i)).toBeInTheDocument();
  });

  it("handles server upload failure gracefully and displays error message", async () => {
    const handleChange = vi.fn();
    (globalThis.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        success: false,
        error: "Database storage failed: image exceeds 5 MB payload",
      }),
    });

    render(
      <QuestionImageUpload
        label="Skin Lesion"
        fieldKey="option_A"
        onChange={handleChange}
      />
    );

    const validFile = new File(["test-content"], "skin.png", { type: "image/png" });
    const fileInput = screen.getByLabelText("Skin Lesion");
    fireEvent.change(fileInput, { target: { files: [validFile] } });

    await waitFor(() => {
      expect(
        screen.getByText(/Database storage failed: image exceeds 5 MB payload/i)
      ).toBeInTheDocument();
    });

    expect(handleChange).not.toHaveBeenCalled();
  });
});
