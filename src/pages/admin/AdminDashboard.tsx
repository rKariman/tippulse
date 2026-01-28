import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Newspaper, Gift, Plus, Pencil, Trash2, LogOut, Search, Loader2, Database, Trophy, Users, Calendar, Clock } from "lucide-react";
import { toast } from "sonner";

// Debug widget component - shows DB counts and next 5 fixtures
function DebugWidget() {
  const { data: counts, isLoading: countsLoading } = useQuery({
    queryKey: ["admin", "db-counts"],
    queryFn: async () => {
      const [leaguesRes, teamsRes, fixturesRes] = await Promise.all([
        supabase.from("leagues").select("id", { count: "exact", head: true }),
        supabase.from("teams").select("id", { count: "exact", head: true }),
        supabase.from("fixtures").select("id", { count: "exact", head: true }),
      ]);
      
      return {
        leagues: leaguesRes.count || 0,
        teams: teamsRes.count || 0,
        fixtures: fixturesRes.count || 0,
      };
    },
  });

  const { data: nextFixtures, isLoading: fixturesLoading } = useQuery({
    queryKey: ["admin", "next-fixtures"],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("fixtures")
        .select(`
          id,
          kickoff_at,
          home_team:teams!fixtures_home_team_id_fkey(name),
          away_team:teams!fixtures_away_team_id_fkey(name),
          league:leagues!fixtures_league_id_fkey(name)
        `)
        .gte("kickoff_at", now)
        .order("kickoff_at", { ascending: true })
        .limit(5);
      
      if (error) throw error;
      return data;
    },
  });

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Rome",
    });
  };

  return (
    <div className="card-base overflow-hidden">
      <div className="bg-ink-800 text-white px-4 py-3 flex items-center gap-2">
        <Database size={18} />
        <span className="font-semibold">Database Debug</span>
      </div>
      
      <div className="p-4">
        {/* Counts */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-ink-50 rounded-lg p-3 text-center">
            <Trophy size={18} className="mx-auto text-brand-600 mb-1" />
            <div className="text-xl font-bold text-ink-900">
              {countsLoading ? "-" : counts?.leagues}
            </div>
            <div className="text-xs text-ink-500">Leagues</div>
          </div>
          <div className="bg-ink-50 rounded-lg p-3 text-center">
            <Users size={18} className="mx-auto text-brand-600 mb-1" />
            <div className="text-xl font-bold text-ink-900">
              {countsLoading ? "-" : counts?.teams}
            </div>
            <div className="text-xs text-ink-500">Teams</div>
          </div>
          <div className="bg-ink-50 rounded-lg p-3 text-center">
            <Calendar size={18} className="mx-auto text-brand-600 mb-1" />
            <div className="text-xl font-bold text-ink-900">
              {countsLoading ? "-" : counts?.fixtures}
            </div>
            <div className="text-xs text-ink-500">Fixtures</div>
          </div>
        </div>

        {/* Next 5 fixtures */}
        <div className="border-t border-ink-200 pt-3">
          <h4 className="text-sm font-semibold text-ink-700 mb-2 flex items-center gap-1">
            <Clock size={14} />
            Next 5 Fixtures
          </h4>
          
          {fixturesLoading ? (
            <div className="text-center py-4">
              <Loader2 size={20} className="animate-spin text-brand-600 mx-auto" />
            </div>
          ) : nextFixtures && nextFixtures.length > 0 ? (
            <div className="space-y-2">
              {nextFixtures.map((f) => (
                <div key={f.id} className="bg-ink-50 rounded p-2 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-ink-400">{f.league?.name || "Unknown"}</span>
                    <span className="text-ink-500">{formatTime(f.kickoff_at)}</span>
                  </div>
                  <div className="font-medium text-ink-800">
                    {f.home_team?.name || "TBD"} vs {f.away_team?.name || "TBD"}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-ink-500 text-sm py-4">
              No upcoming fixtures. Run sync to fetch data.
            </p>
          )}
        </div>

        <Link
          to="/admin/sync"
          className="mt-3 block text-center text-sm link-brand"
        >
          Go to Sync Panel →
        </Link>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [newsSearch, setNewsSearch] = useState("");
  const [freeBetsSearch, setFreeBetsSearch] = useState("");

  // Fetch news posts
  const { data: newsPosts, isLoading: newsLoading } = useQuery({
    queryKey: ["admin", "news_posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news_posts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch free bets
  const { data: freeBets, isLoading: freeBetsLoading } = useQuery({
    queryKey: ["admin", "free_bets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("free_bets")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Delete mutations
  const deleteNewsMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("news_posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "news_posts"] });
      toast.success("News post deleted");
    },
    onError: (err) => {
      toast.error("Failed to delete: " + (err as Error).message);
    },
  });

  const deleteFreeBetMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("free_bets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "free_bets"] });
      toast.success("Free bet deleted");
    },
    onError: (err) => {
      toast.error("Failed to delete: " + (err as Error).message);
    },
  });

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const filteredNews = newsPosts?.filter((post) =>
    post.title.toLowerCase().includes(newsSearch.toLowerCase())
  );

  const filteredFreeBets = freeBets?.filter((bet) =>
    bet.title.toLowerCase().includes(freeBetsSearch.toLowerCase())
  );

  return (
    <Layout>
      <div className="container py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-ink-900">Admin Dashboard</h1>
            <p className="text-sm text-ink-500">Logged in as {user?.email}</p>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut size={16} className="mr-2" />
            Sign Out
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* News Posts Section */}
          <div className="card-base overflow-hidden lg:col-span-1">
            <div className="bg-brand-800 text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Newspaper size={18} />
                <span className="font-semibold">News Posts</span>
              </div>
              <Link to="/admin/news/new">
                <Button size="sm" variant="secondary">
                  <Plus size={14} className="mr-1" />
                  New
                </Button>
              </Link>
            </div>
            
            <div className="p-4">
              <div className="relative mb-4">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                <Input
                  placeholder="Search news..."
                  value={newsSearch}
                  onChange={(e) => setNewsSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              {newsLoading ? (
                <div className="text-center py-8">
                  <Loader2 size={24} className="animate-spin text-brand-600 mx-auto" />
                </div>
              ) : filteredNews?.length === 0 ? (
                <p className="text-center py-8 text-ink-500">No news posts found</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead className="w-20">Status</TableHead>
                        <TableHead className="w-24">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredNews?.map((post) => (
                        <TableRow key={post.id}>
                          <TableCell className="font-medium truncate max-w-[200px]">
                            {post.title}
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-0.5 text-xs rounded ${
                              post.published
                                ? "bg-success-100 text-success-700"
                                : "bg-ink-100 text-ink-600"
                            }`}>
                              {post.published ? "Live" : "Draft"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Link to={`/admin/news/${post.id}`}>
                                <Button size="icon" variant="ghost" className="h-8 w-8">
                                  <Pencil size={14} />
                                </Button>
                              </Link>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive">
                                    <Trash2 size={14} />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete News Post?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will permanently delete "{post.title}". This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteNewsMutation.mutate(post.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>

          {/* Free Bets Section */}
          <div className="card-base overflow-hidden">
            <div className="bg-brand-800 text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gift size={18} />
                <span className="font-semibold">Free Bets</span>
              </div>
              <Link to="/admin/free-bets/new">
                <Button size="sm" variant="secondary">
                  <Plus size={14} className="mr-1" />
                  New
                </Button>
              </Link>
            </div>
            
            <div className="p-4">
              <div className="relative mb-4">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                <Input
                  placeholder="Search free bets..."
                  value={freeBetsSearch}
                  onChange={(e) => setFreeBetsSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              {freeBetsLoading ? (
                <div className="text-center py-8">
                  <Loader2 size={24} className="animate-spin text-brand-600 mx-auto" />
                </div>
              ) : filteredFreeBets?.length === 0 ? (
                <p className="text-center py-8 text-ink-500">No free bets found</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead className="w-20">Status</TableHead>
                        <TableHead className="w-24">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFreeBets?.map((bet) => (
                        <TableRow key={bet.id}>
                          <TableCell className="font-medium truncate max-w-[200px]">
                            {bet.title}
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-0.5 text-xs rounded ${
                              bet.published
                                ? "bg-success-100 text-success-700"
                                : "bg-ink-100 text-ink-600"
                            }`}>
                              {bet.published ? "Live" : "Draft"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Link to={`/admin/free-bets/${bet.id}`}>
                                <Button size="icon" variant="ghost" className="h-8 w-8">
                                  <Pencil size={14} />
                                </Button>
                              </Link>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive">
                                    <Trash2 size={14} />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Free Bet?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will permanently delete "{bet.title}". This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteFreeBetMutation.mutate(bet.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>

          {/* Debug Widget Section */}
          <DebugWidget />
        </div>
      </div>
    </Layout>
  );
}
