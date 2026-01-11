import ForgotPasswordForm from "./ForgotPasswordForm";

export const metadata = {
  title: "AGAP - Reset Password",
  description: "Reset your AGAP account password",
};

export default async function ForgotPasswordPage() {
  // Authentication check is handled by middleware
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <ForgotPasswordForm />
    </div>
  );
}

