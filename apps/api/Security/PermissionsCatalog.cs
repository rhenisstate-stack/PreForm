namespace Preform.Api.Security;

public record PermissionDefinition(string Key, string Name, string Category, string Description);

public static class PermissionsCatalog
{
    public static readonly IReadOnlyList<PermissionDefinition> All = new List<PermissionDefinition>
    {
        // Users & Identity
        new("users.view", "View Users", "Users", "View user accounts and profiles"),
        new("users.create", "Create Users", "Users", "Create administrative and instructor user accounts"),
        new("users.edit", "Edit Users", "Users", "Update user profile details"),
        new("users.delete", "Delete Users", "Users", "Delete user accounts"),
        new("users.roles", "Manage User Roles", "Users", "Assign or revoke roles from users"),
        new("users.suspend", "Suspend Users", "Users", "Suspend or deactivate user accounts"),
        new("users.sessions", "Manage User Sessions", "Users", "Revoke active user sessions"),

        // Roles & Permissions
        new("roles.view", "View Roles", "Roles", "View existing system and custom roles"),
        new("roles.create", "Create Roles", "Roles", "Create new custom roles"),
        new("roles.edit", "Edit Roles", "Roles", "Modify role description and properties"),
        new("roles.delete", "Delete Roles", "Roles", "Delete custom roles"),
        new("roles.assign_permissions", "Assign Permissions", "Roles", "Assign or unassign permissions on roles"),

        // Observability & Audit Logs
        new("audit_logs.view", "View Audit Logs", "Audit", "Inspect administrative and system audit logs"),
        new("audit_logs.export", "Export Audit Logs", "Audit", "Export system audit logs for compliance"),

        // Security Policies & Controls
        new("security.policies", "Manage Security Policies", "Security", "Configure session security policies"),
        new("security.sessions", "Monitor Live Sessions", "Security", "View active sessions across the platform"),
        new("security.ip_rules", "Manage IP Access Rules", "Security", "Create and manage IP blacklists and whitelists"),

        // Examinations & Curriculum
        new("exams.view", "View Examinations", "Examinations", "View examination families, revisions, and configurations"),
        new("exams.create", "Create Examinations", "Examinations", "Author new examination blueprints"),
        new("exams.edit", "Edit Examinations", "Examinations", "Modify draft examination revisions"),
        new("exams.delete", "Delete Examinations", "Examinations", "Archive or remove examinations"),
        new("exams.publish", "Publish Examinations", "Examinations", "Publish validated examination revisions"),
        new("exams.review", "Review Examinations", "Examinations", "Review and recommend approval for examinations"),

        // Question Bank
        new("content.view", "View Question Bank", "Content", "Browse and inspect questions"),
        new("content.create", "Create Questions", "Content", "Draft new questions across question types"),
        new("content.edit", "Edit Questions", "Content", "Edit draft questions and clinical rationales"),
        new("content.review", "Review Questions", "Content", "Review submitted draft questions and recommend approval or rejection"),
        new("content.publish", "Publish Questions", "Content", "Approve and publish questions to the bank"),
        new("content.delete", "Delete Questions", "Content", "Archive or delete question bank items"),

        // Subscriptions & Monetization
        new("subscriptions.view", "View Subscriptions", "Monetization", "View subscription plans and entitlements"),
        new("subscriptions.manage", "Manage Subscriptions", "Monetization", "Create, edit, or archive subscription plans"),

        // System
        new("system.health", "View System Health", "System", "View API and database health indicators"),
        new("system.settings", "Manage System Settings", "System", "Configure platform global parameters")
    };
}
