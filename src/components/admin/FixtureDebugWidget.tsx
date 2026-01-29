import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useFixtureCounts } from "@/hooks/useFixtureCounts";
import { Loader2, Database, Calendar } from "lucide-react";

export function FixtureDebugWidget() {
  const { data: counts, isLoading, error } = useFixtureCounts();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Database className="h-4 w-4" />
            Fixture Debug
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Database className="h-4 w-4" />
            Fixture Debug
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive text-sm">Error loading counts</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Database className="h-4 w-4" />
          Fixture Debug
        </CardTitle>
        <CardDescription>
          Live fixture counts from database (client local timezone)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Counts Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-muted rounded-lg p-3 text-center">
            <div className="text-2xl font-bold">{counts?.todayCount ?? 0}</div>
            <div className="text-xs text-muted-foreground">Today</div>
          </div>
          <div className="bg-muted rounded-lg p-3 text-center">
            <div className="text-2xl font-bold">{counts?.tomorrowCount ?? 0}</div>
            <div className="text-xs text-muted-foreground">Tomorrow</div>
          </div>
          <div className="bg-muted rounded-lg p-3 text-center">
            <div className="text-2xl font-bold">{counts?.upcomingCount ?? 0}</div>
            <div className="text-xs text-muted-foreground">Upcoming</div>
          </div>
          <div className="bg-muted rounded-lg p-3 text-center">
            <div className="text-2xl font-bold">{counts?.next7DaysCount ?? 0}</div>
            <div className="text-xs text-muted-foreground">Next 7 Days</div>
          </div>
        </div>

        {/* By League */}
        {counts?.byLeague && counts.byLeague.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">By League</h4>
            <div className="flex flex-wrap gap-2">
              {counts.byLeague.map((l) => (
                <Badge key={l.leagueId} variant="secondary">
                  {l.leagueName}: {l.count}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Next 5 Fixtures */}
        {counts?.nextFixtures && counts.nextFixtures.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Next 5 Fixtures
            </h4>
            <div className="space-y-2 text-sm">
              {counts.nextFixtures.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center justify-between bg-muted/50 rounded px-3 py-2"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {f.homeTeam} vs {f.awayTeam}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {f.leagueName}
                    </div>
                  </div>
                  <div className="text-right text-xs shrink-0 ml-2">
                    <div>
                      {new Date(f.kickoffAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                    <div className="text-muted-foreground">
                      {new Date(f.kickoffAt).toLocaleTimeString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {counts?.next7DaysCount === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No fixtures in next 7 days. Run sync to fetch matches.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
