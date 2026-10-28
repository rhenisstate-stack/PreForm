import { describe, it, expect, beforeEach } from "vitest";
import {
  getPerformanceTier,
  getTierDescription,
  getTierStyles,
  getTierShortCode,
  scoreQuestion,
  createCompletedAttempt,
  getStoredAttempts,
  saveStoredAttempt,
  clearStoredAttempts,
  isValidAssessmentAttempt,
  CLINICAL_QUESTION_BANK,
  NCLEX_CLIENT_NEEDS,
  ClinicalQuestionDefinition,
  CompletedAssessmentAttempt,
} from "@/lib/assessment-store";

describe("PrepFord Assessment Scoring, Content Quality & Data Persistence Audit", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // =========================================================================
  // 1. SCORING VERIFICATION & ANSWER KEY MATCHING
  // =========================================================================
  describe("Assessment Scoring Engine & Rules", () => {
    const singleChoiceQ: ClinicalQuestionDefinition = {
      id: "test-q1",
      stem: "Prioritization scenario stem",
      domain: "Safe and Effective Care Environment: Management of Care",
      questionType: "single_choice",
      correctAnswerIndex: 2,
      options: ["Option A", "Option B", "Option C", "Option D"],
      rationale: "Option C is correct because of airway priority.",
    };

    const multiSelectQ: ClinicalQuestionDefinition = {
      id: "test-q2-sata",
      stem: "Signs of acute coronary syndrome (Select all that apply.)",
      domain: "Physiological Integrity: Physiological Adaptation",
      questionType: "multi_select",
      correctAnswerIndices: [0, 1, 3],
      options: [
        "Substernal chest pressure",
        "Diaphoresis",
        "Relief with inspiration",
        "ST-elevation on ECG",
      ],
      rationale: "Options A, B, and D are ischemic signs. Option C indicates pericarditis.",
    };

    it("evaluates single-choice questions with 100% accuracy for correct choices", () => {
      const res = scoreQuestion(singleChoiceQ, { selectedOptionIndex: 2 });
      expect(res.isCorrect).toBe(true);
      expect(res.scoreAwarded).toBe(1);
      expect(res.isUnanswered).toBe(false);
    });

    it("evaluates single-choice questions as incorrect for incorrect choices", () => {
      const res = scoreQuestion(singleChoiceQ, { selectedOptionIndex: 0 });
      expect(res.isCorrect).toBe(false);
      expect(res.scoreAwarded).toBe(0);
      expect(res.isUnanswered).toBe(false);
    });

    it("evaluates unanswered single-choice questions as incorrect without default credit to option A", () => {
      // If a candidate skips the question, selectedOptionIndex is undefined or -1
      const res1 = scoreQuestion(singleChoiceQ, undefined);
      expect(res1.isCorrect).toBe(false);
      expect(res1.scoreAwarded).toBe(0);
      expect(res1.isUnanswered).toBe(true);

      const res2 = scoreQuestion(singleChoiceQ, { selectedOptionIndex: -1 });
      expect(res2.isCorrect).toBe(false);
      expect(res2.scoreAwarded).toBe(0);
      expect(res2.isUnanswered).toBe(true);

      // Even if correctAnswerIndex happens to be 0, an unanswered question (-1) must NOT receive credit
      const zeroKeyQ: ClinicalQuestionDefinition = {
        ...singleChoiceQ,
        correctAnswerIndex: 0,
      };
      const resZero = scoreQuestion(zeroKeyQ, { selectedOptionIndex: -1 });
      expect(resZero.isCorrect).toBe(false);
      expect(resZero.scoreAwarded).toBe(0);
      expect(resZero.isUnanswered).toBe(true);
    });

    it("evaluates multiple-select (SATA) questions using exact match rule for full credit", () => {
      const exactMatch = scoreQuestion(multiSelectQ, { selectedOptionIndices: [0, 1, 3] });
      expect(exactMatch.isCorrect).toBe(true);
      expect(exactMatch.scoreAwarded).toBe(1);
      expect(exactMatch.isUnanswered).toBe(false);
    });

    it("evaluates multiple-select (SATA) partial selection without awarding full correct status", () => {
      // Selected only 2 of the 3 correct keys
      const partial = scoreQuestion(multiSelectQ, { selectedOptionIndices: [0, 1] });
      expect(partial.isCorrect).toBe(false);
      // Partial credit = 2 / 3 ≈ 0.67
      expect(partial.scoreAwarded).toBe(0.67);
      expect(partial.isUnanswered).toBe(false);
    });

    it("penalizes incorrect distractors in SATA questions using NGN +/- methodology down to floor 0", () => {
      // Selected 1 correct (0) and 1 distractor (2) -> 1 - 1 = 0
      const distractorChosen = scoreQuestion(multiSelectQ, { selectedOptionIndices: [0, 2] });
      expect(distractorChosen.isCorrect).toBe(false);
      expect(distractorChosen.scoreAwarded).toBe(0);

      // Selected only the distractor (2) -> points = -1 clamped to 0
      const onlyDistractor = scoreQuestion(multiSelectQ, { selectedOptionIndices: [2] });
      expect(onlyDistractor.isCorrect).toBe(false);
      expect(onlyDistractor.scoreAwarded).toBe(0);
    });

    it("evaluates unanswered multi-select (SATA) questions as 0 score and unanswered", () => {
      const emptySata = scoreQuestion(multiSelectQ, { selectedOptionIndices: [] });
      expect(emptySata.isCorrect).toBe(false);
      expect(emptySata.scoreAwarded).toBe(0);
      expect(emptySata.isUnanswered).toBe(true);
    });

    it("calculates denominators and integer rounding percentages accurately in completed attempts", () => {
      // 5 questions test: user answers 3 correctly, 1 incorrectly, 1 unanswered
      const attempt = createCompletedAttempt({
        testType: "tutored_cat",
        attemptNumber: 1,
        questionCount: 5,
        userAnswers: [
          { questionIndex: 0, selectedOptionIndex: CLINICAL_QUESTION_BANK[0].correctAnswerIndex },
          { questionIndex: 1, selectedOptionIndex: CLINICAL_QUESTION_BANK[1].correctAnswerIndex },
          { questionIndex: 2, selectedOptionIndex: CLINICAL_QUESTION_BANK[2].correctAnswerIndex },
          { questionIndex: 3, selectedOptionIndex: ((CLINICAL_QUESTION_BANK[3].correctAnswerIndex ?? 0) + 1) % 4 },
          // questionIndex 4 intentionally unanswered
        ],
      });

      expect(attempt.totalQuestions).toBe(5);
      expect(attempt.correctCount).toBe(3);
      // 3 / 5 = 60%
      expect(attempt.scorePercent).toBe(60);
      expect(attempt.performanceTier).toBe("Borderline");

      // Verify Question 4 is marked unanswered
      const q4 = attempt.questions[4];
      expect(q4.isUnanswered).toBe(true);
      expect(q4.isCorrect).toBe(false);
      expect(q4.userAnswerIndex).toBe(-1);
    });

    it("safely handles empty assessments with 0 questions", () => {
      const emptyAttempt = createCompletedAttempt({
        testType: "tutored_cat",
        attemptNumber: 1,
        questionCount: 0,
        userAnswers: [],
      });

      expect(emptyAttempt.totalQuestions).toBe(0);
      expect(emptyAttempt.correctCount).toBe(0);
      expect(emptyAttempt.scorePercent).toBe(0);
      expect(emptyAttempt.performanceTier).toBe("Low");
      expect(emptyAttempt.domains).toHaveLength(0);
      expect(emptyAttempt.questions).toHaveLength(0);
    });

    it("retaking an assessment produces distinct attempt IDs with accurate timestamps", () => {
      const attempt1 = createCompletedAttempt({
        testType: "tutored_cat",
        attemptNumber: 1,
        questionCount: 5,
        userAnswers: [],
      });

      const attempt2 = createCompletedAttempt({
        testType: "tutored_cat",
        attemptNumber: 2,
        questionCount: 5,
        userAnswers: [],
      });

      expect(attempt1.id).not.toBe(attempt2.id);
      expect(attempt1.name).toBe("Tutored CAT 1");
      expect(attempt2.name).toBe("Tutored CAT 2");
      expect(attempt1.timestamp).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // 2. AUDIT PERFORMANCE TIERS & READINESS CLAIMS
  // =========================================================================
  describe("Performance Tiers & Boundary Verification", () => {
    it("partitions every possible score 0 to 100 into mutually exclusive, exhaustive tiers", () => {
      // 0 - 54% -> Low
      expect(getPerformanceTier(0)).toBe("Low");
      expect(getPerformanceTier(54)).toBe("Low");

      // 55 - 64% -> Borderline
      expect(getPerformanceTier(55)).toBe("Borderline");
      expect(getPerformanceTier(64)).toBe("Borderline");

      // 65 - 74% -> High
      expect(getPerformanceTier(65)).toBe("High");
      expect(getPerformanceTier(74)).toBe("High");

      // 75 - 100% -> Very High
      expect(getPerformanceTier(75)).toBe("Very High");
      expect(getPerformanceTier(100)).toBe("Very High");
    });

    it("provides objective readiness descriptions that do not promise examination outcomes", () => {
      const vhDesc = getTierDescription("Very High");
      const hDesc = getTierDescription("High");
      const bDesc = getTierDescription("Borderline");
      const lDesc = getTierDescription("Low");

      expect(vhDesc).toContain("Advanced readiness tier");
      expect(vhDesc).not.toContain("Strong pass probability");

      expect(hDesc).toContain("Proficient readiness tier");
      expect(hDesc).not.toContain("Pass probability on target");

      expect(bDesc).toContain("Developing readiness tier");
      expect(lDesc).toContain("Remediation recommended");

      // Verify short codes
      expect(getTierShortCode("Very High")).toBe("VH");
      expect(getTierShortCode("High")).toBe("H");
      expect(getTierShortCode("Borderline")).toBe("B");
      expect(getTierShortCode("Low")).toBe("L");

      // Verify tier styles include clean descriptions
      const styles = getTierStyles("High");
      expect(styles.label).toBe("High");
      expect(styles.accentHex).toBe("#0d9488");
      expect(styles.description).toBe(hDesc);
    });
  });

  // =========================================================================
  // 3. QUESTION-BANK QUALITY & NCSBN CLIENT NEEDS COVERAGE
  // =========================================================================
  describe("Question-Bank Quality & Curriculum Alignment", () => {
    it("covers all 8 NCSBN Client Needs categories represented by PrepFord", () => {
      const representedDomains = new Set(CLINICAL_QUESTION_BANK.map((q) => q.domain));

      for (const requiredCategory of NCLEX_CLIENT_NEEDS) {
        expect(
          representedDomains.has(requiredCategory),
          `Missing coverage for Client Needs category: "${requiredCategory}"`
        ).toBe(true);
      }
    });

    it("verifies every question in the question bank has stable ID, valid options, answer key, and rationales", () => {
      const idsSeen = new Set<string>();

      for (const q of CLINICAL_QUESTION_BANK) {
        // Stable, unique ID
        expect(q.id).toBeTruthy();
        expect(idsSeen.has(q.id)).toBe(false);
        idsSeen.add(q.id);

        // Clinical Stem
        expect(q.stem.length).toBeGreaterThan(20);

        // Options
        expect(q.options.length).toBeGreaterThanOrEqual(4);
        for (const opt of q.options) {
          expect(typeof opt).toBe("string");
          expect(opt.trim().length).toBeGreaterThan(0);
        }

        // Answer Key
        if (q.questionType === "multi_select") {
          expect(Array.isArray(q.correctAnswerIndices)).toBe(true);
          expect(q.correctAnswerIndices!.length).toBeGreaterThan(1);
          for (const keyIdx of q.correctAnswerIndices!) {
            expect(keyIdx).toBeGreaterThanOrEqual(0);
            expect(keyIdx).toBeLessThan(q.options.length);
          }
        } else {
          expect(typeof q.correctAnswerIndex).toBe("number");
          expect(q.correctAnswerIndex).toBeGreaterThanOrEqual(0);
          expect(q.correctAnswerIndex).toBeLessThan(q.options.length);
        }

        // Comprehensive Rationale
        expect(q.rationale.length).toBeGreaterThan(30);
      }
    });

    it("includes multi-select (Select All That Apply) items in the question bank", () => {
      const sataItems = CLINICAL_QUESTION_BANK.filter((q) => q.questionType === "multi_select");
      expect(sataItems.length).toBeGreaterThanOrEqual(1);

      const miItem = sataItems.find((q) => q.id === "q-mi-clinical-findings-sata");
      expect(miItem).toBeDefined();
      expect(miItem?.options).toHaveLength(6);
      expect(miItem?.correctAnswerIndices).toEqual([0, 1, 2, 4]);
    });
  });

  // =========================================================================
  // 4. PERSISTENCE, ACCOUNT ISOLATION & DATA INTEGRITY
  // =========================================================================
  describe("Persistence & Account Isolation", () => {
    it("returns an empty array when userId is missing or undefined (no guest bleed)", () => {
      expect(getStoredAttempts(undefined)).toEqual([]);
      expect(getStoredAttempts("")).toEqual([]);
      expect(getStoredAttempts("   ")).toEqual([]);
    });

    it("isolates assessment attempts between distinct learner accounts", () => {
      const attemptCandidateA = createCompletedAttempt({
        testType: "tutored_cat",
        attemptNumber: 1,
        questionCount: 3,
        userAnswers: [
          { questionIndex: 0, selectedOptionIndex: CLINICAL_QUESTION_BANK[0].correctAnswerIndex },
        ],
      });

      const attemptCandidateB = createCompletedAttempt({
        testType: "rat",
        attemptNumber: 1,
        questionCount: 3,
        userAnswers: [],
      });

      saveStoredAttempt("learner-alpha", attemptCandidateA);
      saveStoredAttempt("learner-beta", attemptCandidateB);

      const alphaAttempts = getStoredAttempts("learner-alpha");
      const betaAttempts = getStoredAttempts("learner-beta");

      expect(alphaAttempts).toHaveLength(1);
      expect(alphaAttempts[0].id).toBe(attemptCandidateA.id);
      expect(alphaAttempts[0].name).toBe("Tutored CAT 1");

      expect(betaAttempts).toHaveLength(1);
      expect(betaAttempts[0].id).toBe(attemptCandidateB.id);
      expect(betaAttempts[0].name).toBe("Readiness Test 1");

      // Verify clearing learner-alpha does not affect learner-beta
      clearStoredAttempts("learner-alpha");
      expect(getStoredAttempts("learner-alpha")).toHaveLength(0);
      expect(getStoredAttempts("learner-beta")).toHaveLength(1);
    });

    it("validates deserialized attempts and rejects corrupted or malformed entries", () => {
      const validAttempt: CompletedAssessmentAttempt = {
        id: "att-valid-1",
        name: "Tutored CAT 1",
        type: "tutored_cat",
        date: "Oct 28, 2026",
        timestamp: 1729756800000,
        scorePercent: 75,
        performanceTier: "Very High",
        totalQuestions: 10,
        correctCount: 8,
        durationMinutes: 12,
        domains: [],
        questions: [],
      };

      expect(isValidAssessmentAttempt(validAttempt)).toBe(true);

      // Malformed entries
      expect(isValidAssessmentAttempt(null)).toBe(false);
      expect(isValidAssessmentAttempt({})).toBe(false);
      expect(isValidAssessmentAttempt({ ...validAttempt, scorePercent: NaN })).toBe(false);
      expect(isValidAssessmentAttempt({ ...validAttempt, scorePercent: 120 })).toBe(false);
      expect(isValidAssessmentAttempt({ ...validAttempt, scorePercent: -5 })).toBe(false);
      expect(isValidAssessmentAttempt({ ...validAttempt, performanceTier: "InvalidTier" as any })).toBe(false);
      expect(isValidAssessmentAttempt({ ...validAttempt, totalQuestions: "10" as any })).toBe(false);

      // Inject corrupted JSON array into localStorage and verify safe filtering
      localStorage.setItem(
        "prepford_assessment_attempts_learner-corrupted",
        JSON.stringify([
          validAttempt,
          { id: "corrupt-1", name: "Corrupted Test", scorePercent: "invalid" },
          { id: "corrupt-2", totalQuestions: -1 },
          null,
        ])
      );

      const sanitized = getStoredAttempts("learner-corrupted");
      expect(sanitized).toHaveLength(1);
      expect(sanitized[0].id).toBe("att-valid-1");
    });
  });
});
