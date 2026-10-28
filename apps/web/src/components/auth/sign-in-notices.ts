/**
 * Reasons a sign-in is turned away. Shared by the sign-in form (after a
 * sign-in attempt) and the sign-in page (when the middleware redirects to
 * /?notice=pending, /?notice=rejected or /?error=access_denied).
 */
export type SignInNotice = "pending" | "rejected" | "mobile";

export const SIGN_IN_NOTICES: Record<
  SignInNotice,
  { tone: "error" | "info"; title: string; body: string }
> = {
  pending: {
    tone: "info",
    title: "Waiting for administrator approval",
    body: "Your office's access request hasn't been approved yet. You'll be able to sign in once an administrator approves it.",
  },
  rejected: {
    tone: "error",
    title: "Access not approved",
    body: "This account's access request was declined, or its access was revoked. Contact your AGAP administrator to sort it out.",
  },
  mobile: {
    tone: "error",
    title: "This account is for the AGAP mobile app",
    body: "Response offices sign in here with an approved responder account. Request access if your office doesn't have one yet.",
  },
};

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function parseSignInNotice(searchParams: SearchParams): SignInNotice | null {
  const notice = first(searchParams.notice);
  if (notice === "pending" || notice === "rejected") return notice;
  if (first(searchParams.error) === "access_denied") return "mobile";
  return null;
}
