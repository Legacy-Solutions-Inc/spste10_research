"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabaseBrowser";
import type { ResponseStatus } from "@/types/incident";

interface UpdateAssignmentParams {
  assignmentId: string;
  responseStatus: ResponseStatus;
}

export function useUpdateAssignment() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateAssignment = async ({ assignmentId, responseStatus }: UpdateAssignmentParams) => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      
      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("User not authenticated");
      }

      const updateData: {
        response_status: ResponseStatus;
        responded_at?: string;
      } = {
        response_status: responseStatus,
      };

      // Set responded_at if accepting
      if (responseStatus === 'accepted') {
        updateData.responded_at = new Date().toISOString();
      }

      const { data, error: updateError } = await supabase
        .from("responder_assignments")
        // @ts-ignore - Supabase types may not be fully generated
        .update(updateData)
        .eq("id", assignmentId)
        .eq("responder_id", user.id)
        .select()
        .single();

      if (updateError) {
        throw new Error(updateError.message || "Failed to update assignment");
      }

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update assignment";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { updateAssignment, loading, error };
}
