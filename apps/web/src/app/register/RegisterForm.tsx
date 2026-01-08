"use client";

import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseBrowser";

export default function RegisterForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    fullName: "",
    municipality: "",
    province: "",
    officeAddress: "",
    contactNumber: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    setFormData((prev) => ({
      ...prev,
      [input.name]: input.value,
    }));
    // Clear error when user starts typing
    if (error) setError("");
    if (success) setSuccess("");
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    // Validate required fields
    if (!formData.email || !formData.password || !formData.confirmPassword) {
      setError("Email and password are required");
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

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    // Validate password length
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    // Check if all responder fields are provided
    const isResponderRegistration =
      formData.municipality &&
      formData.province &&
      formData.officeAddress &&
      formData.contactNumber;

    try {
      const supabase = createClient();

      // Sign up the user
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName || null,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message || "Failed to create account");
        setLoading(false);
        return;
      }

      if (data.user) {
        // Update profile with full_name if provided
        if (formData.fullName) {
          await supabase
            .from("profiles")
            .update({ full_name: formData.fullName })
            .eq("id", data.user.id);
        }

        // If all responder fields are provided, create responder profile
        if (isResponderRegistration) {
          // Update profile role to 'responder'
          await supabase
            .from("profiles")
            .update({ role: "responder" })
            .eq("id", data.user.id);

          // Create responder_profiles record with status='pending'
          const { error: responderProfileError } = await supabase
            .from("responder_profiles")
            .insert({
              id: data.user.id,
              municipality: formData.municipality,
              province: formData.province,
              office_address: formData.officeAddress,
              contact_number: formData.contactNumber,
              account_status: "pending",
            });

          if (responderProfileError) {
            console.error("Error creating responder profile:", responderProfileError);
            // Don't fail the registration, but log the error
          }

          setSuccess(
            "Account created! Your responder account is pending admin approval. You will be able to login once approved."
          );
        } else {
          setSuccess("Account created! Please check your email to confirm your account.");
        }

        // Redirect to login after a short delay
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      console.error("Registration error:", err);
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
        placeholder="Email"
        value={formData.email}
        onChange={handleChange}
        required
        className="w-[300px] py-2 px-4 border border-blue-300 rounded-full text-sm placeholder:text-blue-300 focus:outline-none"
      />
      <input
        type="text"
        name="fullName"
        placeholder="Full Name (optional)"
        value={formData.fullName}
        onChange={handleChange}
        className="w-[300px] py-2 px-4 border border-blue-300 rounded-full text-sm placeholder:text-blue-300 focus:outline-none"
      />
      <input
        type="text"
        name="municipality"
        placeholder="Municipality"
        value={formData.municipality}
        onChange={handleChange}
        className="w-[300px] py-2 px-4 border border-blue-300 rounded-full text-sm placeholder:text-blue-300 focus:outline-none"
      />
      <input
        type="text"
        name="province"
        placeholder="Province"
        value={formData.province}
        onChange={handleChange}
        className="w-[300px] py-2 px-4 border border-blue-300 rounded-full text-sm placeholder:text-blue-300 focus:outline-none"
      />
      <input
        type="text"
        name="officeAddress"
        placeholder="Office Address"
        value={formData.officeAddress}
        onChange={handleChange}
        className="w-[300px] py-2 px-4 border border-blue-300 rounded-full text-sm placeholder:text-blue-300 focus:outline-none"
      />
      <input
        type="tel"
        name="contactNumber"
        placeholder="Contact Number"
        value={formData.contactNumber}
        onChange={handleChange}
        className="w-[300px] py-2 px-4 border border-blue-300 rounded-full text-sm placeholder:text-blue-300 focus:outline-none"
      />
      <input
        type="password"
        name="password"
        placeholder="Password"
        value={formData.password}
        onChange={handleChange}
        required
        minLength={6}
        className="w-[300px] py-2 px-4 border border-blue-300 rounded-full text-sm placeholder:text-blue-300 focus:outline-none"
      />
      <input
        type="password"
        name="confirmPassword"
        placeholder="Confirm Password"
        value={formData.confirmPassword}
        onChange={handleChange}
        required
        minLength={6}
        className="w-[300px] py-2 px-4 border border-blue-300 rounded-full text-sm placeholder:text-blue-300 focus:outline-none"
      />
      {error && (
        <p className="text-red-500 text-sm text-center w-[300px]">{error}</p>
      )}
      {success && (
        <p className="text-green-600 text-sm text-center w-[300px]">{success}</p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="bg-blue-100 text-blue-400 font-semibold py-2 px-6 rounded-full shadow-md transition hover:opacity-90 w-[300px] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Creating Account..." : "Create Account"}
      </button>
    </form>
  );
}

