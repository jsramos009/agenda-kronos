export function hasSupabaseSessionCookie(
  cookies: Array<{ name: string }>,
) {
  return cookies.some(({ name }) =>
    /^sb-[a-z0-9]+-auth-token(?:\.\d+)?$/i.test(name),
  );
}
