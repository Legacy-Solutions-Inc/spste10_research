"use client";

import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { createClient } from "@/lib/supabaseBrowser";

export default function LoginForm() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    setFormData((prev) => ({
      ...prev,
      [input.name]: input.value,
    }));
    // Clear error when user starts typing
    if (error) setError("");
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Validate all fields are filled
    if (!formData.email || !formData.password) {
      setError("Please fill in all fields");
      setLoading(false);
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Please enter a valid email address");
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (authError) {
        setError(authError.message || "Invalid email or password");
        setLoading(false);
        return;
      }

      if (data.session && data.user) {
        console.log("[LoginForm] Login successful:", {
          hasSession: !!data.session,
          hasUser: !!data.user,
          userId: data.user.id,
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
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col items-center space-y-4 w-full"
    >
      <input
        type="email"
        name="email"
        placeholder="Email"
        value={formData.email}
        onChange={handleChange}
        className="w-[300px] py-2 px-4 border border-blue-300 rounded-full text-sm placeholder:text-blue-300 focus:outline-none"
      />
      <input
        type="password"
        name="password"
        placeholder="Password"
        value={formData.password}
        onChange={handleChange}
        className="w-[300px] py-2 px-4 border border-blue-300 rounded-full text-sm placeholder:text-blue-300 focus:outline-none"
      />
      {error && (
        <p className="text-red-500 text-sm text-center w-[300px]">{error}</p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="bg-blue-900 text-white font-semibold py-2 px-6 rounded-full shadow-md transition hover:opacity-90 w-[300px] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Logging in..." : "Log In"}
      </button>
    </form>
  );
}

