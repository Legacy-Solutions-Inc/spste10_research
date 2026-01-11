"use client";

import { useToast } from "./use-toast";
import { Toast } from "./toast";

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]">
      {toasts.map(function ({ id, title, description, variant, action, ...props }) {
        return (
          <Toast
            key={id}
            id={id}
            title={title}
            description={description}
            variant={variant}
            onDismiss={() => dismiss(id)}
            {...props}
          />
        );
      })}
    </div>
  );
}
