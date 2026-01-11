"use client";

import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import Link from "next/link";
import { Mail, Lock, Loader2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabaseBrowser";

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

export default function LoginForm() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const value = input.type === "checkbox" ? input.checked : input.value;
    
    setFormData((prev) => ({
      ...prev,
      [input.name]: value,
    }));
    
    // Clear field-specific error when user starts typing
    if (errors[input.name as keyof FormErrors]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[input.name as keyof FormErrors];
        return newErrors;
      });
    }
    
    // Clear general error
    if (errors.general) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.general;
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = "Please enter a valid email address";
      }
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (authError) {
        setErrors({
          general: authError.message || "Invalid email or password",
        });
        setLoading(false);
        return;
      }

      if (data.session && data.user) {
        // Check user role
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .single();

        if (profileError || !profile) {
          setErrors({
            general: "Failed to verify account. Please try again.",
          });
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }

        const userRole = profile.role;
        
        // Block user role from web app
        if (userRole === "user") {
          await supabase.auth.signOut();
          setErrors({
            general: "Access denied. This account is for mobile app only. Please use the mobile application to log in.",
          });
          setLoading(false);
          return;
        }

        // Allow responder and admin roles to proceed
        console.log("[LoginForm] Login successful:", {
          hasSession: !!data.session,
          hasUser: !!data.user,
          userId: data.user.id,
          userRole: userRole,
          cookies: document.cookie
        });
        
        // Wait a moment for cookies to be set
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Authentication and authorization checks are handled by middleware
        // Use window.location for full page reload to ensure cookies are set
        // Middleware will handle role-based redirects
        window.location.href = "/dashboard";
      }
    } catch (err) {
      setErrors({
        general: "An unexpected error occurred. Please try again.",
      });
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-3xl md:text-4xl font-extrabold text-slate-800">
          Welcome Back to AGAP
        </h2>
        <p className="text-base text-slate-600">
          Log in to access the responder dashboard
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Email Field */}
        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium text-slate-700">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              id="email"
              type="email"
              name="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                errors.email
                  ? "border-red-300 bg-red-50 focus:ring-red-500"
                  : "border-slate-300 bg-white hover:border-slate-400"
              }`}
            />
          </div>
          {errors.email && (
            <p className="flex items-center gap-1 text-sm text-red-600">
              <AlertCircle className="w-4 h-4" />
              {errors.email}
            </p>
          )}
        </div>

        {/* Password Field */}
        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-medium text-slate-700">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              id="password"
              type="password"
              name="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                errors.password
                  ? "border-red-300 bg-red-50 focus:ring-red-500"
                  : "border-slate-300 bg-white hover:border-slate-400"
              }`}
            />
          </div>
          {errors.password && (
            <p className="flex items-center gap-1 text-sm text-red-600">
              <AlertCircle className="w-4 h-4" />
              {errors.password}
            </p>
          )}
        </div>

        {/* Remember Me & Forgot Password */}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="rememberMe"
              checked={formData.rememberMe}
              onChange={handleChange}
              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 focus:ring-2"
            />
            <span className="text-sm text-slate-700">Remember me</span>
          </label>
          <Link
            href="/forgot-password"
            className="text-sm text-blue-600 hover:text-blue-700 hover:underline transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        {/* General Error */}
        {errors.general && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-600">{errors.general}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-blue-900 text-white text-sm font-semibold rounded-xl shadow-md py-3 px-6 transition-all duration-200 hover:bg-blue-950 hover:scale-[1.02] hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 active:scale-[0.98]"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Logging in...</span>
            </>
          ) : (
            <span>Log In</span>
          )}
        </button>
      </form>
    </div>
  );
}

