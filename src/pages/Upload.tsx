
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Upload as UploadIcon, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import DashboardNav from "@/components/DashboardNav";
import { resumeAPI } from "@/lib/api";
import { withApiFallback } from "@/lib/apiFallback";
import type { AxiosResponse } from "axios";

const Upload = () => {
  const [uploadStep, setUploadStep] = useState<'upload' | 'analyzing' | 'results'>('upload');
  const [analysisProgress, setAnalysisProgress] = useState(0);
  type AnalysisResults = {
    score: number;
    strengths: string[];
    improvements: string[];
    keywordMatch?: number;
    suggestions: string[];
    skillGaps?: string[];
    atsScore?: {
      overall: number;
      technical: number;
      soft: number;
      formatting: number;
    };
    jobMatch?: {
      skillsMatch: number;
      experienceMatch: boolean;
      educationMatch: boolean;
      overallMatch: boolean;
    };
    note?: string;
  };
  const [analysisResults, setAnalysisResults] = useState<AnalysisResults | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [isComposingJD, setIsComposingJD] = useState(false);

  const { toast } = useToast();

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      toast({
        title: "Resume required",
        description: "Please select a file to upload.",
        variant: "destructive",
      });
      return;
    }

    const runSimulation = () => {
      setUploadStep('analyzing');
      const interval = setInterval(() => {
        setAnalysisProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setUploadStep('results');
            setAnalysisResults({
              score: 78,
              strengths: [
                "Strong technical skills section",
                "Clear work experience progression", 
                "Relevant education background"
              ],
              improvements: [
                "Add more quantifiable achievements",
                "Include relevant keywords for the target role",
                "Expand on project descriptions"
              ],
              keywordMatch: 65,
              suggestions: [
                "Add 'React.js' and 'Node.js' to skills section",
                "Include metrics in job descriptions (e.g., 'Improved performance by 25%')",
                "Add a professional summary section"
              ]
            });
            return 100;
          }
          return prev + 10;
        });
      }, 300);
    };

    try {
      // Try real API path first
      const formData = new FormData();
      formData.append('resume', selectedFile);

      type UploadResponse = { id?: string; resumeId?: string };
      const uploadResponse = await withApiFallback<AxiosResponse<UploadResponse> | null>(
        () => resumeAPI.upload(formData) as Promise<AxiosResponse<UploadResponse>>,
        null,
        {
          isUnreachable: (error: unknown) => {
            const hasResponse = typeof error === 'object' && error !== null && 'response' in error;
            const status = hasResponse ? (error as { response?: { status?: number } }).response?.status : undefined;
            return !hasResponse || status === 404 || status === 501 || status === 503;
          },
        }
      );

      if (!uploadResponse) {
        runSimulation();
        return;
      }

      const uploadedId = uploadResponse.data.id ?? uploadResponse.data.resumeId ?? "";

      const analyzeResponse = await withApiFallback<AxiosResponse<AnalysisResults> | null>(
        () => resumeAPI.analyze(uploadedId, jobDescription) as Promise<AxiosResponse<AnalysisResults>>,
        null,
        {
          isUnreachable: (error: unknown) => {
            const hasResponse = typeof error === 'object' && error !== null && 'response' in error;
            const status = hasResponse ? (error as { response?: { status?: number } }).response?.status : undefined;
            return !hasResponse || status === 404 || status === 501 || status === 503;
          },
        }
      );

      if (!analyzeResponse || typeof analyzeResponse.data?.score !== 'number') {
        runSimulation();
        return;
      }

      setUploadStep('analyzing');
      setAnalysisProgress(100);
      setAnalysisResults(analyzeResponse.data);
      setUploadStep('results');
    } catch (error) {
      runSimulation();
    }
  };

  const UploadForm = () => (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UploadIcon className="w-5 h-5" />
          Resume Analysis
        </CardTitle>
        <CardDescription>
          Upload your resume and optionally a job description for personalized feedback
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleFileUpload} noValidate className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="resume">Resume (PDF, DOCX)</Label>
            {/* <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
              <UploadIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" /> */}
              <div className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              selectedFile 
                ? 'border-green-400 bg-green-50' 
                : 'border-gray-300 hover:border-blue-400'
            }`}>
              {selectedFile ? (
                <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
              ) : (
                <UploadIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              )}
              <Input
                id="resume"
                name="resume"
                type="file"
                accept=".pdf,.docx,.doc"
                className="hidden"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
              <Label htmlFor="resume" className="cursor-pointer">
                {/* <span className="text-blue-600 hover:text-blue-800">Click to upload resume</span>
                <span className="text-gray-600"> or drag and drop</span> */}
                {selectedFile ? (
                  <span className="text-green-600 font-medium">File uploaded: {selectedFile.name}</span>
                ) : (
                  <>
                    <span className="text-blue-600 hover:text-blue-800">Click to upload resume</span>
                    <span className="text-gray-600"> or drag and drop</span>
                  </>
                )}
              </Label>
              <p className="text-sm text-gray-500 mt-2">PDF, DOCX up to 10MB</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="jobDescription">Job Description (Optional)</Label>
            <Textarea
              id="jobDescription"
              placeholder="Paste the job description here to get targeted feedback..."
              rows={6}
              className="resize-none"
              value={jobDescription}
              onChange={(e) => { if (!isComposingJD) setJobDescription(e.target.value); }}
              onCompositionStart={() => setIsComposingJD(true)}
              onCompositionEnd={(e) => { setIsComposingJD(false); setJobDescription((e.target as HTMLTextAreaElement).value); }}
              onInput={(e) => { if (!isComposingJD) setJobDescription((e.target as HTMLTextAreaElement).value); }}
            />
            <p className="text-sm text-gray-500">
              Adding a job description helps us provide more targeted suggestions
            </p>
          </div>

          <Button type="submit" className="w-full">
            Analyze Resume
          </Button>
        </form>
      </CardContent>
    </Card>
  );

  const AnalyzingView = () => (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-center">Analyzing Your Resume</CardTitle>
        <CardDescription className="text-center">
          Our AI is reviewing your resume and generating personalized feedback
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Analysis Progress</span>
            <span>{analysisProgress}%</span>
          </div>
          <Progress value={analysisProgress} className="w-full" />
        </div>
        <div className="text-center text-sm text-gray-600">
          {analysisProgress < 30 && "Parsing resume content..."}
          {analysisProgress >= 30 && analysisProgress < 60 && "Analyzing skills and experience..."}
          {analysisProgress >= 60 && analysisProgress < 90 && "Generating recommendations..."}
          {analysisProgress >= 90 && "Finalizing results..."}
        </div>
      </CardContent>
    </Card>
  );

  const ResultsView = () => (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Overall Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Resume Analysis Complete
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="text-4xl font-bold text-blue-600">{analysisResults.score}%</div>
            <div>
              <p className="text-lg font-semibold">Overall Resume Score</p>
              <p className="text-gray-600">
                {analysisResults.score >= 80 ? 'Excellent! Your resume is well-optimized' :
                 analysisResults.score >= 60 ? 'Good foundation with room for improvement' :
                 'Needs significant improvement to pass ATS screening'}
              </p>
            </div>
          </div>
          <Progress value={analysisResults.score} className="w-full" />
          
          {/* ATS Score Breakdown */}
          {analysisResults.atsScore && (
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-lg font-bold text-blue-600">{analysisResults.atsScore.overall}%</div>
                <div className="text-xs text-gray-600">Overall</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-lg font-bold text-green-600">{analysisResults.atsScore.technical}%</div>
                <div className="text-xs text-gray-600">Technical</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-lg font-bold text-purple-600">{analysisResults.atsScore.soft}%</div>
                <div className="text-xs text-gray-600">Soft Skills</div>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <div className="text-lg font-bold text-orange-600">{analysisResults.atsScore.formatting}%</div>
                <div className="text-xs text-gray-600">Formatting</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Job Matching Analysis */}
      {analysisResults.jobMatch && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-blue-600" />
              Job Requirements Match
            </CardTitle>
            <CardDescription>
              How well your resume aligns with the job description
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Skills Match</span>
                  <span className="text-lg font-bold text-blue-600">{analysisResults.jobMatch.skillsMatch}%</span>
                </div>
                <Progress value={analysisResults.jobMatch.skillsMatch} className="w-full" />
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Experience Level</span>
                  <span className={`text-sm font-medium ${analysisResults.jobMatch.experienceMatch ? 'text-green-600' : 'text-orange-600'}`}>
                    {analysisResults.jobMatch.experienceMatch ? '✓ Matched' : '⚠ Needs More'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Education</span>
                  <span className={`text-sm font-medium ${analysisResults.jobMatch.educationMatch ? 'text-green-600' : 'text-orange-600'}`}>
                    {analysisResults.jobMatch.educationMatch ? '✓ Matched' : '⚠ Check Requirements'}
                  </span>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-800 mb-2">
                    {analysisResults.jobMatch.overallMatch ? 'Strong Match' : 'Needs Work'}
                  </div>
                  <div className="text-sm text-gray-600">
                    {analysisResults.jobMatch.overallMatch 
                      ? 'Your resume aligns well with this position' 
                      : 'Consider tailoring your resume for better alignment'}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Keyword Match */}
      {analysisResults.keywordMatch && (
        <Card>
          <CardHeader>
            <CardTitle>Keyword Optimization</CardTitle>
            <CardDescription>
              ATS keyword matching score for better visibility
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <div className="text-3xl font-bold text-blue-600">{analysisResults.keywordMatch}%</div>
              <div>
                <p className="text-lg font-semibold">Keyword Match</p>
                <p className="text-gray-600">
                  {analysisResults.keywordMatch >= 80 ? 'Excellent keyword optimization' :
                   analysisResults.keywordMatch >= 60 ? 'Good keyword coverage' :
                   'Low keyword match - needs improvement'}
                </p>
              </div>
            </div>
            <Progress value={analysisResults.keywordMatch} className="w-full" />
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Strengths */}
        <Card>
          <CardHeader>
            <CardTitle className="text-green-600">Strengths</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analysisResults.strengths.map((strength: string, index: number) => (
                <li key={index} className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{strength}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Areas for Improvement */}
        <Card>
          <CardHeader>
            <CardTitle className="text-orange-600">Areas for Improvement</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analysisResults.improvements.map((improvement: string, index: number) => (
                <li key={index} className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{improvement}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Skill Gaps */}
      {analysisResults.skillGaps && analysisResults.skillGaps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Identified Skill Gaps</CardTitle>
            <CardDescription>
              Skills mentioned in the job description that are missing from your resume
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {analysisResults.skillGaps.map((gap: string, index: number) => (
                <div key={index} className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <span className="text-sm font-medium">{gap}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Suggestions */}
      <Card>
        <CardHeader>
          <CardTitle>Specific Recommendations</CardTitle>
          <CardDescription>
            Actionable steps to improve your resume score
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analysisResults.suggestions.map((suggestion: string, index: number) => (
              <div key={index} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm">{suggestion}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Note about job description */}
      {analysisResults.note && (
        <Card>
          <CardHeader>
            <CardTitle className="text-blue-600">💡 Pro Tip</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700">{analysisResults.note}</p>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4 justify-center">
        <Button onClick={() => setUploadStep('upload')} variant="outline">
          Upload New Resume
        </Button>
        <Button>
          Download Improved Resume
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav />
      
      <main className="container mx-auto px-6 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Resume Analysis</h1>
          <p className="text-gray-600">Get AI-powered insights to optimize your resume</p>
        </div>

        {uploadStep === 'upload' && <UploadForm />}
        {uploadStep === 'analyzing' && <AnalyzingView />}
        {uploadStep === 'results' && <ResultsView />}
      </main>
    </div>
  );
};

export default Upload;
