export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** 简单 voter 指纹，demo 用 */
export function getVoterFingerprint(headers: Headers): string {
  return (
    headers.get("x-forwarded-for") ||
    headers.get("x-real-ip") ||
    "anonymous"
  );
}
