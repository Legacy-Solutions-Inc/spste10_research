import Link from "next/link";
import { UserPlus, LogIn } from "lucide-react";

export const metadata = {
  title: "AGAP - Welcome",
  description: "Welcome to AGAP - Emergency Alert and Response Management Platform",
};

export default async function Home() {
  // Authentication check is handled by middleware
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100">
      <main className="flex-1 flex flex-col md:flex-row">
        {/* Left Column - Branding and Hero Section */}
        <div className="w-full md:w-1/2 flex items-center justify-center p-4 md:p-8 lg:p-12 opacity-0 animate-fade-in">
          <div className="max-w-lg w-full space-y-6">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-slate-800 leading-tight">
              AGAP
            </h1>
            <div className="space-y-4">
              <p className="text-xl md:text-2xl font-semibold text-slate-700">
                Emergency Alert and Response Management Platform
              </p>
              <p className="text-base md:text-lg text-slate-600 leading-relaxed">
                Connect responders with real-time reports from citizens.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column - Authentication Actions */}
        <div className="w-full md:w-1/2 flex items-center justify-center p-4 md:p-8 lg:p-12 bg-white md:bg-transparent opacity-0 animate-fade-in" style={{ animationDelay: '0.15s' }}>
          <div className="w-full max-w-md space-y-6">
            <Link
              href="/register"
              className="group flex items-center justify-center gap-3 w-full bg-blue-900 text-white text-sm font-semibold rounded-xl shadow-md py-4 px-6 transition-all duration-200 hover:bg-blue-950 hover:scale-105 hover:shadow-lg"
            >
              <UserPlus className="w-5 h-5" />
              <span>Create an account</span>
            </Link>
            <Link
              href="/login"
              className="group flex items-center justify-center gap-3 w-full bg-blue-900 text-white text-sm font-semibold rounded-xl shadow-md py-4 px-6 transition-all duration-200 hover:bg-blue-950 hover:scale-105 hover:shadow-lg"
            >
              <LogIn className="w-5 h-5" />
              <span>Log In</span>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-6 px-4 md:px-8 border-t border-slate-200 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-center text-sm text-slate-500">
          <p>AGAP © 2026</p>
        </div>
      </footer>
    </div>
  );
}

