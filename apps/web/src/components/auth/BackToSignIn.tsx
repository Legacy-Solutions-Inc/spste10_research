import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/** Quiet link back to the sign-in page, shown above secondary auth forms. */
export function BackToSignIn() {
  return (
    <Link
      href="/"
      className="-ml-1 inline-flex items-center gap-1.5 rounded-sm px-1 text-13 font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Back to sign in
    </Link>
  );
}
