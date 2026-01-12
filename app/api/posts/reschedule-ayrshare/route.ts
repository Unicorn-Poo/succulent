import { NextRequest, NextResponse } from "next/server";
import {
	validateAPIKey,
	validateAccountGroupAccess,
} from "@/utils/apiKeyManager";

export const dynamic = "force-dynamic";

const MAINTENANCE_ENDPOINT = "/api/maintenance/lunary-media-repair";

export async function POST(request: NextRequest) {
	try {
		const clientIP = request.headers.get("X-Forwarded-For") || "unknown";
		const userAgent = request.headers.get("User-Agent") || "unknown";
		const apiKey = request.headers.get("X-API-Key");

		if (!apiKey) {
			return NextResponse.json(
				{ success: false, error: "Missing API key" },
				{ status: 401 }
			);
		}

		const validation = await validateAPIKey(
			apiKey,
			"posts:update",
			clientIP,
			userAgent
		);
		if (!validation.isValid) {
			return NextResponse.json(
				{ success: false, error: validation.error || "Invalid API key" },
				{ status: validation.statusCode || 401 }
			);
		}

		const body = await request.json();
		const accountGroupId = body?.accountGroupId as string | undefined;
		const postIds = Array.isArray(body?.postIds)
			? body.postIds.filter((value: any) => typeof value === "string")
			: undefined;
		const dryRun = body?.dryRun === true;

		if (!accountGroupId) {
			return NextResponse.json(
				{ success: false, error: "accountGroupId is required" },
				{ status: 400 }
			);
		}

		if (!postIds || postIds.length === 0) {
			return NextResponse.json(
				{ success: false, error: "postIds is required" },
				{ status: 400 }
			);
		}

		const groupAccess = validateAccountGroupAccess(
			validation.keyData,
			accountGroupId
		);
		if (!groupAccess.hasAccess) {
			return NextResponse.json(
				{
					success: false,
					error: groupAccess.error || "Access denied to account group",
					code:
						groupAccess.errorCode || "ACCOUNT_GROUP_ACCESS_DENIED",
				},
				{ status: groupAccess.statusCode || 403 }
			);
		}

		const maintenanceApiKey =
			process.env.LUNARY_MEDIA_REPAIR_API_KEY ||
			process.env.NEXT_PUBLIC_LUNARY_MEDIA_REPAIR_API_KEY ||
			"";

		if (!maintenanceApiKey) {
			return NextResponse.json(
				{
					success: false,
					error: "Maintenance API key not configured",
				},
				{ status: 500 }
			);
		}

		const repairResponse = await fetch(
			new URL(MAINTENANCE_ENDPOINT, request.url),
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-API-Key": maintenanceApiKey,
				},
				body: JSON.stringify({
					accountGroupId,
					postIds,
					dryRun,
					applyAll: false,
					reschedule: true,
					onlyScheduled: true,
				}),
			}
		);

		if (!repairResponse.ok) {
			const errorText = await repairResponse.text();
			return NextResponse.json(
				{
					success: false,
					error: "Maintenance request failed",
					details: errorText,
				},
				{ status: repairResponse.status }
			);
		}

		const repairData = await repairResponse.json();
		return NextResponse.json({ success: true, data: repairData });
	} catch (error) {
		console.error("❌ Error rescheduling Ayrshare posts:", error);
		return NextResponse.json(
			{ success: false, error: "Failed to reschedule Ayrshare posts" },
			{ status: 500 }
		);
	}
}
