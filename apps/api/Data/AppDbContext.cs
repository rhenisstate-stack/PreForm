using Microsoft.EntityFrameworkCore;
using Preform.Api.Models;

namespace Preform.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    // Learning Structure
    public DbSet<Programme> Programmes => Set<Programme>();
    public DbSet<Course> Courses => Set<Course>();
    public DbSet<SubjectDomain> SubjectDomains => Set<SubjectDomain>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Subcategory> Subcategories => Set<Subcategory>();
    public DbSet<Topic> Topics => Set<Topic>();
    public DbSet<ClientNeed> ClientNeeds => Set<ClientNeed>();

    // Identity & RBAC
    public DbSet<User> Users => Set<User>();
    public DbSet<UserSession> UserSessions => Set<UserSession>();
    public DbSet<SessionSecurityPolicy> SessionSecurityPolicies => Set<SessionSecurityPolicy>();
    public DbSet<UserProfileImage> UserProfileImages => Set<UserProfileImage>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<Permission> Permissions => Set<Permission>();
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<RateLimitBucket> RateLimitBuckets => Set<RateLimitBucket>();
    public DbSet<PasswordResetToken> PasswordResetTokens => Set<PasswordResetToken>();
    public DbSet<IpAccessRule> IpAccessRules => Set<IpAccessRule>();

    // Question Bank
    public DbSet<QuestionTypeDefinition> QuestionTypeDefinitions => Set<QuestionTypeDefinition>();
    public DbSet<Question> Questions => Set<Question>();
    public DbSet<QuestionOption> QuestionOptions => Set<QuestionOption>();
    public DbSet<QuestionVersion> QuestionVersions => Set<QuestionVersion>();
    public DbSet<QuestionMedia> QuestionMedia => Set<QuestionMedia>();

    // Assessments
    public DbSet<Examination> Examinations => Set<Examination>();
    public DbSet<Exam> Exams => Set<Exam>();
    public DbSet<ExamQuestion> ExamQuestions => Set<ExamQuestion>();
    public DbSet<ExamAttempt> ExamAttempts => Set<ExamAttempt>();
    public DbSet<ExamAttemptQuestion> ExamAttemptQuestions => Set<ExamAttemptQuestion>();
    public DbSet<AttemptResponse> AttemptResponses => Set<AttemptResponse>();

    // Subscriptions, Orders & Payments
    public DbSet<SubscriptionPlan> SubscriptionPlans => Set<SubscriptionPlan>();
    public DbSet<UserSubscription> UserSubscriptions => Set<UserSubscription>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<PaymentTransaction> PaymentTransactions => Set<PaymentTransaction>();
    public DbSet<ManualSubscriptionAuthorization> ManualSubscriptionAuthorizations => Set<ManualSubscriptionAuthorization>();
    public DbSet<SubscriptionPlanAppearance> SubscriptionPlanAppearances => Set<SubscriptionPlanAppearance>();
    public DbSet<EntitlementDefinition> EntitlementDefinitions => Set<EntitlementDefinition>();
    public DbSet<SubscriptionPlanEntitlement> SubscriptionPlanEntitlements => Set<SubscriptionPlanEntitlement>();

    // Testimonials & Feedback
    public DbSet<Testimonial> Testimonials => Set<Testimonial>();

    // AI Study Studio (Phase 1): personal flashcard decks & spaced repetition
    public DbSet<FlashcardDeck> FlashcardDecks => Set<FlashcardDeck>();
    public DbSet<Flashcard> Flashcards => Set<Flashcard>();
    public DbSet<FlashcardReview> FlashcardReviews => Set<FlashcardReview>();

    // Study Guide Management & Personal Notes
    public DbSet<StudyFolder> StudyFolders => Set<StudyFolder>();
    public DbSet<StudyNote> StudyNotes => Set<StudyNote>();
    public DbSet<StudyNoteVersion> StudyNoteVersions => Set<StudyNoteVersion>();
    public DbSet<StudyReviewSession> StudyReviewSessions => Set<StudyReviewSession>();
    public DbSet<StudyReviewSessionItem> StudyReviewSessionItems => Set<StudyReviewSessionItem>();
    public DbSet<TopicQuizConfiguration> TopicQuizConfigurations => Set<TopicQuizConfiguration>();
    public DbSet<TopicQuizAttempt> TopicQuizAttempts => Set<TopicQuizAttempt>();
    public DbSet<TopicQuizResponse> TopicQuizResponses => Set<TopicQuizResponse>();
    public DbSet<StudyGuideCategory> StudyGuideCategories => Set<StudyGuideCategory>();
    public DbSet<CuratedStudyGuide> CuratedStudyGuides => Set<CuratedStudyGuide>();
    public DbSet<CuratedGuideVersion> CuratedGuideVersions => Set<CuratedGuideVersion>();
    public DbSet<StudyReviewConfiguration> StudyReviewConfigurations => Set<StudyReviewConfiguration>();

    // AI Study Studio & Governance
    public DbSet<AIProviderConfiguration> AIProviderConfigurations => Set<AIProviderConfiguration>();
    public DbSet<AIRequest> AIRequests => Set<AIRequest>();
    public DbSet<AIUsageRecord> AIUsageRecords => Set<AIUsageRecord>();
    public DbSet<AIStudyPlan> AIStudyPlans => Set<AIStudyPlan>();
    public DbSet<AITutorConversation> AITutorConversations => Set<AITutorConversation>();
    public DbSet<AIContentReview> AIContentReviews => Set<AIContentReview>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.HasDefaultSchema("public");

        // Programme
        modelBuilder.Entity<Programme>(entity =>
        {
            entity.ToTable("Programme", "public");
            entity.HasKey(p => p.Id);
            entity.Property(p => p.Id).HasColumnType("text");
            entity.Property(p => p.Code).HasConversion<string>().HasColumnType("text");
            entity.Property(p => p.DisplayName).IsRequired().HasColumnType("text");
            entity.Property(p => p.IsActive).IsRequired().HasColumnType("boolean");
            entity.Property(p => p.CreatedAt).IsRequired().HasColumnType("timestamp with time zone");
            entity.Property(p => p.UpdatedAt).IsRequired().HasColumnType("timestamp with time zone");
            entity.HasIndex(p => p.Code).IsUnique();
            entity.HasIndex(p => p.IsActive);
        });

        // RBAC: Composite Keys
        modelBuilder.Entity<RolePermission>(entity =>
        {
            entity.HasKey(rp => new { rp.RoleId, rp.PermissionId });
            entity.HasOne(rp => rp.Role)
                  .WithMany(r => r.RolePermissions)
                  .HasForeignKey(rp => rp.RoleId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(rp => rp.Permission)
                  .WithMany(p => p.RolePermissions)
                  .HasForeignKey(rp => rp.PermissionId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<UserRole>(entity =>
        {
            entity.HasKey(ur => new { ur.UserId, ur.RoleId });
            entity.HasOne(ur => ur.User)
                  .WithMany(u => u.UserRoles)
                  .HasForeignKey(ur => ur.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(ur => ur.Role)
                  .WithMany(r => r.UserRoles)
                  .HasForeignKey(ur => ur.RoleId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // User Indexes
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(u => u.Email).IsUnique();
            entity.HasIndex(u => u.IsActive);
            entity.HasIndex(u => u.AccountStatus);
            entity.Property(u => u.SecurityVersion).HasDefaultValue(1);
            entity.Property(u => u.AccountStatus).HasMaxLength(32).HasDefaultValue("Active");
        });

        // UserSession Indexes & Relationships
        modelBuilder.Entity<UserSession>(entity =>
        {
            entity.ToTable("UserSessions", "public");
            entity.HasKey(s => s.Id);
            entity.HasIndex(s => s.TokenHash).IsUnique();
            entity.HasIndex(s => new { s.UserId, s.Revoked });
            entity.HasIndex(s => new { s.Email, s.Revoked });
            entity.HasIndex(s => new { s.UserId, s.Revoked, s.AbsoluteExpiresAt });
            entity.HasIndex(s => new { s.ClientId, s.Revoked, s.AbsoluteExpiresAt });
            entity.HasIndex(s => s.IdleExpiresAt);
            entity.HasIndex(s => s.AbsoluteExpiresAt);
            entity.Property(s => s.ClientId).HasMaxLength(64).HasDefaultValue("");
            entity.Property(s => s.IdleExpiresAt).HasColumnType("timestamp with time zone");
            entity.Property(s => s.AbsoluteExpiresAt).HasColumnType("timestamp with time zone");
            entity.Property(s => s.RevokedAt).HasColumnType("timestamp with time zone");
            entity.Property(s => s.RevocationReason).HasMaxLength(64);
            entity.Property(s => s.LastIpAddress).HasMaxLength(64);
            entity.Property(s => s.UserAgent).HasMaxLength(512);
            entity.Property(s => s.DeviceLabel).HasMaxLength(128);
            entity.Property(s => s.FingerprintHash).HasMaxLength(64);
            entity.Property(s => s.SecurityVersion).HasDefaultValue(1);
            entity.HasOne(s => s.User)
                  .WithMany(u => u.UserSessions)
                  .HasForeignKey(s => s.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // SessionSecurityPolicy
        modelBuilder.Entity<SessionSecurityPolicy>(entity =>
        {
            entity.ToTable("SessionSecurityPolicies", "public");
            entity.HasKey(p => p.Id);
            entity.Property(p => p.Id).HasMaxLength(64);
            entity.Property(p => p.MaxConcurrentSessions).IsRequired();
            entity.Property(p => p.MaxSessionsPerClient).IsRequired();
            entity.Property(p => p.IdleTimeoutMinutes).IsRequired();
            entity.Property(p => p.AbsoluteTimeoutMinutes).IsRequired();
            entity.Property(p => p.EnforceFingerprint).IsRequired();
            entity.Property(p => p.EnforceIpConsistency).IsRequired();
            entity.Property(p => p.AllowIpDrift).IsRequired();
            entity.Property(p => p.RotateOnLogin).IsRequired();
            entity.Property(p => p.RotateOnPrivilegeChange).IsRequired();
            entity.Property(p => p.RotateOnPasswordChange).IsRequired();
            entity.Property(p => p.PolicyVersion).IsRequired();
            entity.Property(p => p.UpdatedAt).IsRequired().HasColumnType("timestamp with time zone");
            entity.Property(p => p.UpdatedBy).HasMaxLength(128);
            entity.Property(p => p.IsActive).IsRequired();
            entity.HasIndex(p => p.IsActive);
        });

        // UserProfileImage
        modelBuilder.Entity<UserProfileImage>(entity =>
        {
            entity.ToTable("UserProfileImages", "public");
            entity.HasKey(upi => upi.Id);
            entity.Property(upi => upi.ImageData).IsRequired().HasColumnType("bytea");
            entity.Property(upi => upi.ContentType).IsRequired().HasMaxLength(64);
            entity.Property(upi => upi.Sha256Hash).IsRequired().HasMaxLength(64);
            entity.HasIndex(upi => upi.UserId).IsUnique();
            entity.HasIndex(upi => upi.UserEmail).IsUnique();
            entity.HasOne(upi => upi.User)
                  .WithOne(u => u.ProfileImage)
                  .HasForeignKey<UserProfileImage>(upi => upi.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // SubscriptionPlan Indexes
        modelBuilder.Entity<SubscriptionPlan>(entity =>
        {
            entity.ToTable("SubscriptionPlans", "public");
            entity.HasKey(sp => sp.Id);
            entity.HasIndex(sp => sp.Slug).IsUnique();
            entity.HasIndex(sp => new { sp.Pathway, sp.IsActive });
            entity.HasIndex(sp => sp.DisplayOrder);
        });

        // Orders & Transactions
        modelBuilder.Entity<Order>(entity =>
        {
            entity.ToTable("Orders", "public");
            entity.HasKey(o => o.Id);
            entity.HasIndex(o => o.UserId);
            entity.HasIndex(o => o.ProviderSessionId);
            entity.HasOne(o => o.User)
                  .WithMany()
                  .HasForeignKey(o => o.UserId)
                  .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(o => o.Plan)
                  .WithMany()
                  .HasForeignKey(o => o.PlanId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<PaymentTransaction>(entity =>
        {
            entity.ToTable("PaymentTransactions", "public");
            entity.HasKey(pt => pt.Id);
            entity.HasIndex(pt => pt.ProviderEventId).IsUnique();
            entity.HasIndex(pt => pt.OrderId);
            entity.HasOne(pt => pt.Order)
                  .WithMany(o => o.Transactions)
                  .HasForeignKey(pt => pt.OrderId)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<UserSubscription>(entity =>
        {
            entity.ToTable("UserSubscriptions", "public");
            entity.HasKey(us => us.Id);
            entity.HasIndex(us => us.UserId);
            entity.HasIndex(us => us.Status);
            entity.HasOne(us => us.User)
                  .WithMany()
                  .HasForeignKey(us => us.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(us => us.Plan)
                  .WithMany()
                  .HasForeignKey(us => us.PlanId)
                  .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(us => us.Order)
                  .WithMany()
                  .HasForeignKey(us => us.OrderId)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        // Permission Indexes
        modelBuilder.Entity<Permission>(entity =>
        {
            entity.HasIndex(p => p.Key).IsUnique();
        });

        // Role Indexes
        modelBuilder.Entity<Role>(entity =>
        {
            entity.HasIndex(r => r.Name).IsUnique();
        });

        // Client Needs Indexes
        modelBuilder.Entity<ClientNeed>(entity =>
        {
            entity.HasIndex(cn => cn.Code).IsUnique();
            entity.HasIndex(cn => cn.IsActive);
            entity.HasIndex(cn => cn.Pathway);
        });

        // Question Indexes & Relationships
        modelBuilder.Entity<Question>(entity =>
        {
            entity.HasIndex(q => q.Code).IsUnique();
            entity.HasIndex(q => q.Pathway);
            entity.HasIndex(q => q.QuestionTypeKey);
            entity.HasIndex(q => q.Status);
            entity.HasIndex(q => q.ClientNeedId);
            entity.HasOne(q => q.Topic)
                  .WithMany()
                  .HasForeignKey(q => q.TopicId)
                  .OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(q => q.ClientNeed)
                  .WithMany(cn => cn.Questions)
                  .HasForeignKey(q => q.ClientNeedId)
                  .OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(q => q.CreatedBy)
                  .WithMany()
                  .HasForeignKey(q => q.CreatedById)
                  .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(q => q.ReviewedBy)
                  .WithMany()
                  .HasForeignKey(q => q.ReviewedById)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // Curriculum Taxonomy Indexes
        modelBuilder.Entity<Course>(entity =>
        {
            entity.HasIndex(c => c.ProgrammeId);
            entity.HasIndex(c => c.IsActive);
        });

        modelBuilder.Entity<SubjectDomain>(entity =>
        {
            entity.HasIndex(sd => sd.CourseId);
            entity.HasIndex(sd => sd.IsActive);
        });

        modelBuilder.Entity<Category>(entity =>
        {
            entity.HasIndex(cat => cat.SubjectDomainId);
            entity.HasIndex(cat => cat.IsActive);
        });

        modelBuilder.Entity<Subcategory>(entity =>
        {
            entity.HasIndex(sc => sc.CategoryId);
            entity.HasIndex(sc => sc.IsActive);
        });

        modelBuilder.Entity<Topic>(entity =>
        {
            entity.HasIndex(t => t.SubcategoryId);
            entity.HasIndex(t => t.IsPublished);
        });

        modelBuilder.Entity<QuestionTypeDefinition>(entity =>
        {
            entity.HasIndex(questionType => questionType.Key).IsUnique();
        });

        modelBuilder.Entity<QuestionOption>(entity =>
        {
            entity.HasIndex(qo => qo.QuestionId);
            entity.HasOne(qo => qo.Question)
                  .WithMany(q => q.Options)
                  .HasForeignKey(qo => qo.QuestionId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // QuestionMedia (Persistent Binary Image Storage)
        modelBuilder.Entity<QuestionMedia>(entity =>
        {
            entity.ToTable("QuestionMedia", "public");
            entity.HasKey(qm => qm.Id);
            entity.Property(qm => qm.ImageData).IsRequired().HasColumnType("bytea");
            entity.Property(qm => qm.ContentType).IsRequired().HasMaxLength(64);
            entity.Property(qm => qm.Sha256Hash).IsRequired().HasMaxLength(64);
            entity.Property(qm => qm.FieldKey).HasMaxLength(64);
            entity.Property(qm => qm.FileName).HasMaxLength(256);
            entity.HasIndex(qm => qm.QuestionId);
            entity.HasIndex(qm => qm.Sha256Hash);
            entity.HasOne(qm => qm.Question)
                  .WithMany(q => q.Media)
                  .HasForeignKey(qm => qm.QuestionId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(qm => qm.CreatedBy)
                  .WithMany()
                  .HasForeignKey(qm => qm.CreatedById)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        // Examination (Stable Identity)
        modelBuilder.Entity<Examination>(entity =>
        {
            entity.ToTable("Examinations", "public");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnType("text");
            entity.Property(e => e.Code).IsRequired().HasMaxLength(16);
            entity.Property(e => e.Pathway).IsRequired().HasMaxLength(10);
            entity.Property(e => e.Title).IsRequired().HasMaxLength(128);
            entity.Property(e => e.CreatedBy).IsRequired().HasMaxLength(128);

            entity.HasIndex(e => e.Code).IsUnique();
            entity.HasIndex(e => new { e.Pathway, e.Code }).IsUnique();

            entity.HasOne(e => e.SuccessorExamination)
                  .WithMany()
                  .HasForeignKey(e => e.SuccessorExaminationId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.CurrentRevision)
                  .WithMany()
                  .HasForeignKey(e => e.CurrentRevisionId)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        // Exam Indexes & Relationships
        modelBuilder.Entity<Exam>(entity =>
        {
            entity.Property(e => e.ConcurrencyToken).IsConcurrencyToken();
            entity.Property(e => e.CompositionRulesJson).HasColumnType("jsonb");
            entity.Property(e => e.ConfigurationSnapshotJson).HasColumnType("jsonb");
            entity.Property(e => e.SelectionStrategy).HasMaxLength(32);
            entity.Property(e => e.ReviewPolicy).HasMaxLength(32);

            entity.HasIndex(e => e.Pathway);
            entity.HasIndex(e => e.IsPublished);
            entity.HasIndex(e => e.IsAvailable);
            entity.HasIndex(e => e.LifecycleState);
            entity.HasIndex(e => new { e.IsPublished, e.Pathway, e.UpdatedAt });
            entity.HasIndex(e => new { e.IsAvailable, e.AvailableFrom, e.AvailableTo });

            entity.HasOne(e => e.Examination)
                  .WithMany(ex => ex.Revisions)
                  .HasForeignKey(e => e.ExaminationId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(e => new { e.ExaminationId, e.RevisionNumber }).IsUnique();

            entity.HasIndex(new[] { nameof(Exam.ExaminationId) }, "IX_Exams_ExaminationId_SinglePublished")
                  .HasFilter(@"""LifecycleState"" = 4")
                  .IsUnique();

            entity.HasIndex(new[] { nameof(Exam.ExaminationId) }, "IX_Exams_ExaminationId_ActiveDraft")
                  .HasFilter(@"""LifecycleState"" = 1")
                  .IsUnique();
        });

        modelBuilder.Entity<ExamQuestion>(entity =>
        {
            entity.HasIndex(eq => new { eq.ExamId, eq.QuestionId }).IsUnique();
            entity.HasOne(eq => eq.Exam)
                  .WithMany(e => e.ExamQuestions)
                  .HasForeignKey(eq => eq.ExamId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(eq => eq.Question)
                  .WithMany()
                  .HasForeignKey(eq => eq.QuestionId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ExamAttempt>(entity =>
        {
            entity.Property(ea => ea.MetadataSnapshot).HasColumnType("jsonb");
            entity.HasIndex(ea => ea.UserId);
            entity.HasIndex(ea => ea.ExamId);
            entity.HasOne(ea => ea.User)
                  .WithMany()
                  .HasForeignKey(ea => ea.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(ea => ea.Exam)
                  .WithMany(e => e.Attempts)
                  .HasForeignKey(ea => ea.ExamId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<AttemptResponse>(entity =>
        {
            entity.HasIndex(ar => ar.ExamAttemptId);
            entity.HasOne(ar => ar.ExamAttempt)
                  .WithMany(ea => ea.Responses)
                  .HasForeignKey(ar => ar.ExamAttemptId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(ar => ar.Question)
                  .WithMany()
                  .HasForeignKey(ar => ar.QuestionId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // Exact attempt question set: the authority for which questions a candidate
        // is permitted to answer within an attempt. One record per attempt/question.
        modelBuilder.Entity<ExamAttemptQuestion>(entity =>
        {
            entity.HasKey(eaq => eaq.Id);
            entity.HasIndex(eaq => eaq.ExamAttemptId);
            entity.HasIndex(eaq => new { eaq.ExamAttemptId, eaq.QuestionId }).IsUnique();
            entity.HasOne(eaq => eaq.ExamAttempt)
                  .WithMany()
                  .HasForeignKey(eaq => eaq.ExamAttemptId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(eaq => eaq.Question)
                  .WithMany()
                  .HasForeignKey(eaq => eaq.QuestionId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // AuditLog Indexes
        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.HasIndex(al => al.ActorId);
            entity.HasIndex(al => al.Action);
            entity.HasIndex(al => al.Timestamp);
            entity.HasIndex(al => al.CorrelationId);
            entity.Property(al => al.Severity).HasMaxLength(32).HasDefaultValue("Information");
        });

        // Security & Governance: RateLimitBucket
        modelBuilder.Entity<RateLimitBucket>(entity =>
        {
            entity.ToTable("RateLimitBuckets", "public");
            entity.HasKey(r => r.Key);
            entity.Property(r => r.Key).HasMaxLength(128);
            entity.HasIndex(r => r.ExpiresAtUtc);
            entity.HasIndex(r => r.LockoutUntilUtc);
        });

        // Security & Governance: PasswordResetToken
        modelBuilder.Entity<PasswordResetToken>(entity =>
        {
            entity.ToTable("PasswordResetTokens", "public");
            entity.HasKey(t => t.Id);
            entity.HasIndex(t => t.TokenHash).IsUnique();
            entity.HasIndex(t => new { t.UserId, t.ExpiresAt, t.UsedAt });
            entity.HasOne(t => t.User)
                  .WithMany(u => u.PasswordResetTokens)
                  .HasForeignKey(t => t.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // Security & Governance: IpAccessRule
        modelBuilder.Entity<IpAccessRule>(entity =>
        {
            entity.ToTable("IpAccessRules", "public");
            entity.HasKey(r => r.Id);
            entity.Property(r => r.IpAddressOrCidr).IsRequired().HasMaxLength(64);
            entity.Property(r => r.RuleType).IsRequired().HasMaxLength(16);
            entity.Property(r => r.IsActive).HasDefaultValue(true);
            entity.HasIndex(r => new { r.RuleType, r.IsActive });
            entity.HasIndex(r => r.IpAddressOrCidr);
        });

        // ── AI Study Studio: Flashcard Decks, Cards & Reviews ──
        modelBuilder.Entity<FlashcardDeck>(entity =>
        {
            entity.HasIndex(fd => fd.UserId);
            entity.HasIndex(fd => new { fd.UserId, fd.IsArchived });
            entity.HasIndex(fd => new { fd.UserId, fd.Programme });
            entity.HasOne(fd => fd.User)
                  .WithMany()
                  .HasForeignKey(fd => fd.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Flashcard>(entity =>
        {
            entity.HasIndex(f => f.DeckId);
            entity.HasIndex(f => new { f.UserId, f.DueAt });
            entity.HasIndex(f => new { f.UserId, f.Status });
            entity.HasOne(f => f.Deck)
                  .WithMany(d => d.Flashcards)
                  .HasForeignKey(f => f.DeckId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<FlashcardReview>(entity =>
        {
            entity.HasIndex(fr => fr.FlashcardId);
            entity.HasIndex(fr => new { fr.UserId, fr.ReviewedAt });
            entity.HasOne(fr => fr.Flashcard)
                  .WithMany(f => f.Reviews)
                  .HasForeignKey(fr => fr.FlashcardId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // ── Subscriptions & Commercial Integrity (Phase 7.9.2) ──
        modelBuilder.Entity<UserSubscription>(entity =>
        {
            entity.HasIndex(s => new { s.UserId, s.PlanId })
                  .HasDatabaseName("idx_user_subscriptions_active_unique")
                  .HasFilter("\"Status\" = 1")
                  .IsUnique();
            entity.HasIndex(s => s.UserId);
            entity.HasIndex(s => s.Status);
        });

        modelBuilder.Entity<PaymentTransaction>(entity =>
        {
            entity.HasIndex(pt => pt.ProviderEventId)
                  .HasDatabaseName("idx_payment_transactions_provider_event_id")
                  .IsUnique();
            entity.HasIndex(pt => pt.OrderId);
        });

        // ── Monetization Subsystem (Phase 2): Manual Authorizations, Appearance, Entitlements ──
        modelBuilder.Entity<ManualSubscriptionAuthorization>(entity =>
        {
            entity.ToTable("ManualSubscriptionAuthorizations", "public");
            entity.HasKey(m => m.Id);
            entity.HasIndex(m => m.TransactionReference)
                  .IsUnique()
                  .HasFilter("\"TransactionReference\" IS NOT NULL")
                  .HasDatabaseName("idx_manual_auth_tx_ref_unique");
            entity.HasIndex(m => m.UserId);
            entity.HasIndex(m => m.Status);
            entity.HasIndex(m => m.PaymentMethod);
            entity.HasIndex(m => m.RequestedByAdminId);

            entity.HasOne(m => m.User)
                  .WithMany()
                  .HasForeignKey(m => m.UserId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(m => m.Plan)
                  .WithMany()
                  .HasForeignKey(m => m.PlanId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(m => m.Subscription)
                  .WithMany()
                  .HasForeignKey(m => m.SubscriptionId)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(m => m.Order)
                  .WithMany()
                  .HasForeignKey(m => m.OrderId)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<SubscriptionPlanAppearance>(entity =>
        {
            entity.ToTable("SubscriptionPlanAppearances", "public");
            entity.HasKey(a => a.Id);
            entity.HasIndex(a => new { a.PlanId, a.Version, a.IsPublished })
                  .HasDatabaseName("idx_sub_plan_appearances_version");

            entity.HasOne(a => a.Plan)
                  .WithMany()
                  .HasForeignKey(a => a.PlanId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<EntitlementDefinition>(entity =>
        {
            entity.ToTable("EntitlementDefinitions", "public");
            entity.HasKey(e => e.Code);
            entity.HasIndex(e => e.CoursePathway);
            entity.HasIndex(e => e.IsActive);
        });

        modelBuilder.Entity<SubscriptionPlanEntitlement>(entity =>
        {
            entity.ToTable("SubscriptionPlanEntitlements", "public");
            entity.HasKey(spe => spe.Id);
            entity.HasIndex(spe => new { spe.PlanId, spe.EntitlementCode })
                  .IsUnique()
                  .HasDatabaseName("idx_sub_plan_entitlements_unique");

            entity.HasOne(spe => spe.Plan)
                  .WithMany()
                  .HasForeignKey(spe => spe.PlanId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(spe => spe.Entitlement)
                  .WithMany()
                  .HasForeignKey(spe => spe.EntitlementCode)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // ── Study Guide Management & Personal Notes (Phase 17) ──
        modelBuilder.Entity<StudyFolder>(entity =>
        {
            entity.HasIndex(f => f.UserId);
            entity.HasIndex(f => new { f.UserId, f.IsArchived });
            entity.HasOne(f => f.User)
                  .WithMany()
                  .HasForeignKey(f => f.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<StudyNote>(entity =>
        {
            entity.HasIndex(n => n.UserId);
            entity.HasIndex(n => new { n.UserId, n.IsDeleted, n.IsArchived });
            entity.HasIndex(n => new { n.UserId, n.Programme });
            entity.HasIndex(n => new { n.UserId, n.FolderId });
            entity.HasIndex(n => n.TopicSlug);
            entity.HasIndex(n => n.ClientNeedId);
            entity.HasOne(n => n.User)
                  .WithMany()
                  .HasForeignKey(n => n.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(n => n.Folder)
                  .WithMany(f => f.Notes)
                  .HasForeignKey(n => n.FolderId)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<StudyNoteVersion>(entity =>
        {
            entity.HasIndex(v => v.NoteId);
            entity.HasOne(v => v.Note)
                  .WithMany(n => n.Versions)
                  .HasForeignKey(v => v.NoteId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<StudyReviewSession>(entity =>
        {
            entity.HasIndex(s => s.UserId);
            entity.HasIndex(s => new { s.UserId, s.Status });
            entity.HasIndex(s => new { s.UserId, s.Programme });
            entity.HasOne(s => s.User)
                  .WithMany()
                  .HasForeignKey(s => s.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(s => s.Deck)
                  .WithMany()
                  .HasForeignKey(s => s.DeckId)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<StudyReviewSessionItem>(entity =>
        {
            entity.HasIndex(i => i.SessionId);
            entity.HasIndex(i => i.FlashcardId);
            entity.HasOne(i => i.Session)
                  .WithMany(s => s.Items)
                  .HasForeignKey(i => i.SessionId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(i => i.Flashcard)
                  .WithMany()
                  .HasForeignKey(i => i.FlashcardId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<TopicQuizConfiguration>(entity =>
        {
            entity.HasIndex(c => c.UserId);
            entity.HasIndex(c => new { c.Programme, c.TopicSlug });
            entity.HasOne(c => c.User)
                  .WithMany()
                  .HasForeignKey(c => c.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<TopicQuizAttempt>(entity =>
        {
            entity.HasIndex(a => a.UserId);
            entity.HasIndex(a => new { a.UserId, a.Status });
            entity.HasIndex(a => new { a.UserId, a.Programme });
            entity.HasIndex(a => a.TopicSlug);
            entity.HasIndex(a => a.ClientNeedId);
            entity.HasOne(a => a.User)
                  .WithMany()
                  .HasForeignKey(a => a.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(a => a.Configuration)
                  .WithMany(c => c.Attempts)
                  .HasForeignKey(a => a.ConfigurationId)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<TopicQuizResponse>(entity =>
        {
            entity.HasIndex(r => r.AttemptId);
            entity.HasIndex(r => r.QuestionId);
            entity.HasOne(r => r.Attempt)
                  .WithMany(a => a.Responses)
                  .HasForeignKey(r => r.AttemptId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(r => r.Question)
                  .WithMany()
                  .HasForeignKey(r => r.QuestionId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<StudyGuideCategory>(entity =>
        {
            entity.HasIndex(c => c.Slug).IsUnique();
            entity.HasIndex(c => c.IsActive);
        });

        modelBuilder.Entity<CuratedStudyGuide>(entity =>
        {
            entity.HasIndex(g => g.Slug).IsUnique();
            entity.HasIndex(g => new { g.Programme, g.Status });
            entity.HasIndex(g => g.CategoryId);
            entity.HasIndex(g => g.ClientNeedId);
            entity.HasOne(g => g.Category)
                  .WithMany(c => c.Guides)
                  .HasForeignKey(g => g.CategoryId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<CuratedGuideVersion>(entity =>
        {
            entity.HasIndex(v => v.GuideId);
            entity.HasOne(v => v.Guide)
                  .WithMany(g => g.Versions)
                  .HasForeignKey(v => v.GuideId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<StudyReviewConfiguration>(entity =>
        {
            entity.HasKey(c => c.Id);
        });

        // ── AI Study Studio & Governance ──
        modelBuilder.Entity<AIRequest>(entity =>
        {
            entity.HasIndex(r => r.UserId);
            entity.HasIndex(r => new { r.UserId, r.CreatedAt });
            entity.HasIndex(r => r.Feature);
            entity.HasOne(r => r.User)
                  .WithMany()
                  .HasForeignKey(r => r.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<AIUsageRecord>(entity =>
        {
            entity.HasIndex(u => new { u.UserId, u.DateUtc }).IsUnique();
        });

        modelBuilder.Entity<AIStudyPlan>(entity =>
        {
            entity.HasIndex(p => p.UserId);
            entity.HasIndex(p => new { p.UserId, p.IsActive });
            entity.HasOne(p => p.User)
                  .WithMany()
                  .HasForeignKey(p => p.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<AITutorConversation>(entity =>
        {
            entity.HasIndex(c => c.UserId);
            entity.HasIndex(c => new { c.UserId, c.TopicSlug });
            entity.HasOne(c => c.User)
                  .WithMany()
                  .HasForeignKey(c => c.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<AIContentReview>(entity =>
        {
            entity.HasIndex(cr => cr.Status);
            entity.HasIndex(cr => cr.ContentType);
        });
    }
}
