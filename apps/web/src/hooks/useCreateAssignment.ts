"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabaseBrowser";
import type { ResponseStatus } from "@/types/incident";

interface CreateAssignmentParams {
  incidentId: string;
  incidentType: 'alert' | 'report';
  responseStatus: ResponseStatus;
}

export function useCreateAssignment() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createAssignment = async ({ incidentId, incidentType, responseStatus }: CreateAssignmentParams) => {
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

      // Create assignment
      const assignmentData: {
        responder_id: string;
        response_status: ResponseStatus;
        alert_id?: string | null;
        report_id?: string | null;
      } = {
        responder_id: user.id,
        response_status: responseStatus,
        alert_id: incidentType === 'alert' ? incidentId : null,
        report_id: incidentType === 'report' ? incidentId : null,
      };

      // @ts-ignore - Supabase types may not be fully generated
      const { data, error: assignmentError } = await supabase
        .from("responder_assignments")
        .insert(assignmentData)
        .select()
        .single();

      if (assignmentError) {
        throw new Error(assignmentError.message || "Failed to create assignment");
      }

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create assignment";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { createAssignment, loading, error };
}
