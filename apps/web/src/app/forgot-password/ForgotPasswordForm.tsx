"use client";

import { useState } from "react";
import type { FormEvent, ChangeEvent } from "react";
import { createClient } from "@/lib/supabaseBrowser";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    // Clear error when user starts typing
    if (error) setError("");
    if (success) setSuccess(false);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);

    // Validate email
    if (!email) {
      setError("Please enter your email address");
      setLoading(false);
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      );

      if (resetError) {
        setError(resetError.message || "Failed to send reset link. Please try again.");
      } else {
        setSuccess(true);
        setEmail("");
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
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
        placeholder="Email Address"
        value={email}
        onChange={handleChange}
        disabled={loading}
        className="w-[300px] py-2 px-4 border border-blue-300 rounded-full text-sm placeholder:text-blue-300 focus:outline-none disabled:opacity-50"
      />
      {error && (
        <p className="text-red-500 text-sm text-center w-[300px]">{error}</p>
      )}
      {success && (
        <p className="text-green-600 text-sm text-center w-[300px]">
          Reset link sent! Please check your email.
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="bg-blue-900 text-white font-semibold py-2 px-6 rounded-full shadow-md hover:opacity-90 transition w-[300px] mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Sending..." : "Send Reset Link"}
      </button>
    </form>
  );
}

