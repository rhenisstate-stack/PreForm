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

    // Question Bank
    public DbSet<QuestionTypeDefinition> QuestionTypeDefinitions => Set<QuestionTypeDefinition>();
    public DbSet<Question> Questions => Set<Question>();
    public DbSet<QuestionOption> QuestionOptions => Set<QuestionOption>();
    public DbSet<QuestionVersion> QuestionVersions => Set<QuestionVersion>();

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

    // Testimonials & Feedback
    public DbSet<Testimonial> Testimonials => Set<Testimonial>();

    // AI Study Studio (Phase 1): personal flashcard decks & spaced repetition
    public DbSet<FlashcardDeck> FlashcardDecks => Set<FlashcardDeck>();
    public DbSet<Flashcard> Flashcards => Set<Flashcard>();
    public DbSet<FlashcardReview> FlashcardReviews => Set<FlashcardReview>();

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
            entity.Property(u => u.SecurityVersion).HasDefaultValue(1);
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

        // Question Indexes & Relationships
        modelBuilder.Entity<Question>(entity =>
        {
            entity.HasIndex(q => q.Pathway);
            entity.HasIndex(q => q.QuestionTypeKey);
            entity.HasIndex(q => q.Status);
            entity.HasOne(q => q.Topic)
                  .WithMany()
                  .HasForeignKey(q => q.TopicId)
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

            entity.HasIndex(e => e.Pathway);
            entity.HasIndex(e => e.IsPublished);
            entity.HasIndex(e => e.LifecycleState);
            entity.HasIndex(e => new { e.IsPublished, e.Pathway, e.UpdatedAt });

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
    }
}
