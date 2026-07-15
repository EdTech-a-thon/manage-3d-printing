import { proxyPocketBase } from '$lib/server/pocketbase-proxy';

function targetPath(path: string | undefined) {
  return path ? `/_/${path}` : '/_/';
}

export async function GET(event: { request: Request; params: { path?: string } }) {
  return proxyPocketBase(event.request, targetPath(event.params.path));
}

export async function POST(event: { request: Request; params: { path?: string } }) {
  return proxyPocketBase(event.request, targetPath(event.params.path));
}

export async function PATCH(event: { request: Request; params: { path?: string } }) {
  return proxyPocketBase(event.request, targetPath(event.params.path));
}

export async function PUT(event: { request: Request; params: { path?: string } }) {
  return proxyPocketBase(event.request, targetPath(event.params.path));
}

export async function DELETE(event: { request: Request; params: { path?: string } }) {
  return proxyPocketBase(event.request, targetPath(event.params.path));
}

export async function OPTIONS(event: { request: Request; params: { path?: string } }) {
  return proxyPocketBase(event.request, targetPath(event.params.path));
}
