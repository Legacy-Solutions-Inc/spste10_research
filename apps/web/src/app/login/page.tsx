import LoginForm from "./LoginForm";

export const metadata = {
  title: "AGAP - Log In",
  description: "Log in to your AGAP account",
};

export default async function LoginPage() {
  // Authentication check is handled by middleware
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100">
      <main className="flex-1 flex flex-col md:flex-row">
        {/* Left Column - Branding and Mission Statement (Desktop Only) */}
        <div className="hidden md:flex md:w-1/2 items-center justify-center p-8 lg:p-12 opacity-0 animate-fade-in">
          <div className="max-w-lg w-full space-y-6">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-slate-800 leading-tight">
              AGAP
            </h1>
            <div className="space-y-4">
              <p className="text-xl md:text-2xl font-semibold text-slate-700">
                Emergency Alert and Response Management Platform
              </p>
              <p className="text-base md:text-lg text-slate-600 leading-relaxed">
                Connecting responders with real-time emergency reports from citizens. Your mission is to help those in need, and we&apos;re here to support you every step of the way.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column - Login Form */}
        <div className="w-full md:w-1/2 flex items-center justify-center p-4 md:p-8 lg:p-12 bg-white md:bg-transparent opacity-0 animate-fade-in" style={{ animationDelay: '0.15s' }}>
          <div className="w-full max-w-md">
            <LoginForm />
          </div>
        </div>
      </main>
    </div>
  );
}

