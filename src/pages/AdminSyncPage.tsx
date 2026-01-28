import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, RefreshCw, Calendar, Shield } from "lucide-react";

interface SyncRun {
  id: string;
  created_at: string;
  job_type: string;
  provider: string;
  params: Record<string, unknown>;
  success: boolean;
  upserted_leagues: number;
  upserted_teams: number;
  upserted_fixtures: number;
  error: string | null;
}

interface League {
  id: string;
  name: string;
  external_id: string | null;
}

export default function AdminSyncPage() {
  const [syncToken, setSyncToken] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [syncRuns, setSyncRuns] = useState<SyncRun[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().split("T")[0]);
  const [dateTo, setDateTo] = useState(
    new Date(Date.now() + 86400000).toISOString().split("T")[0]
  );
  const [selectedLeague, setSelectedLeague] = useState<string>("");
  const { toast } = useToast();

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  useEffect(() => {
    if (isAuthenticated) {
      fetchSyncRuns();
      fetchLeagues();
    }
  }, [isAuthenticated]);

  const fetchSyncRuns = async () => {
    const { data, error } = await supabase
      .from("sync_runs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (!error && data) {
      setSyncRuns(data as SyncRun[]);
    }
  };

  const fetchLeagues = async () => {
    const { data, error } = await supabase
      .from("leagues")
      .select("id, name, external_id")
      .order("name");

    if (!error && data) {
      setLeagues(data as League[]);
    }
  };

  const handleAuth = () => {
    if (syncToken.length > 10) {
      setIsAuthenticated(true);
    } else {
      toast({
        title: "Invalid token",
        description: "Please enter a valid sync admin token.",
        variant: "destructive",
      });
    }
  };

  const callSyncEndpoint = async (
    endpoint: string,
    body?: Record<string, unknown>
  ) => {
    setLoading(true);
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-sync-token": syncToken,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Sync failed");
      }

      toast({
        title: "Sync completed",
        description: `Leagues: ${result.upsertedLeagues}, Teams: ${result.upsertedTeams}, Fixtures: ${result.upsertedFixtures}`,
      });

      fetchSyncRuns();
    } catch (error) {
      toast({
        title: "Sync failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSyncToday = () => callSyncEndpoint("sync-today");

  const handleSyncLeagues = () => callSyncEndpoint("sync-leagues");

  const handleSyncFixtures = () => {
    const body: Record<string, unknown> = { dateFrom, dateTo };
    if (selectedLeague) {
      body.leagueId = selectedLeague;
    }
    callSyncEndpoint("sync-fixtures", body);
  };

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="container py-12 max-w-md">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Admin Authentication
              </CardTitle>
              <CardDescription>
                Enter your sync admin token to access the sync dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="token">Sync Admin Token</Label>
                <Input
                  id="token"
                  type="password"
                  value={syncToken}
                  onChange={(e) => setSyncToken(e.target.value)}
                  placeholder="Enter your token"
                  onKeyDown={(e) => e.key === "Enter" && handleAuth()}
                />
              </div>
              <Button onClick={handleAuth} className="w-full">
                Authenticate
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-ink-900">Data Sync Dashboard</h1>
            <p className="text-ink-500 text-sm">
              Manage match data synchronization from Football-Data.org
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSyncRuns}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Quick Sync */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Sync</CardTitle>
              <CardDescription>
                Sync leagues, teams, and fixtures for today & tomorrow
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleSyncToday}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Calendar className="h-4 w-4 mr-2" />
                )}
                Sync Today + Tomorrow
              </Button>
            </CardContent>
          </Card>

          {/* Sync Leagues */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Sync Leagues</CardTitle>
              <CardDescription>
                Fetch and update all default leagues and teams
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleSyncLeagues}
                disabled={loading}
                variant="secondary"
                className="w-full"
              >
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Sync Leagues & Teams
              </Button>
            </CardContent>
          </Card>

          {/* Sync Fixtures by Date */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Sync Fixtures</CardTitle>
              <CardDescription>Sync fixtures for a date range</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="dateFrom" className="text-xs">
                    From
                  </Label>
                  <Input
                    id="dateFrom"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="dateTo" className="text-xs">
                    To
                  </Label>
                  <Input
                    id="dateTo"
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="league" className="text-xs">
                  League (optional)
                </Label>
                <Select value={selectedLeague} onValueChange={setSelectedLeague}>
                  <SelectTrigger>
                    <SelectValue placeholder="All leagues" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All leagues</SelectItem>
                    {leagues.map((league) => (
                      <SelectItem
                        key={league.id}
                        value={league.external_id || league.id}
                      >
                        {league.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleSyncFixtures}
                disabled={loading}
                variant="secondary"
                className="w-full"
              >
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Sync Fixtures
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Sync History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sync History</CardTitle>
            <CardDescription>Recent synchronization runs</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Leagues</TableHead>
                  <TableHead className="text-right">Teams</TableHead>
                  <TableHead className="text-right">Fixtures</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {syncRuns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-ink-500">
                      No sync runs yet. Start by clicking "Sync Today + Tomorrow".
                    </TableCell>
                  </TableRow>
                ) : (
                  syncRuns.map((run) => (
                    <TableRow key={run.id}>
                      <TableCell className="text-sm text-ink-600">
                        {new Date(run.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{run.job_type}</Badge>
                      </TableCell>
                      <TableCell>
                        {run.success ? (
                          <Badge className="bg-success-500">Success</Badge>
                        ) : (
                          <Badge variant="destructive">Failed</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {run.upserted_leagues}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {run.upserted_teams}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {run.upserted_fixtures}
                      </TableCell>
                      <TableCell className="text-sm text-danger-500 max-w-[200px] truncate">
                        {run.error || "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
