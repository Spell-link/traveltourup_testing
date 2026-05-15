import { NextRequest, NextResponse } from "next/server";
import { getServerAuthz } from "@/lib/authz/session";
import { hasPermission } from "@/lib/authz/guards";
import { suggestInternalLinks } from "@/lib/seo/internal-link-suggestor";
import { z } from "zod";

/**
 * POST /api/v1/blogs/suggestions
 * Get internal link suggestions based on keyphrase and tags
 * Requires: admin.blogs:read permission
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { authz } = await getServerAuthz();
    if (!hasPermission(authz, "admin.blogs:read")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Validate input
    const schema = z.object({
      currentPostId: z.string().cuid("Invalid post ID"),
      focusKeyphrase: z.string().optional(),
      tags: z.array(z.string()).optional(),
      limit: z.number().int().min(1).max(10).default(5),
    });

    const validated = schema.parse(body);

    // Get suggestions
    const suggestions = await suggestInternalLinks(
      validated.currentPostId,
      validated.focusKeyphrase || "",
      validated.tags || [],
      validated.limit
    );

    return NextResponse.json({
      success: true,
      suggestions,
      count: suggestions.length,
    });
  } catch (error) {
    console.error("Error fetching internal link suggestions:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid request",
          details: error.issues,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
