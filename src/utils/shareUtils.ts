export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'user';
}

export function hashUuidToCode(uuid: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < uuid.length; i++) {
    h ^= uuid.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  const positive = h >>> 0;
  return (positive % 1000000).toString().padStart(6, '0');
}

export function generateUserShareSlug(fullNameOrEmail: string, userId: string): { slug: string; code: string } {
  const nameSlug = slugify(fullNameOrEmail.split('@')[0]);
  const code = hashUuidToCode(userId);
  return {
    slug: `${nameSlug}-${code}`,
    code,
  };
}
