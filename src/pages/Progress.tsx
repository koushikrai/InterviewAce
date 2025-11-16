
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress as ProgressBar } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Target, Calendar, Award } from "lucide-react";
import DashboardNav from "@/components/DashboardNav";
import { progressAPI, authAPI } from "@/lib/api";
import { Link } from "react-router-dom";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";

interface SkillItem { skill: string; current: number; target: number; improvement: number }
interface RecentSession { id: string; date: string; role: string; score: number; duration?: string; improvement?: string }

// Calculate day streak from recent sessions
function calculateDayStreak(sessions: Array<{ date?: string; _id?: string }>) {
  if (!sessions || sessions.length === 0) return 0;
  
  const dates = sessions
    .map(s => {
      const dateStr = s.date || new Date().toISOString();
      return new Date(dateStr).toISOString().slice(0, 10);
    })
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  for (let i = 0; i < dates.length; i++) {
    const sessionDate = new Date(dates[i]);
    sessionDate.setHours(0, 0, 0, 0);
    const expectedDate = new Date(today);
    expectedDate.setDate(expectedDate.getDate() - i);
    
    if (sessionDate.getTime() === expectedDate.getTime()) {
      streak++;
    } else {
      break;
    }
  }
  
  return streak;
}

const Progress = () => {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [overallStats, setOverallStats] = useState({ totalSessions: 0, averageScore: 0, improvement: 0, streak: 0 });
  const [skillBreakdown, setSkillBreakdown] = useState<SkillItem[]>([]);
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);

  useEffect(() => {
    const run = async () => {
      try {
        const me = await authAPI.me();
        const id = me?.data?.user?._id ?? me?.data?._id ?? null;
        if (!id) { 
          console.warn('No user ID found');
          setLoading(false); 
          return; 
        }
        setUserId(id);
        
        console.log('Fetching progress for user:', id);
        const progressResp = await progressAPI.getUserProgress(id, '30d');
        const p = progressResp.data;
        
        console.log('Progress response:', p);
        
        const totalSessions = p?.overallProgress?.totalInterviews ?? 0;
        const averageScore = p?.overallProgress?.averageScore ?? 0;
        const improvement = p?.overallProgress?.improvementRate ?? 0;
        const streak = calculateDayStreak(p?.recentSessions ?? []) ?? 0;
        
        // Map skill breakdown
        const skills: SkillItem[] = [];
        if (p?.skillBreakdown) {
          if (p.skillBreakdown.communication) skills.push({ skill: 'Communication', current: p.skillBreakdown.communication.score ?? 0, target: 90, improvement: 0 });
          if (p.skillBreakdown.technical) skills.push({ skill: 'Technical Knowledge', current: p.skillBreakdown.technical.score ?? 0, target: 85, improvement: 0 });
          if (p.skillBreakdown.behavioral) skills.push({ skill: 'Behavioral', current: p.skillBreakdown.behavioral.score ?? 0, target: 85, improvement: 0 });
        }
        
        // Recent sessions
        const sessions: RecentSession[] = (p?.recentSessions ?? []).map((s: { id?: string; _id?: string; jobTitle?: string; date?: string; overallScore?: number }) => ({
          id: String(s.id ?? s._id ?? ''),
          date: new Date(s.date || Date.now()).toISOString().slice(0, 10),
          role: s.jobTitle ?? 'Interview',
          score: s.overallScore ?? 0,
          duration: undefined,
          improvement: undefined,
        }));
        
        console.log('Updating state with:', { totalSessions, averageScore, improvement, streak });
        setOverallStats({ totalSessions, averageScore, improvement, streak });
        setSkillBreakdown(skills);
        setRecentSessions(sessions);
      } catch (error) {
        console.error('Error fetching progress:', error);
        // Keep defaults on error
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, []);

  const achievements = [
    { id: 1, title: "First Interview", description: "Completed your first mock interview", earned: (overallStats.totalSessions > 0), date: new Date().toISOString().slice(0,10) },
    { id: 2, title: "Streak Master", description: "Practiced for 7 consecutive days", earned: false, date: "" },
    { id: 3, title: "Score Improver", description: "Improved score by 20% in one month", earned: false, date: "" },
    { id: 4, title: "Multi-Role Expert", description: "Practice 5 different job roles", earned: false, progress: Math.min(overallStats.totalSessions, 5) },
    { id: 5, title: "Perfect Score", description: "Achieve a score of 95% or higher", earned: overallStats.averageScore >= 95, progress: overallStats.averageScore }
  ];

  const trendData = recentSessions.map(s => ({ date: s.date, score: s.score }));
  const memoTrend = trendData; // small list; if it grows, wrap with useMemo

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav />
      
      <main className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Progress Tracking</h1>
          <p className="text-gray-600">Monitor your improvement and celebrate your achievements</p>
        </div>

        {/* Overall Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">{overallStats.totalSessions}</div>
              <p className="text-sm text-gray-600">Total Sessions</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">{overallStats.averageScore}%</div>
              <p className="text-sm text-gray-600">Average Score</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">+{overallStats.improvement}%</div>
              <p className="text-sm text-gray-600">Improvement</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-orange-600 mb-2">{overallStats.streak}</div>
              <p className="text-sm text-gray-600">Day Streak</p>
            </CardContent>
          </Card>
        </div>

        {/* Trend Chart */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Score Trend</CardTitle>
            <CardDescription>Recent session scores over time</CardDescription>
          </CardHeader>
          <CardContent>
            {trendData.length === 0 ? (
              <p className="text-sm text-gray-500">No data yet.</p>
            ) : (
              <ChartContainer config={{ score: { label: 'Score', color: 'hsl(var(--primary))' } }}>
                <LineChart data={memoTrend as Array<{ date: string; score: number }>}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="score" stroke="var(--color-score)" strokeWidth={2} dot={false} />
                </LineChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="skills" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="skills">Skill Breakdown</TabsTrigger>
            <TabsTrigger value="sessions">Session History</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
          </TabsList>

          <TabsContent value="skills" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Skill Development
                </CardTitle>
                <CardDescription>
                  Track your progress across different interview skills
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {skillBreakdown.length === 0 && (
                  <p className="text-sm text-gray-500">No data yet. Complete an interview to see your skill breakdown.</p>
                )}
                {skillBreakdown.map((skill) => (
                  <div key={skill.skill} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{skill.skill}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-600">{skill.current}% / {skill.target}%</span>
                        <Badge variant="secondary" className="text-green-600">+{skill.improvement}%</Badge>
                      </div>
                    </div>
                    <ProgressBar value={skill.current} className="h-2" />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Current: {skill.current}%</span>
                      <span>Target: {skill.target}%</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sessions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Recent Sessions
                </CardTitle>
                <CardDescription>Your latest interview practice sessions and scores</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentSessions.length === 0 && (
                    <p className="text-sm text-gray-500">No sessions yet.</p>
                  )}
                  {recentSessions.map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <TrendingUp className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{session.role}</h4>
                          <p className="text-sm text-gray-600">{session.date}{session.duration ? ` • ${session.duration}` : ''}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold">{session.score}%</div>
                        <Badge variant="secondary" className="text-green-600">Score</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="achievements" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Achievements
                </CardTitle>
                <CardDescription>Unlock badges and celebrate your milestones</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {achievements.map((achievement) => (
                    <div key={achievement.id} className={`p-4 rounded-lg border-2 ${achievement.earned ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`${achievement.earned ? 'bg-green-600' : 'bg-gray-400'} w-8 h-8 rounded-full flex items-center justify-center`}>
                          <Award className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{achievement.title}</h4>
                          {achievement.earned && (
                            <p className="text-xs text-green-600">{achievement.date ? `Earned on ${achievement.date}` : 'Earned'}</p>
                          )}
                        </div>
                        {achievement.earned && <Badge className="bg-green-600">Earned</Badge>}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{achievement.description}</p>
                      {!achievement.earned && (achievement as { progress?: number }).progress && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span>Progress</span>
                            <span>{(achievement as { progress?: number }).progress}/{achievement.id === 4 ? 5 : 95}</span>
                          </div>
                          <ProgressBar value={achievement.id === 4 ? (((achievement as { progress?: number }).progress || 0) / 5) * 100 : (((achievement as { progress?: number }).progress || 0) / 95) * 100} className="h-1" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Progress;
