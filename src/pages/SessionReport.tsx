import { useEffect, useState } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import DashboardNav from "@/components/DashboardNav";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Progress as ProgressBar } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { progressAPI } from "@/lib/api";

const SessionReport = () => {
  const { sessionId } = useParams();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const run = async () => {
      try {
        // Use passed state if available to avoid extra fetch
        if (location.state) {
          setData(location.state);
          setLoading(false);
        }
        if (!sessionId) { setLoading(false); return; }
        const resp = await progressAPI.getSessionAnalytics(sessionId);
        setData(resp.data);
      } catch {
        if (!location.state) setData(null);
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav />
      <main className="container mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Session Report</h1>
            <p className="text-gray-600">Detailed analytics for this interview session</p>
          </div>
          <Link to="/progress" className="text-sm text-blue-600">Back to Progress (Click to see updated stats)</Link>
        </div>

        {loading && <p className="text-sm text-gray-500">Loading...</p>}
        {!loading && !data && <p className="text-sm text-gray-500">No data available.</p>}

        {data && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>{data.sessionInfo?.jobTitle ?? data.session?.jobTitle ?? 'Interview'}</CardTitle>
                <CardDescription>
                  {new Date(data.sessionInfo?.date ?? data.session?.createdAt ?? Date.now()).toLocaleString()} • {(data.sessionInfo?.answeredQuestions ?? data.session?.sessionAnalytics?.answeredQuestions ?? 0)}/{(data.sessionInfo?.totalQuestions ?? data.session?.sessionAnalytics?.totalQuestions ?? 0)} answered
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">{data.performanceMetrics?.overallScore ?? data.session?.performanceMetrics?.overallScore ?? 0}%</div>
                    <p className="text-sm text-gray-600">Overall</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">{data.performanceMetrics?.communicationScore ?? data.session?.performanceMetrics?.communicationScore ?? 0}%</div>
                    <p className="text-sm text-gray-600">Communication</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600">{data.performanceMetrics?.technicalScore ?? data.session?.performanceMetrics?.technicalScore ?? 0}%</div>
                    <p className="text-sm text-gray-600">Technical</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-orange-600">{data.performanceMetrics?.confidenceScore ?? data.session?.performanceMetrics?.confidenceScore ?? 0}%</div>
                    <p className="text-sm text-gray-600">Confidence</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Question Breakdown</CardTitle>
                <CardDescription>Scores and categories per question</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(data?.detailedFeedback?.questionBreakdown ?? data?.session?.feedbackLogIds ?? []).map((q: any, idx: number) => (
                    <div key={idx} className="p-3 rounded-md border bg-white flex items-center justify-between">
                      <div className="pr-4">
                        <p className="font-medium text-gray-900">{q.question ?? q?.userQuestion ?? 'Question'}</p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-gray-600">
                          <Badge variant="secondary">{q.category ?? q?.questionCategory ?? 'general'}</Badge>
                          <Badge variant="outline">{q.difficulty ?? 'medium'}</Badge>
                        </div>
                      </div>
                      <div className="w-48">
                        <ProgressBar value={q.score ?? 0} />
                        <div className="text-right text-xs text-gray-500 mt-1">{q.score ?? 0}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
};

export default SessionReport;
