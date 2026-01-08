// Validation utility functions

export const validatePhoneNumber = (phone: string): string | null => {
  if (!phone || phone.trim() === "") return null; // Optional field
  
  // Remove common formatting characters
  const cleaned = phone.replace(/[\s\-()+]/g, "");
  
  // Check if it contains only digits
  if (!/^\d+$/.test(cleaned)) {
    return "Contact number must contain only digits and common formatting characters";
  }
  
  // Check length (typically 7-15 digits)
  if (cleaned.length < 7 || cleaned.length > 15) {
    return "Contact number must be between 7 and 15 digits";
  }
  
  return null;
};

export const validateTextField = (value: string, fieldName: string, maxLength: number = 255): string | null => {
  if (!value || value.trim() === "") return null; // Optional field
  
  if (value.length > maxLength) {
    return `${fieldName} must be less than ${maxLength} characters`;
  }
  
  return null;
};
