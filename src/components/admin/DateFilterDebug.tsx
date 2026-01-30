import { useAuth } from "@/hooks/useAuth";
import { getLocalDateBoundaries } from "@/hooks/useMatchData";
import { useFixtureCounts } from "@/hooks/useFixtureCounts";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface DateFilterDebugProps {
  todayCount: number;
  tomorrowCount: number;
  upcomingCount: number;
}

// Hook to fetch last sync run
function useLastSyncRun() {
  return useQuery({
    queryKey: ["last-sync-run"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sync_runs")
        .select("*")
        .eq("job_type", "fixtures")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    staleTime: 30000,
  });
}

export function DateFilterDebug({ todayCount, tomorrowCount, upcomingCount }: DateFilterDebugProps) {
  const { isAdmin } = useAuth();
  const { data: lastSync } = useLastSyncRun();
  const { data: fixtureCounts } = useFixtureCounts();

  const boundaries = useMemo(() => getLocalDateBoundaries(), []);

  // Only show for admins
  if (!isAdmin) return null;

  const formatLocal = (date: Date) => {
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  };

  const formatSyncTime = (isoString: string | null) => {
    if (!isoString) return "Never";
    const date = new Date(isoString);
    return date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const syncParams = lastSync?.params as Record<string, unknown> | null;

  return (
    <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 text-xs font-mono text-amber-900 mb-4">
      <div className="font-semibold mb-2 text-amber-800">🛠 Admin Debug: Date Filtering & Sync</div>
      
      {/* Last Sync Info */}
      <div className="bg-amber-100 rounded p-2 mb-3">
        <div className="font-semibold text-amber-700 mb-1">Last Sync Run</div>
        <div className="grid gap-1">
          <div>
            <span className="text-amber-600">Time:</span> {formatSyncTime(lastSync?.created_at ?? null)}
          </div>
          <div>
            <span className="text-amber-600">Range:</span>{" "}
            {syncParams?.dateFrom as string || "?"} → {syncParams?.dateTo as string || "?"}
          </div>
          <div>
            <span className="text-amber-600">Upserted:</span>{" "}
            {lastSync?.upserted_fixtures ?? 0} fixtures, {lastSync?.upserted_teams ?? 0} teams
          </div>
          {lastSync?.error && (
            <div className="text-red-600">Error: {lastSync.error}</div>
          )}
        </div>
      </div>

      {/* Client Timezone Info */}
      <div className="grid gap-1">
        <div>
          <span className="text-amber-600">User Local Date:</span> {boundaries.localDate}
        </div>
        <div>
          <span className="text-amber-600">Today Start (Local):</span> {formatLocal(boundaries.todayStartLocal)}
        </div>
        <div>
          <span className="text-amber-600">Today Start (UTC):</span> {boundaries.todayStart}
        </div>
        <div>
          <span className="text-amber-600">Tomorrow Start (UTC):</span> {boundaries.tomorrowStart}
        </div>
        
        {/* Counts */}
        <div className="border-t border-amber-200 pt-2 mt-2 grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-lg font-bold">{todayCount}</div>
            <div className="text-amber-600">Today</div>
          </div>
          <div>
            <div className="text-lg font-bold">{tomorrowCount}</div>
            <div className="text-amber-600">Tomorrow</div>
          </div>
          <div>
            <div className="text-lg font-bold">{upcomingCount}</div>
            <div className="text-amber-600">Upcoming</div>
          </div>
        </div>

        {/* Next 5 Fixtures */}
        {fixtureCounts?.nextFixtures && fixtureCounts.nextFixtures.length > 0 && (
          <div className="border-t border-amber-200 pt-2 mt-2">
            <div className="font-semibold text-amber-700 mb-1">Next 5 Fixtures</div>
            <div className="space-y-1">
              {fixtureCounts.nextFixtures.map((f) => (
                <div key={f.id} className="text-xs">
                  <span className="text-amber-500">{new Date(f.kickoffAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>{" "}
                  {f.homeTeam} vs {f.awayTeam}{" "}
                  <span className="text-amber-400">({f.leagueName})</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
