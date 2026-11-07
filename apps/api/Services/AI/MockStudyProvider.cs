using System.Text.Json;
using Preform.Api.DTOs;

namespace Preform.Api.Services.AI;

public class MockStudyProvider : IAIStudyProvider
{
    public string ProviderName => "mock";
    public bool IsAvailable => true;

    public Task<AISummarizeNoteResultDto> SummarizeNoteAsync(AISummarizeNoteRequest request, CancellationToken cancellationToken = default)
    {
        var text = request.NoteText ?? string.Empty;
        var words = text.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        var preview = words.Length > 20 ? string.Join(' ', words.Take(20)) + "..." : text;

        var result = new AISummarizeNoteResultDto
        {
            Summary = $"Clinical Summary: {preview}\nKey NCLEX priority involves monitoring physiological response, maintaining fluid/electrolyte balance, and recognizing early deterioration.",
            KeyTakeaways = new List<string>
            {
                "Always assess airway, breathing, and circulation (ABCs) prior to intervention.",
                "Verify vital signs and laboratory baselines before administering high-alert medications.",
                "Educate the patient and family on signs of adverse effects and post-discharge self-monitoring."
            },
            KeyTerms = new Dictionary<string, string>
            {
                ["Triage Prioritization"] = "Evaluation of clinical urgency using Maslow's hierarchy and ABC framework.",
                ["Adverse Reaction"] = "An unexpected, unintended, and harmful response to an intervention or drug.",
                ["Orthostatic Hypotension"] = "Significant drop in blood pressure upon standing, requiring fall precautions."
            },
            SuggestedRevisionQuestions = new List<string>
            {
                "What is the first nursing assessment you should complete if the patient's vitals suddenly drop?",
                "Which laboratory values should be monitored before administering potassium-sparing diuretics?",
                "What clinical signs indicate an acute deterioration versus expected post-procedure findings?"
            }
        };

        return Task.FromResult(result);
    }

    public Task<List<AIGeneratedFlashcardDto>> GenerateFlashcardsAsync(AIGenerateFlashcardsRequest request, CancellationToken cancellationToken = default)
    {
        var topic = string.IsNullOrWhiteSpace(request.Topic) ? "NCLEX Clinical Core" : request.Topic;
        var count = Math.Clamp(request.Count, 1, 10);
        var cards = new List<AIGeneratedFlashcardDto>();

        var templates = new[]
        {
            ("What is the primary nursing action for suspected pulmonary embolism?",
             "Immediately apply high-flow oxygen via non-rebreather, elevate head of bed, and notify provider.",
             "Oxygenation and ventilation preservation are paramount while preparing for heparin therapy and CT angiography."),
            ("What are the cardinal clinical signs of digoxin toxicity?",
             "Nausea, vomiting, anorexia, visual disturbances (yellow/green halos), and bradycardia.",
             "Always check apical pulse for a full minute; hold digoxin if HR < 60 bpm in adults."),
            ("What is the therapeutic target range for INR during warfarin therapy for atrial fibrillation?",
             "2.0 to 3.0",
             "Values > 3.0 increase major bleeding risk; notify healthcare provider and hold dose if INR > 3.5."),
            ("Identify the priority nursing diagnosis for an acute burn patient in the emergent phase.",
             "Deficient Fluid Volume related to increased capillary permeability and fluid shifting.",
             "Parkland formula calculations dictate massive crystalloid resuscitation within the first 24 hours."),
            ("Which electrolyte disturbance causes peaked T waves on ECG?",
             "Hyperkalemia (serum potassium > 5.0 mEq/L).",
             "Severe hyperkalemia can progress to ventricular fibrillation; IV calcium gluconate stabilizes cardiac membranes.")
        };

        for (int i = 0; i < count; i++)
        {
            var t = templates[i % templates.Length];
            cards.Add(new AIGeneratedFlashcardDto
            {
                Front = $"[{topic}] {t.Item1}",
                Back = t.Item2,
                Explanation = t.Item3,
                Difficulty = "high_yield",
                CardStyle = "qa"
            });
        }

        return Task.FromResult(cards);
    }

    public Task<List<AIGeneratedQuizQuestionDto>> GenerateQuizAsync(AIGenerateQuizRequest request, CancellationToken cancellationToken = default)
    {
        var topic = string.IsNullOrWhiteSpace(request.Topic) ? "NCLEX Clinical Practice" : request.Topic;
        var count = Math.Clamp(request.Count, 1, 10);
        var list = new List<AIGeneratedQuizQuestionDto>();

        for (int i = 0; i < count; i++)
        {
            list.Add(new AIGeneratedQuizQuestionDto
            {
                Stem = $"A nurse is caring for a client with {topic}. Which clinical finding requires immediate notification of the primary healthcare provider?",
                QuestionTypeKey = "single-choice",
                ClinicalScenario = $"A 64-year-old client is admitted to the medical-surgical unit. Current vital signs: BP 88/54 mmHg, HR 118 bpm, RR 26/min, SpO2 89% on room air.",
                Options = new List<string>
                {
                    "Mild dry oral mucosa and thirst",
                    "New onset bilateral expiratory wheezes and cyanosis",
                    "Serum potassium 4.2 mEq/L",
                    "Urine output of 45 mL/hr over past 4 hours"
                },
                CorrectAnswerIndices = new List<int> { 1 },
                Rationale = "New onset bilateral wheezes and cyanosis indicate acute airway compromise and respiratory failure, requiring immediate provider intervention and oxygen escalation.",
                Difficulty = "Moderate"
            });
        }

        return Task.FromResult(list);
    }

    public Task<string> TutorChatAsync(AITutorChatRequest request, CancellationToken cancellationToken = default)
    {
        var userMsg = request.Message ?? string.Empty;
        var response = $"Hello! As your PrepFord NCLEX Clinical Tutor, let's explore your question:\n\n" +
                       $"\"{userMsg}\"\n\n" +
                       "Key Clinical Takeaway:\n" +
                       "1. Prioritize patient safety using the ABC framework (Airway, Breathing, Circulation).\n" +
                       "2. Differentiate between acute/unstable vs. chronic/stable presentations.\n" +
                       "3. Confirm provider prescriptions and contraindications before administering treatments.\n\n" +
                       "Would you like me to walk through a practice scenario or test your understanding with a quick clinical drill?";

        return Task.FromResult(response);
    }

    public Task<string> GenerateStudyPlanAsync(AIGenerateStudyPlanRequest request, CancellationToken cancellationToken = default)
    {
        var days = (request.TargetExamDate - DateTime.UtcNow).Days;
        var targetDays = days > 0 ? days : 30;

        var plan = new
        {
            overview = $"Personalized {request.Programme.ToUpperInvariant()} NCLEX Study Roadmap ({targetDays} days, {request.WeeklyHours} hrs/week)",
            milestones = new[]
            {
                new { phase = "Phase 1: Foundation & Core Pharmacology", days = "Days 1-10", hoursPerWeek = request.WeeklyHours, focus = "Cardiovascular, Respiratory, and Endocrine Systems" },
                new { phase = "Phase 2: High-Yield Clinical Prioritization", days = "Days 11-20", hoursPerWeek = request.WeeklyHours, focus = "Safe & Effective Care, Infection Control, Delegation" },
                new { phase = "Phase 3: Adaptive Drills & Full CAT Sims", days = "Days 21-30", hoursPerWeek = request.WeeklyHours, focus = "Next-Gen Case Studies, Timed Topic Quizzes, Spaced Repetition" }
            },
            dailyRecommendations = new[]
            {
                "Complete 20 spaced-repetition flashcards every morning.",
                "Create active clinical notes with rich tables for medication classes.",
                "Take 1 timed 10-question topic quiz every evening and review rationales."
            }
        };

        return Task.FromResult(JsonSerializer.Serialize(plan));
    }
}
