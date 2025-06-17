
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress as ProgressBar } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Target, Calendar, Award } from "lucide-react";
import DashboardNav from "@/components/DashboardNav";

const Progress = () => {
  const overallStats = {
    totalSessions: 15,
    averageScore: 78,
    improvement: 23,
    streak: 7
  };

  const skillBreakdown = [
    { skill: "Communication", current: 85, target: 90, improvement: 15 },
    { skill: "Technical Knowledge", current: 72, target: 85, improvement: 8 },
    { skill: "Problem Solving", current: 80, target: 88, improvement: 20 },
    { skill: "Leadership", current: 68, target: 80, improvement: 12 },
    { skill: "Confidence", current: 82, target: 90, improvement: 18 }
  ];

  const recentSessions = [
    { id: 1, date: "2024-01-15", role: "Software Engineer", score: 85, duration: "15 min", improvement: "+8%" },
    { id: 2, date: "2024-01-14", role: "Product Manager", score: 72, duration: "12 min", improvement: "+5%" },
    { id: 3, date: "2024-01-13", role: "Data Scientist", score: 79, duration: "18 min", improvement: "+12%" },
    { id: 4, date: "2024-01-12", role: "Software Engineer", score: 77, duration: "14 min", improvement: "+3%" },
    { id: 5, date: "2024-01-11", role: "Product Manager", score: 68, duration: "16 min", improvement: "+7%" }
  ];

  const achievements = [
    { id: 1, title: "First Interview", description: "Completed your first mock interview", earned: true, date: "2024-01-08" },
    { id: 2, title: "Streak Master", description: "Practiced for 7 consecutive days", earned: true, date: "2024-01-15" },
    { id: 3, title: "Score Improver", description: "Improved score by 20% in one month", earned: true, date: "2024-01-12" },
    { id: 4, title: "Multi-Role Expert", description: "Practice 5 different job roles", earned: false, progress: 3 },
    { id: 5, title: "Perfect Score", description: "Achieve a score of 95% or higher", earned: false, progress: 85 }
  ];

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
                {skillBreakdown.map((skill) => (
                  <div key={skill.skill} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{skill.skill}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-600">
                          {skill.current}% / {skill.target}%
                        </span>
                        <Badge variant="secondary" className="text-green-600">
                          +{skill.improvement}%
                        </Badge>
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
                <CardDescription>
                  Your latest interview practice sessions and scores
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentSessions.map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <TrendingUp className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{session.role}</h4>
                          <p className="text-sm text-gray-600">{session.date} • {session.duration}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg font-semibold">{session.score}%</span>
                          <Badge variant="secondary" className="text-green-600">
                            {session.improvement}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500">vs last session</p>
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
                <CardDescription>
                  Unlock badges and celebrate your milestones
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {achievements.map((achievement) => (
                    <div 
                      key={achievement.id} 
                      className={`p-4 rounded-lg border-2 ${
                        achievement.earned 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          achievement.earned ? 'bg-green-600' : 'bg-gray-400'
                        }`}>
                          <Award className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{achievement.title}</h4>
                          {achievement.earned && (
                            <p className="text-xs text-green-600">Earned on {achievement.date}</p>
                          )}
                        </div>
                        {achievement.earned && (
                          <Badge className="bg-green-600">Earned</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{achievement.description}</p>
                      {!achievement.earned && achievement.progress && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span>Progress</span>
                            <span>{achievement.progress}/{achievement.id === 4 ? 5 : 95}</span>
                          </div>
                          <ProgressBar 
                            value={achievement.id === 4 ? (achievement.progress / 5) * 100 : (achievement.progress / 95) * 100} 
                            className="h-1"
                          />
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
