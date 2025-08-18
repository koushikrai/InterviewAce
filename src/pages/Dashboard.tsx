
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Upload, MessageSquare, BarChart3, FileText, Play, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import DashboardNav from "@/components/DashboardNav";
import { authAPI, progressAPI } from "@/lib/api";

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string>("User");
  const [stats, setStats] = useState({
    resumesAnalyzed: 0,
    interviewsSessions: 0,
    overallScore: 0,
    improvementRate: 0,
  });
  const [recentSessions, setRecentSessions] = useState<Array<{ id: string; role: string; score: number; date: string; duration?: string }>>([]);

  useEffect(() => {
    const run = async () => {
      try {
        const me = await authAPI.me();
        const user = me?.data?.user ?? me?.data ?? {};
        const userId = user?._id ?? user?.id ?? null;
        if (user?.name) setUserName(user.name);
        if (!userId) { setLoading(false); return; }
        const progress = await progressAPI.getUserProgress(userId, '30d');
        const p = progress.data;
        const totalSessions = p?.overallProgress?.totalInterviews ?? 0;
        const averageScore = p?.overallProgress?.averageScore ?? 0;
        const improvement = p?.overallProgress?.improvementRate ?? 0;
        const resumesAnalyzed = p?.resumesAnalyzed ?? p?.overallProgress?.resumesAnalyzed ?? 0;
        setStats({ resumesAnalyzed, interviewsSessions: totalSessions, overallScore: averageScore, improvementRate: improvement });
        const sessions = (p?.recentSessions ?? []).map((s: { id?: string; _id?: string; jobTitle?: string; date?: string; overallScore?: number }) => ({
          id: String(s.id ?? s._id ?? ''),
          role: s.jobTitle ?? 'Interview',
          score: s.overallScore ?? 0,
          date: new Date(s.date ?? Date.now()).toISOString().slice(0, 10),
          duration: undefined,
        }));
        setRecentSessions(sessions);
      } catch {
        // Keep defaults on error
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav />
      
      <main className="container mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome back, {userName}!</h1>
          <p className="text-gray-600">Ready to continue your interview preparation journey?</p>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Link to="/upload">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-dashed border-blue-200 hover:border-blue-400">
              <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                <Upload className="w-12 h-12 text-blue-600 mb-3" />
                <h3 className="font-semibold text-gray-900">Upload Resume</h3>
                <p className="text-sm text-gray-600 mt-1">Analyze & optimize</p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/interview">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-dashed border-purple-200 hover:border-purple-400">
              <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                <Play className="w-12 h-12 text-purple-600 mb-3" />
                <h3 className="font-semibold text-gray-900">Start Interview</h3>
                <p className="text-sm text-gray-600 mt-1">Practice with AI</p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/progress">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                <BarChart3 className="w-12 h-12 text-green-600 mb-3" />
                <h3 className="font-semibold text-gray-900">View Progress</h3>
                <p className="text-sm text-gray-600 mt-1">Track improvement</p>
              </CardContent>
            </Card>
          </Link>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="flex flex-col items-center justify-center p-6 text-center">
              <Plus className="w-12 h-12 text-orange-600 mb-3" />
              <h3 className="font-semibold text-gray-900">Explore Features</h3>
              <p className="text-sm text-gray-600 mt-1">Discover more</p>
            </CardContent>
          </Card>
        </div>

        {/* Stats Overview */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Resumes Analyzed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.resumesAnalyzed}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Interview Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats.interviewsSessions}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Overall Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.overallScore}%</div>
              <Progress value={stats.overallScore} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Improvement</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">+{stats.improvementRate}%</div>
              <p className="text-sm text-gray-600 mt-1">This period</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Sessions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Recent Interview Sessions
            </CardTitle>
            <CardDescription>Your latest practice sessions and scores</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentSessions.length === 0 && !loading && (
                <p className="text-sm text-gray-500">No sessions yet.</p>
              )}
              {recentSessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{session.role}</h4>
                      <p className="text-sm text-gray-600">{session.date}{session.duration ? ` • ${session.duration}` : ''}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-green-600">{session.score}%</div>
                    <Link to={`/session/${session.id}`}>
                      <Button variant="ghost" size="sm">View Details</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 text-center">
              <Link to="/interview">
                <Button>Start New Interview</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;
