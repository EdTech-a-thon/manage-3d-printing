import PocketBase from 'pocketbase';

const baseUrl = typeof window === 'undefined' ? 'http://127.0.0.1:8090' : window.location.origin;

export const pb = new PocketBase(baseUrl);

export function isTeacherLoggedIn() {
  return pb.authStore.isValid && !!pb.authStore.model;
}

export function getTeacherName() {
  const model = pb.authStore.model as { name?: string; email?: string } | null;
  return model?.name || model?.email || 'Teacher';
}

export function makeSlug(title: string) {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30) || 'print-job';
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base}-${suffix}`;
}
