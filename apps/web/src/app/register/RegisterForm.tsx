"use client";

import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Mail,
  User,
  MapPin,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";
import { createClient } from "@/lib/supabaseBrowser";

interface FormErrors {
  email?: string;
  fullName?: string;
  municipality?: string;
  province?: string;
  officeAddress?: string;
  contactNumber?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
}

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
  const [errors, setErrors] = useState<FormErrors>({});
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    setFormData((prev) => ({
      ...prev,
      [input.name]: input.value,
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

    if (success) setSuccess("");
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Email validation
    if (!formData.email) {
      newErrors.email = "Email is required";
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = "Please enter a valid email address";
      }
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    setSuccess("");

    if (!validateForm()) {
      return;
    }

    setLoading(true);

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
        setErrors({
          general: signUpError.message || "Failed to create account",
        });
        setLoading(false);
        return;
      }

      if (data.user) {
        // Update profile with full_name if provided
        if (formData.fullName) {
          await supabase
            .from("profiles")
            // @ts-ignore - Supabase types may not be fully generated
            .update({ full_name: formData.fullName })
            .eq("id", data.user.id);
        }

        // If all responder fields are provided, create responder profile
        if (isResponderRegistration) {
          // Update profile role to 'responder'
          await supabase
            .from("profiles")
            // @ts-ignore - Supabase types may not be fully generated
            .update({ role: "responder" })
            .eq("id", data.user.id);

          // Create responder_profiles record with status='pending'
          const { error: responderProfileError } = await supabase
            .from("responder_profiles")
            // @ts-ignore - Supabase types may not be fully generated
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
      setErrors({
        general: "An unexpected error occurred. Please try again.",
      });
      console.error("Registration error:", err);
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="space-y-2 mb-6">
        <h2 className="text-3xl md:text-4xl font-extrabold text-slate-800">
          Create an Account
        </h2>
        <p className="text-base text-slate-600">
          Responders must be verified by admin before login
        </p>
      </div>

      {/* Back to Login Link */}
      <Link
        href="/login"
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to login
      </Link>

      {/* Form Card */}
      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-xl rounded-2xl p-6 md:p-8 space-y-6"
      >
        {/* Section 1: Account Information */}
        <div className="space-y-5">
          <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-2">
            Account Information
          </h3>

          {/* Email Field */}
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-slate-700">
              Email <span className="text-red-500">*</span>
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
                autoFocus
                required
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "email-error" : undefined}
                className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                  errors.email
                    ? "border-red-300 bg-red-50 focus:ring-red-500"
                    : "border-slate-300 bg-white hover:border-slate-400"
                }`}
              />
            </div>
            {errors.email && (
              <p
                id="email-error"
                className="flex items-center gap-1 text-sm text-red-600"
              >
                <AlertCircle className="w-4 h-4" />
                {errors.email}
              </p>
            )}
          </div>

          {/* Full Name Field */}
          <div className="space-y-2">
            <label htmlFor="fullName" className="block text-sm font-medium text-slate-700">
              Full Name <span className="text-slate-400 text-xs">(optional)</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                id="fullName"
                type="text"
                name="fullName"
                placeholder="Enter the name of the office"
                value={formData.fullName}
                onChange={handleChange}
                aria-describedby={errors.fullName ? "fullName-error" : undefined}
                className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                  errors.fullName
                    ? "border-red-300 bg-red-50 focus:ring-red-500"
                    : "border-slate-300 bg-white hover:border-slate-400"
                }`}
              />
            </div>
            {errors.fullName && (
              <p
                id="fullName-error"
                className="flex items-center gap-1 text-sm text-red-600"
              >
                <AlertCircle className="w-4 h-4" />
                {errors.fullName}
              </p>
            )}
          </div>
        </div>

        {/* Section 2: Contact Information */}
        <div className="space-y-5">
          <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-2">
            Contact Information <span className="text-sm font-normal text-slate-500">(for responders)</span>
          </h3>

          {/* Municipality Field */}
          <div className="space-y-2">
            <label htmlFor="municipality" className="block text-sm font-medium text-slate-700">
              Municipality
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                id="municipality"
                type="text"
                name="municipality"
                placeholder="Enter your municipality"
                value={formData.municipality}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white hover:border-slate-400"
              />
            </div>
          </div>

          {/* Province Field */}
          <div className="space-y-2">
            <label htmlFor="province" className="block text-sm font-medium text-slate-700">
              Province
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                id="province"
                type="text"
                name="province"
                placeholder="Enter your province"
                value={formData.province}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white hover:border-slate-400"
              />
            </div>
          </div>

          {/* Office Address Field */}
          <div className="space-y-2">
            <label htmlFor="officeAddress" className="block text-sm font-medium text-slate-700">
              Office Address
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                id="officeAddress"
                type="text"
                name="officeAddress"
                placeholder="Enter your office address"
                value={formData.officeAddress}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white hover:border-slate-400"
              />
            </div>
          </div>

          {/* Contact Number Field */}
          <div className="space-y-2">
            <label htmlFor="contactNumber" className="block text-sm font-medium text-slate-700">
              Contact Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                id="contactNumber"
                type="tel"
                name="contactNumber"
                placeholder="Enter your contact number"
                value={formData.contactNumber}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white hover:border-slate-400"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Security */}
        <div className="space-y-5">
          <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-2">
            Security
          </h3>

          {/* Password Field */}
          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
              Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Enter your password (min. 6 characters)"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={6}
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? "password-error" : undefined}
                className={`w-full pl-10 pr-12 py-3 border rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                  errors.password
                    ? "border-red-300 bg-red-50 focus:ring-red-500"
                    : "border-slate-300 bg-white hover:border-slate-400"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            {errors.password && (
              <p
                id="password-error"
                className="flex items-center gap-1 text-sm text-red-600"
              >
                <AlertCircle className="w-4 h-4" />
                {errors.password}
              </p>
            )}
          </div>

          {/* Confirm Password Field */}
          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700">
              Confirm Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                minLength={6}
                aria-invalid={!!errors.confirmPassword}
                aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
                className={`w-full pl-10 pr-12 py-3 border rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                  errors.confirmPassword
                    ? "border-red-300 bg-red-50 focus:ring-red-500"
                    : "border-slate-300 bg-white hover:border-slate-400"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p
                id="confirmPassword-error"
                className="flex items-center gap-1 text-sm text-red-600"
              >
                <AlertCircle className="w-4 h-4" />
                {errors.confirmPassword}
              </p>
            )}
          </div>
        </div>

        {/* General Error */}
        {errors.general && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-600">{errors.general}</p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
            <p className="text-sm text-green-600">{success}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-md py-3 px-6 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Creating Account...</span>
            </>
          ) : (
            <span>Create Account</span>
          )}
        </button>
      </form>
    </div>
  );
}

