"use client";

import { useEffect } from "react";
import { getSupabaseBrowser } from "./supabaseClient";

export interface RealtimeNoteEvent {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new?: Record<string, any>;
  old?: Record<string, any>;
}

export function useSupabaseRealtime(
  campaignId: string,
  onNoteChange: (event: RealtimeNoteEvent) => void
) {
  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase || !campaignId) return;

    const channel = supabase
      .channel(`campaign-notes-${campaignId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notes",
          filter: `campaign_id=eq.${campaignId}`,
        },
        (payload) => {
          onNoteChange({
            eventType: payload.eventType as "INSERT" | "UPDATE" | "DELETE",
            new: payload.new as Record<string, any>,
            old: payload.old as Record<string, any>,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaignId, onNoteChange]);
}
