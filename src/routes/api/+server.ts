import { proxyPocketBase } from '$lib/server/pocketbase-proxy';

export async function GET(event: { request: Request }) {
  return proxyPocketBase(event.request, '/api');
}

export async function POST(event: { request: Request }) {
  return proxyPocketBase(event.request, '/api');
}

export async function PATCH(event: { request: Request }) {
  return proxyPocketBase(event.request, '/api');
}

export async function PUT(event: { request: Request }) {
  return proxyPocketBase(event.request, '/api');
}

export async function DELETE(event: { request: Request }) {
  return proxyPocketBase(event.request, '/api');
}

export async function OPTIONS(event: { request: Request }) {
  return proxyPocketBase(event.request, '/api');
}
