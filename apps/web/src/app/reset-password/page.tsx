import ResetPasswordForm from "./ResetPasswordForm";

export const metadata = {
  title: "AGAP - Set New Password",
  description: "Choose a new password for your AGAP account",
};

export default async function ResetPasswordPage() {
  // The recovery session comes from the email link, so it is resolved client-side
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <ResetPasswordForm />
    </div>
  );
}
