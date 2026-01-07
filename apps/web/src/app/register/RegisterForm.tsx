"use client";

import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function RegisterForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    municipality: "",
    province: "",
    officeAddress: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    setFormData((prev) => ({
      ...prev,
      [input.name]: input.value,
    }));
    // Clear error when user starts typing
    if (error) setError("");
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    // Validate all fields are filled
    if (
      !formData.municipality ||
      !formData.province ||
      !formData.officeAddress ||
      !formData.password ||
      !formData.confirmPassword
    ) {
      setError("Please fill in all fields");
      return;
    }

    // Log values (for now)
    console.log("Registration data:", formData);

    // Navigate to login page
    router.push("/login");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col items-center space-y-4 w-full"
    >
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
        type="password"
        name="password"
        placeholder="Password"
        value={formData.password}
        onChange={handleChange}
        className="w-[300px] py-2 px-4 border border-blue-300 rounded-full text-sm placeholder:text-blue-300 focus:outline-none"
      />
      <input
        type="password"
        name="confirmPassword"
        placeholder="Confirm Password"
        value={formData.confirmPassword}
        onChange={handleChange}
        className="w-[300px] py-2 px-4 border border-blue-300 rounded-full text-sm placeholder:text-blue-300 focus:outline-none"
      />
      {error && (
        <p className="text-red-500 text-sm text-center w-[300px]">{error}</p>
      )}
      <button
        type="submit"
        className="bg-blue-100 text-blue-400 font-semibold py-2 px-6 rounded-full shadow-md transition hover:opacity-90 w-[300px]"
      >
        Create Account
      </button>
    </form>
  );
}

