import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import * as React from "react";
import {
  CANONICAL_QUESTION_TYPES,
  getDefaultStructuredContent,
  validateQuestionPayload,
} from "@/lib/question-types";
import { QuestionTypeRenderer } from "@/components/questions/question-type-renderer";

describe("All 18 Canonical Question Types — Validation, Interactive Candidate & Review Rendering", () => {
  it("contains exactly 18 canonical question types", () => {
    expect(CANONICAL_QUESTION_TYPES).toHaveLength(18);
    expect(new Set(CANONICAL_QUESTION_TYPES.map((t) => t.key)).size).toBe(18);
  });

  it.each(CANONICAL_QUESTION_TYPES.map((t) => [t.key, t] as const))(
    "%s: validates payload, renders candidate-interactive without leaking rationale, and renders candidate-review with rationale",
    (typeKey, def) => {
      const options = def.isOptionBased
        ? def.key === "true-false"
          ? [
              { optionKey: "A", content: "True", isCorrect: true, rationale: "True rationale" },
              { optionKey: "B", content: "False", isCorrect: false, rationale: "False rationale" },
            ]
          : [
              { optionKey: "A", content: "Option A", isCorrect: true, rationale: "A rationale" },
              { optionKey: "B", content: "Option B", isCorrect: !def.requiresSingleCorrectOption, rationale: "B rationale" },
              { optionKey: "C", content: "Option C", isCorrect: false, rationale: "C rationale" },
            ]
        : [];

      const structuredContent = def.isOptionBased
        ? undefined
        : JSON.stringify(getDefaultStructuredContent(def.key));

      const validation = validateQuestionPayload({
        questionTypeKey: typeKey,
        stem: `Clinical stem for ${typeKey}`,
        options,
        structuredContentJson: structuredContent,
      });
      expect(validation.valid).toBe(true);

      const onToggleOption = vi.fn();
      const onStructuredChange = vi.fn();
      const rationaleText = `Authoritative rationale for ${typeKey}`;

      // 1. Candidate Interactive Mode (Exam Mode): must NOT leak rationale
      const { unmount } = render(
        <QuestionTypeRenderer
          questionTypeKey={typeKey}
          stem={`Clinical stem for ${typeKey}`}
          options={options}
          structuredContentJson={structuredContent}
          overallRationale={rationaleText}
          mode="candidate-interactive"
          onToggleOptionIndex={onToggleOption}
          onStructuredResponseChange={onStructuredChange}
        />
      );

      expect(screen.getByText(`Clinical stem for ${typeKey}`)).toBeInTheDocument();
      expect(screen.queryByText(rationaleText)).not.toBeInTheDocument();

      if (def.isOptionBased) {
        const optButtons = screen.getAllByRole(def.requiresSingleCorrectOption ? "radio" : "checkbox");
        fireEvent.click(optButtons[0]);
        expect(onToggleOption).toHaveBeenCalledWith(0);
      } else {
        expect(screen.getByTestId(`structured-renderer-${typeKey}`)).toBeInTheDocument();
      }

      unmount();

      // 2. Candidate Review Mode: MUST reveal rationale
      render(
        <QuestionTypeRenderer
          questionTypeKey={typeKey}
          stem={`Clinical stem for ${typeKey}`}
          options={options}
          structuredContentJson={structuredContent}
          overallRationale={rationaleText}
          mode="candidate-review"
        />
      );

      expect(screen.getByText(rationaleText)).toBeInTheDocument();
    }
  );
});
