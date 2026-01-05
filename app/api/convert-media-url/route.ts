import { NextRequest } from "next/server";
import { handleRequest, POST, OPTIONS } from "./[...path]/route";

export async function GET(request: NextRequest) {
  return handleRequest(request, { params: Promise.resolve({ path: [] }) });
}

export async function HEAD(request: NextRequest) {
  const response = await handleRequest(request, {
    params: Promise.resolve({ path: [] }),
  });
  return new Response(null, {
    status: response.status,
    headers: response.headers,
  });
}

export { POST, OPTIONS };
