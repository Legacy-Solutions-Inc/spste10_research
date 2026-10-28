// Single source of truth for brand colors.
// Consumed by tailwind.config.js (class names) and by components that need raw
// hex values (icon colors, ActivityIndicator, StatusBar backgrounds).
// Navy is the brand base; red is reserved for SOS / live / Call 911 only.
module.exports = {
  navy: {
    DEFAULT: "#0b376c",
    dark: "#072a52",
    muted: "#1b4f8f",
    tint: "#e6edf9",
  },
  sos: {
    DEFAULT: "#d92d20",
    dark: "#b42318",
    tint: "#fee4e2",
  },
  ink: {
    DEFAULT: "#111827",
    muted: "#4b5563",
    subtle: "#6b7280",
  },
  line: "#e5e7eb",
  surface: "#f5f6fa",
};
