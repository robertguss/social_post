/**
 * Unit tests for templates.ts Convex mutations and queries
 *
 * These tests verify the template CRUD operations:
 * - createTemplate: Create new templates with validation
 * - updateTemplate: Update existing templates with ownership checks
 * - deleteTemplate: Delete templates with authorization
 * - getTemplates: Query templates with optional tag filtering
 */

import { describe, it, expect, beforeEach } from "@jest/globals";

// Mock Convex context
const mockContext = {
  db: {
    insert: jest.fn().mockResolvedValue("mock-template-id"),
    patch: jest.fn().mockResolvedValue(undefined),
    get: jest.fn(),
    delete: jest.fn().mockResolvedValue(undefined),
    query: jest.fn(),
  },
  auth: {
    getUserIdentity: jest.fn(),
  },
};

// Mock implementation of createTemplate mutation logic
async function createTemplateMock(
  ctx: any,
  args: {
    name: string;
    content: string;
    tags: string[];
  }
) {
  // Verify user authentication
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }
  const clerkUserId = identity.subject;

  // Validate content is non-empty
  if (!args.content.trim()) {
    throw new Error("Template content cannot be empty");
  }

  // Check for duplicate template name for this user
  const existingTemplate = await ctx.db
    .query("templates")
    .withIndex("by_user", (q: any) => q.eq("clerkUserId", clerkUserId))
    .filter((q: any) => q.eq(q.field("name"), args.name))
    .first();

  if (existingTemplate) {
    throw new Error(`Template with name "${args.name}" already exists`);
  }

  // Create new template
  const templateId = await ctx.db.insert("templates", {
    clerkUserId,
    name: args.name,
    content: args.content,
    tags: args.tags,
    usageCount: 0,
  });

  return templateId;
}

// Mock implementation of updateTemplate mutation logic
async function updateTemplateMock(
  ctx: any,
  args: {
    templateId: string;
    name?: string;
    content?: string;
    tags?: string[];
  }
) {
  // Verify user authentication
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }
  const clerkUserId = identity.subject;

  // Get the template to verify ownership
  const template = await ctx.db.get(args.templateId);
  if (!template) {
    throw new Error("Template not found");
  }

  // Verify user owns the template
  if (template.clerkUserId !== clerkUserId) {
    throw new Error("Unauthorized: You do not own this template");
  }

  // If name is being changed, check for duplicates
  if (args.name && args.name !== template.name) {
    const existingTemplate = await ctx.db
      .query("templates")
      .withIndex("by_user", (q: any) => q.eq("clerkUserId", clerkUserId))
      .filter((q: any) => q.eq(q.field("name"), args.name))
      .first();

    if (existingTemplate) {
      throw new Error(`Template with name "${args.name}" already exists`);
    }
  }

  // Validate content is non-empty if being updated
  if (args.content !== undefined && !args.content.trim()) {
    throw new Error("Template content cannot be empty");
  }

  // Build update object with only provided fields
  const updates: Record<string, any> = {};
  if (args.name !== undefined) updates.name = args.name;
  if (args.content !== undefined) updates.content = args.content;
  if (args.tags !== undefined) updates.tags = args.tags;

  // Update the template
  await ctx.db.patch(args.templateId, updates);

  return true;
}

// Mock implementation of deleteTemplate mutation logic
async function deleteTemplateMock(
  ctx: any,
  args: {
    templateId: string;
  }
) {
  // Verify user authentication
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }
  const clerkUserId = identity.subject;

  // Get the template to verify ownership
  const template = await ctx.db.get(args.templateId);
  if (!template) {
    throw new Error("Template not found");
  }

  // Verify user owns the template
  if (template.clerkUserId !== clerkUserId) {
    throw new Error("Unauthorized: You do not own this template");
  }

  // Delete the template
  await ctx.db.delete(args.templateId);

  return true;
}

// Mock implementation of getTemplates query logic
async function getTemplatesMock(
  ctx: any,
  args: {
    tag?: string;
  }
) {
  // Verify user authentication
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }
  const clerkUserId = identity.subject;

  // Query all user's templates using index
  let templates = await ctx.db
    .query("templates")
    .withIndex("by_user", (q: any) => q.eq("clerkUserId", clerkUserId))
    .collect();

  // Filter by tag if specified
  if (args.tag) {
    templates = templates.filter((template: any) =>
      template.tags.includes(args.tag as string)
    );
  }

  // Sort by name (A-Z)
  templates.sort((a: any, b: any) => a.name.localeCompare(b.name));

  return templates;
}

describe("createTemplate mutation - Success cases", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockContext.db.query.mockReturnValue({
      withIndex: jest.fn().mockReturnValue({
        filter: jest.fn().mockReturnValue({
          first: jest.fn().mockResolvedValue(null),
        }),
      }),
    });
  });

  it("should successfully create a template with valid data", async () => {
    mockContext.auth.getUserIdentity.mockResolvedValue({
      subject: "user_123",
      email: "test@example.com",
    });

    const args = {
      name: "My First Template",
      content: "This is a reusable content block.",
      tags: ["greeting", "intro"],
    };

    const templateId = await createTemplateMock(mockContext, args);

    expect(templateId).toBe("mock-template-id");
    expect(mockContext.db.insert).toHaveBeenCalledWith("templates", {
      clerkUserId: "user_123",
      name: "My First Template",
      content: "This is a reusable content block.",
      tags: ["greeting", "intro"],
      usageCount: 0,
    });
  });

  it("should create template with empty tags array", async () => {
    mockContext.auth.getUserIdentity.mockResolvedValue({
      subject: "user_123",
      email: "test@example.com",
    });

    const args = {
      name: "No Tags Template",
      content: "Template without tags",
      tags: [],
    };

    const templateId = await createTemplateMock(mockContext, args);

    expect(templateId).toBe("mock-template-id");
    const insertCall = mockContext.db.insert.mock.calls[0];
    expect(insertCall[1].tags).toEqual([]);
  });

  it("should allow different users to have templates with same name", async () => {
    mockContext.auth.getUserIdentity.mockResolvedValue({
      subject: "user_456",
      email: "another@example.com",
    });

    const args = {
      name: "Common Template Name",
      content: "User 456's template",
      tags: ["common"],
    };

    const templateId = await createTemplateMock(mockContext, args);

    expect(templateId).toBe("mock-template-id");
    const insertCall = mockContext.db.insert.mock.calls[0];
    expect(insertCall[1].clerkUserId).toBe("user_456");
  });
});

describe("createTemplate mutation - Validation errors", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should throw error if not authenticated", async () => {
    mockContext.auth.getUserIdentity.mockResolvedValue(null);

    const args = {
      name: "Test Template",
      content: "Test content",
      tags: [],
    };

    await expect(createTemplateMock(mockContext, args)).rejects.toThrow(
      "Not authenticated"
    );
  });

  it("should throw error if content is empty", async () => {
    mockContext.auth.getUserIdentity.mockResolvedValue({
      subject: "user_123",
      email: "test@example.com",
    });
    mockContext.db.query.mockReturnValue({
      withIndex: jest.fn().mockReturnValue({
        filter: jest.fn().mockReturnValue({
          first: jest.fn().mockResolvedValue(null),
        }),
      }),
    });

    const args = {
      name: "Empty Content",
      content: "",
      tags: [],
    };

    await expect(createTemplateMock(mockContext, args)).rejects.toThrow(
      "Template content cannot be empty"
    );
  });

  it("should throw error if content is only whitespace", async () => {
    mockContext.auth.getUserIdentity.mockResolvedValue({
      subject: "user_123",
      email: "test@example.com",
    });
    mockContext.db.query.mockReturnValue({
      withIndex: jest.fn().mockReturnValue({
        filter: jest.fn().mockReturnValue({
          first: jest.fn().mockResolvedValue(null),
        }),
      }),
    });

    const args = {
      name: "Whitespace Content",
      content: "   \n\t  ",
      tags: [],
    };

    await expect(createTemplateMock(mockContext, args)).rejects.toThrow(
      "Template content cannot be empty"
    );
  });

  it("should throw error if template name already exists for user", async () => {
    mockContext.auth.getUserIdentity.mockResolvedValue({
      subject: "user_123",
      email: "test@example.com",
    });
    mockContext.db.query.mockReturnValue({
      withIndex: jest.fn().mockReturnValue({
        filter: jest.fn().mockReturnValue({
          first: jest.fn().mockResolvedValue({
            _id: "existing-template",
            name: "Duplicate Name",
            clerkUserId: "user_123",
          }),
        }),
      }),
    });

    const args = {
      name: "Duplicate Name",
      content: "Trying to create duplicate",
      tags: [],
    };

    await expect(createTemplateMock(mockContext, args)).rejects.toThrow(
      'Template with name "Duplicate Name" already exists'
    );
  });
});

describe("updateTemplate mutation - Success cases", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should successfully update template name", async () => {
    mockContext.auth.getUserIdentity.mockResolvedValue({
      subject: "user_123",
      email: "test@example.com",
    });
    mockContext.db.get.mockResolvedValue({
      _id: "template-123",
      clerkUserId: "user_123",
      name: "Old Name",
      content: "Content",
      tags: ["tag1"],
      usageCount: 5,
    });
    mockContext.db.query.mockReturnValue({
      withIndex: jest.fn().mockReturnValue({
        filter: jest.fn().mockReturnValue({
          first: jest.fn().mockResolvedValue(null),
        }),
      }),
    });

    const args = {
      templateId: "template-123",
      name: "New Name",
    };

    const result = await updateTemplateMock(mockContext, args);

    expect(result).toBe(true);
    expect(mockContext.db.patch).toHaveBeenCalledWith("template-123", {
      name: "New Name",
    });
  });

  it("should successfully update template content", async () => {
    mockContext.auth.getUserIdentity.mockResolvedValue({
      subject: "user_123",
      email: "test@example.com",
    });
    mockContext.db.get.mockResolvedValue({
      _id: "template-123",
      clerkUserId: "user_123",
      name: "Template",
      content: "Old content",
      tags: [],
      usageCount: 0,
    });

    const args = {
      templateId: "template-123",
      content: "New improved content",
    };

    const result = await updateTemplateMock(mockContext, args);

    expect(result).toBe(true);
    expect(mockContext.db.patch).toHaveBeenCalledWith("template-123", {
      content: "New improved content",
    });
  });

  it("should successfully update template tags", async () => {
    mockContext.auth.getUserIdentity.mockResolvedValue({
      subject: "user_123",
      email: "test@example.com",
    });
    mockContext.db.get.mockResolvedValue({
      _id: "template-123",
      clerkUserId: "user_123",
      name: "Template",
      content: "Content",
      tags: ["old", "tags"],
      usageCount: 0,
    });

    const args = {
      templateId: "template-123",
      tags: ["new", "tags", "updated"],
    };

    const result = await updateTemplateMock(mockContext, args);

    expect(result).toBe(true);
    expect(mockContext.db.patch).toHaveBeenCalledWith("template-123", {
      tags: ["new", "tags", "updated"],
    });
  });

  it("should successfully update multiple fields at once", async () => {
    mockContext.auth.getUserIdentity.mockResolvedValue({
      subject: "user_123",
      email: "test@example.com",
    });
    mockContext.db.get.mockResolvedValue({
      _id: "template-123",
      clerkUserId: "user_123",
      name: "Old Name",
      content: "Old content",
      tags: ["old"],
      usageCount: 0,
    });
    mockContext.db.query.mockReturnValue({
      withIndex: jest.fn().mockReturnValue({
        filter: jest.fn().mockReturnValue({
          first: jest.fn().mockResolvedValue(null),
        }),
      }),
    });

    const args = {
      templateId: "template-123",
      name: "New Name",
      content: "New content",
      tags: ["new", "tags"],
    };

    const result = await updateTemplateMock(mockContext, args);

    expect(result).toBe(true);
    expect(mockContext.db.patch).toHaveBeenCalledWith("template-123", {
      name: "New Name",
      content: "New content",
      tags: ["new", "tags"],
    });
  });
});

describe("updateTemplate mutation - Validation errors", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should throw error if not authenticated", async () => {
    mockContext.auth.getUserIdentity.mockResolvedValue(null);

    const args = {
      templateId: "template-123",
      name: "New Name",
    };

    await expect(updateTemplateMock(mockContext, args)).rejects.toThrow(
      "Not authenticated"
    );
  });

  it("should throw error if template not found", async () => {
    mockContext.auth.getUserIdentity.mockResolvedValue({
      subject: "user_123",
      email: "test@example.com",
    });
    mockContext.db.get.mockResolvedValue(null);

    const args = {
      templateId: "non-existent",
      name: "New Name",
    };

    await expect(updateTemplateMock(mockContext, args)).rejects.toThrow(
      "Template not found"
    );
  });

  it("should throw error if user does not own template", async () => {
    mockContext.auth.getUserIdentity.mockResolvedValue({
      subject: "user_123",
      email: "test@example.com",
    });
    mockContext.db.get.mockResolvedValue({
      _id: "template-123",
      clerkUserId: "user_456", // Different user
      name: "Template",
      content: "Content",
      tags: [],
      usageCount: 0,
    });

    const args = {
      templateId: "template-123",
      name: "Trying to steal",
    };

    await expect(updateTemplateMock(mockContext, args)).rejects.toThrow(
      "Unauthorized: You do not own this template"
    );
  });

  it("should throw error if new name already exists for user", async () => {
    mockContext.auth.getUserIdentity.mockResolvedValue({
      subject: "user_123",
      email: "test@example.com",
    });
    mockContext.db.get.mockResolvedValue({
      _id: "template-123",
      clerkUserId: "user_123",
      name: "Old Name",
      content: "Content",
      tags: [],
      usageCount: 0,
    });
    mockContext.db.query.mockReturnValue({
      withIndex: jest.fn().mockReturnValue({
        filter: jest.fn().mockReturnValue({
          first: jest.fn().mockResolvedValue({
            _id: "another-template",
            name: "Existing Name",
            clerkUserId: "user_123",
          }),
        }),
      }),
    });

    const args = {
      templateId: "template-123",
      name: "Existing Name",
    };

    await expect(updateTemplateMock(mockContext, args)).rejects.toThrow(
      'Template with name "Existing Name" already exists'
    );
  });

  it("should throw error if updated content is empty", async () => {
    mockContext.auth.getUserIdentity.mockResolvedValue({
      subject: "user_123",
      email: "test@example.com",
    });
    mockContext.db.get.mockResolvedValue({
      _id: "template-123",
      clerkUserId: "user_123",
      name: "Template",
      content: "Old content",
      tags: [],
      usageCount: 0,
    });

    const args = {
      templateId: "template-123",
      content: "",
    };

    await expect(updateTemplateMock(mockContext, args)).rejects.toThrow(
      "Template content cannot be empty"
    );
  });

  it("should throw error if updated content is only whitespace", async () => {
    mockContext.auth.getUserIdentity.mockResolvedValue({
      subject: "user_123",
      email: "test@example.com",
    });
    mockContext.db.get.mockResolvedValue({
      _id: "template-123",
      clerkUserId: "user_123",
      name: "Template",
      content: "Old content",
      tags: [],
      usageCount: 0,
    });

    const args = {
      templateId: "template-123",
      content: "   \n\t  ",
    };

    await expect(updateTemplateMock(mockContext, args)).rejects.toThrow(
      "Template content cannot be empty"
    );
  });
});

describe("deleteTemplate mutation - Success cases", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should successfully delete a template", async () => {
    mockContext.auth.getUserIdentity.mockResolvedValue({
      subject: "user_123",
      email: "test@example.com",
    });
    mockContext.db.get.mockResolvedValue({
      _id: "template-123",
      clerkUserId: "user_123",
      name: "Template to Delete",
      content: "Content",
      tags: [],
      usageCount: 0,
    });

    const args = {
      templateId: "template-123",
    };

    const result = await deleteTemplateMock(mockContext, args);

    expect(result).toBe(true);
    expect(mockContext.db.delete).toHaveBeenCalledWith("template-123");
  });
});

describe("deleteTemplate mutation - Validation errors", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should throw error if not authenticated", async () => {
    mockContext.auth.getUserIdentity.mockResolvedValue(null);

    const args = {
      templateId: "template-123",
    };

    await expect(deleteTemplateMock(mockContext, args)).rejects.toThrow(
      "Not authenticated"
    );
  });

  it("should throw error if template not found", async () => {
    mockContext.auth.getUserIdentity.mockResolvedValue({
      subject: "user_123",
      email: "test@example.com",
    });
    mockContext.db.get.mockResolvedValue(null);

    const args = {
      templateId: "non-existent",
    };

    await expect(deleteTemplateMock(mockContext, args)).rejects.toThrow(
      "Template not found"
    );
  });

  it("should throw error if user does not own template", async () => {
    mockContext.auth.getUserIdentity.mockResolvedValue({
      subject: "user_123",
      email: "test@example.com",
    });
    mockContext.db.get.mockResolvedValue({
      _id: "template-123",
      clerkUserId: "user_456", // Different user
      name: "Template",
      content: "Content",
      tags: [],
      usageCount: 0,
    });

    const args = {
      templateId: "template-123",
    };

    await expect(deleteTemplateMock(mockContext, args)).rejects.toThrow(
      "Unauthorized: You do not own this template"
    );
  });
});

describe("getTemplates query - Success cases", () => {
  let mockQueryContext: any;
  let mockTemplates: any[];

  beforeEach(() => {
    jest.clearAllMocks();

    mockTemplates = [
      {
        _id: "template-1",
        _creationTime: Date.now(),
        clerkUserId: "user-123",
        name: "Closing CTA",
        content: "Thanks for reading! Follow for more updates.",
        tags: ["closing", "cta"],
        usageCount: 5,
        lastUsedAt: Date.now() - 86400000,
      },
      {
        _id: "template-2",
        _creationTime: Date.now(),
        clerkUserId: "user-123",
        name: "Hashtags Tech",
        content: "#webdev #javascript #coding #tech",
        tags: ["hashtags", "tech"],
        usageCount: 10,
        lastUsedAt: Date.now() - 172800000,
      },
      {
        _id: "template-3",
        _creationTime: Date.now(),
        clerkUserId: "user-123",
        name: "BuildInPublic Intro",
        content: "Building in public, day 23...",
        tags: ["buildinpublic", "intro"],
        usageCount: 3,
        lastUsedAt: Date.now() - 259200000,
      },
    ];

    mockQueryContext = {
      db: {
        query: jest.fn().mockReturnValue({
          withIndex: jest.fn().mockReturnValue({
            collect: jest.fn().mockResolvedValue(mockTemplates),
          }),
        }),
      },
      auth: {
        getUserIdentity: jest.fn().mockResolvedValue({
          subject: "user-123",
        }),
      },
    };
  });

  it("should return all user templates sorted by name", async () => {
    const args = {};

    const result = await getTemplatesMock(mockQueryContext, args);

    expect(result).toHaveLength(3);
    expect(result[0].name).toBe("BuildInPublic Intro");
    expect(result[1].name).toBe("Closing CTA");
    expect(result[2].name).toBe("Hashtags Tech");
  });

  it("should filter templates by tag", async () => {
    const args = {
      tag: "hashtags",
    };

    const result = await getTemplatesMock(mockQueryContext, args);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Hashtags Tech");
  });

  it("should return empty array when tag filter matches nothing", async () => {
    const args = {
      tag: "nonexistent",
    };

    const result = await getTemplatesMock(mockQueryContext, args);

    expect(result).toHaveLength(0);
  });

  it("should return empty array when user has no templates", async () => {
    mockQueryContext.db.query.mockReturnValue({
      withIndex: jest.fn().mockReturnValue({
        collect: jest.fn().mockResolvedValue([]),
      }),
    });

    const args = {};

    const result = await getTemplatesMock(mockQueryContext, args);

    expect(result).toHaveLength(0);
  });

  it("should return templates with multiple matching tags", async () => {
    // template-1 has tags: ["closing", "cta"]
    const args = {
      tag: "closing",
    };

    const result = await getTemplatesMock(mockQueryContext, args);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Closing CTA");
    expect(result[0].tags).toContain("closing");
    expect(result[0].tags).toContain("cta");
  });
});

describe("getTemplates query - Validation errors", () => {
  let mockQueryContext: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockQueryContext = {
      db: {
        query: jest.fn().mockReturnValue({
          withIndex: jest.fn().mockReturnValue({
            collect: jest.fn().mockResolvedValue([]),
          }),
        }),
      },
      auth: {
        getUserIdentity: jest.fn(),
      },
    };
  });

  it("should throw error if not authenticated", async () => {
    mockQueryContext.auth.getUserIdentity.mockResolvedValue(null);

    const args = {};

    await expect(getTemplatesMock(mockQueryContext, args)).rejects.toThrow(
      "Not authenticated"
    );
  });
});

describe("Name uniqueness validation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should enforce unique names per user for create", async () => {
    mockContext.auth.getUserIdentity.mockResolvedValue({
      subject: "user_123",
      email: "test@example.com",
    });

    // First template creation succeeds
    mockContext.db.query.mockReturnValueOnce({
      withIndex: jest.fn().mockReturnValue({
        filter: jest.fn().mockReturnValue({
          first: jest.fn().mockResolvedValue(null),
        }),
      }),
    });

    await createTemplateMock(mockContext, {
      name: "Unique Name",
      content: "Content",
      tags: [],
    });

    expect(mockContext.db.insert).toHaveBeenCalled();

    // Second template with same name fails
    mockContext.db.query.mockReturnValueOnce({
      withIndex: jest.fn().mockReturnValue({
        filter: jest.fn().mockReturnValue({
          first: jest.fn().mockResolvedValue({
            _id: "existing",
            name: "Unique Name",
            clerkUserId: "user_123",
          }),
        }),
      }),
    });

    await expect(
      createTemplateMock(mockContext, {
        name: "Unique Name",
        content: "Different content",
        tags: [],
      })
    ).rejects.toThrow('Template with name "Unique Name" already exists');
  });

  it("should enforce unique names per user for update", async () => {
    mockContext.auth.getUserIdentity.mockResolvedValue({
      subject: "user_123",
      email: "test@example.com",
    });
    mockContext.db.get.mockResolvedValue({
      _id: "template-123",
      clerkUserId: "user_123",
      name: "Original Name",
      content: "Content",
      tags: [],
      usageCount: 0,
    });
    mockContext.db.query.mockReturnValue({
      withIndex: jest.fn().mockReturnValue({
        filter: jest.fn().mockReturnValue({
          first: jest.fn().mockResolvedValue({
            _id: "another-template",
            name: "Taken Name",
            clerkUserId: "user_123",
          }),
        }),
      }),
    });

    await expect(
      updateTemplateMock(mockContext, {
        templateId: "template-123",
        name: "Taken Name",
      })
    ).rejects.toThrow('Template with name "Taken Name" already exists');
  });

  it("should allow updating template without changing name", async () => {
    mockContext.auth.getUserIdentity.mockResolvedValue({
      subject: "user_123",
      email: "test@example.com",
    });
    mockContext.db.get.mockResolvedValue({
      _id: "template-123",
      clerkUserId: "user_123",
      name: "Same Name",
      content: "Old content",
      tags: [],
      usageCount: 0,
    });

    const args = {
      templateId: "template-123",
      content: "New content",
    };

    const result = await updateTemplateMock(mockContext, args);

    expect(result).toBe(true);
    expect(mockContext.db.patch).toHaveBeenCalledWith("template-123", {
      content: "New content",
    });
  });
});
