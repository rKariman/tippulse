import { useAuth } from "@/hooks/useAuth";
import { getLocalDateBoundaries } from "@/hooks/useMatchData";
import { useMemo } from "react";

interface DateFilterDebugProps {
  todayCount: number;
  tomorrowCount: number;
  upcomingCount: number;
}

export function DateFilterDebug({ todayCount, tomorrowCount, upcomingCount }: DateFilterDebugProps) {
  const { isAdmin } = useAuth();

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

  return (
    <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 text-xs font-mono text-amber-900 mb-4">
      <div className="font-semibold mb-2 text-amber-800">🛠 Admin Debug: Date Filtering</div>
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
      </div>
    </div>
  );
}
