import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { Mic, MicOff, Play, Pause, SkipForward, MessageSquare, Volume2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import DashboardNav from "@/components/DashboardNav";
import { interviewAPI } from "@/lib/api";
import { withApiFallback } from "@/lib/apiFallback";

const Interview = () => {
  const [interviewStep, setInterviewStep] = useState<'setup' | 'active' | 'feedback'>('setup');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedRole, setSelectedRole] = useState("");
  const [interviewMode, setInterviewMode] = useState<'text' | 'voice'>('text');
  const [userAnswer, setUserAnswer] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const { toast } = useToast();

  const dummyQuestions = [
    {
      id: 1,
      question: "Tell me about yourself and why you're interested in this role.",
      type: "behavioral",
      expectedDuration: "2-3 minutes"
    },
    {
      id: 2,
      question: "Describe a challenging project you worked on and how you overcame obstacles.",
      type: "behavioral", 
      expectedDuration: "3-4 minutes"
    },
    {
      id: 3,
      question: "What are your greatest strengths and how do they apply to this position?",
      type: "behavioral",
      expectedDuration: "2-3 minutes"
    },
    {
      id: 4,
      question: "Where do you see yourself in 5 years?",
      type: "career",
      expectedDuration: "2 minutes"
    }
  ];

  const [questions, setQuestions] = useState(dummyQuestions);

  const startInterview = async () => {
    if (!selectedRole) {
      toast({
        title: "Please select a role",
        description: "Choose the type of role you're interviewing for.",
        variant: "destructive"
      });
      return;
    }
    try {
      const response = await withApiFallback(
        () => interviewAPI.start({ jobTitle: selectedRole, mode: interviewMode }),
        null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { isUnreachable: (error: any) => !error?.response || [404, 501, 503].includes(error?.response?.status) }
      );

      if (!response) {
        setInterviewStep('active');
        setQuestions(dummyQuestions);
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (response as any).data;
      setSessionId(data?.sessionId || null);
      setQuestions(Array.isArray(data?.questions) && data.questions.length > 0 ? data.questions : dummyQuestions);
      setInterviewStep('active');
    } catch {
      setInterviewStep('active');
      setQuestions(dummyQuestions);
    }
  };

  const handleAnswerSubmit = async () => {
    if (!userAnswer.trim()) {
      toast({
        title: "Please provide an answer",
        description: "Record or type your response before proceeding.",
        variant: "destructive"
      });
      return;
    }
    // Try to send answer to backend, ignore network failures
    if (sessionId) {
      await withApiFallback(
        () => interviewAPI.answer({
          sessionId,
          questionId: String(questions[currentQuestion].id ?? currentQuestion + 1),
          userAnswer,
        }),
        null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { isUnreachable: (error: any) => !error?.response }
      );
    }

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setUserAnswer("");
    } else {
      setInterviewStep('feedback');
    }
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      toast({
        title: "Recording started",
        description: "Speak your answer clearly. Click stop when finished.",
      });
    } else {
      toast({
        title: "Recording stopped",
        description: "Your response has been recorded and transcribed.",
      });
      setUserAnswer("This is a simulated transcription of your voice response. In the actual implementation, this would be the real transcribed text from Google Speech-to-Text API.");
    }
  };

  const InterviewSetup = () => (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Set Up Your Mock Interview</CardTitle>
        <CardDescription>
          Configure your interview session based on your target role
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">Target Role</label>
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger>
              <SelectValue placeholder="Select the role you're interviewing for" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Technology</SelectLabel>
                <SelectItem value="frontend-developer">Frontend Developer</SelectItem>
                <SelectItem value="backend-developer">Backend Developer</SelectItem>
                <SelectItem value="full-stack-developer">Full Stack Developer</SelectItem>
                <SelectItem value="software-engineer">Software Engineer</SelectItem>
                <SelectItem value="devops-engineer">DevOps Engineer</SelectItem>
                <SelectItem value="cloud-architect">Cloud Architect</SelectItem>
                <SelectItem value="cybersecurity-analyst">Cybersecurity Analyst</SelectItem>
                <SelectItem value="mobile-app-developer">Mobile App Developer</SelectItem>
                <SelectItem value="ai-ml-engineer">AI/ML Engineer</SelectItem>
                <SelectItem value="data-scientist">Data Scientist</SelectItem>
                <SelectItem value="qa-engineer">QA Engineer</SelectItem>
                <SelectItem value="technical-writer">Technical Writer</SelectItem>
              </SelectGroup>
              
              <SelectGroup>
                <SelectLabel>Business & Management</SelectLabel>
                <SelectItem value="business-analyst">Business Analyst</SelectItem>
                <SelectItem value="product-manager">Product Manager</SelectItem>
                <SelectItem value="project-manager">Project Manager</SelectItem>
                <SelectItem value="operations-manager">Operations Manager</SelectItem>
                <SelectItem value="strategy-consultant">Strategy Consultant</SelectItem>
                <SelectItem value="business-development-manager">Business Development Manager</SelectItem>
                <SelectItem value="account-manager">Account Manager</SelectItem>
                <SelectItem value="customer-success-manager">Customer Success Manager</SelectItem>
              </SelectGroup>

              <SelectGroup>
                <SelectLabel>Creative & Design</SelectLabel>
                <SelectItem value="graphic-designer">Graphic Designer</SelectItem>
                <SelectItem value="ux-designer">UX Designer</SelectItem>
                <SelectItem value="ui-designer">UI Designer</SelectItem>
                <SelectItem value="content-creator">Content Creator</SelectItem>
                <SelectItem value="creative-director">Creative Director</SelectItem>
                <SelectItem value="brand-manager">Brand Manager</SelectItem>
                <SelectItem value="social-media-manager">Social Media Manager</SelectItem>
                <SelectItem value="marketing-manager">Marketing Manager</SelectItem>
              </SelectGroup>

              <SelectGroup>
                <SelectLabel>Finance & Accounting</SelectLabel>
                <SelectItem value="financial-analyst">Financial Analyst</SelectItem>
                <SelectItem value="investment-banker">Investment Banker</SelectItem>
                <SelectItem value="accountant">Accountant</SelectItem>
                <SelectItem value="risk-manager">Risk Manager</SelectItem>
                <SelectItem value="treasury-analyst">Treasury Analyst</SelectItem>
              </SelectGroup>

              <SelectGroup>
                <SelectLabel>Healthcare & Science</SelectLabel>
                <SelectItem value="nurse">Nurse</SelectItem>
                <SelectItem value="medical-assistant">Medical Assistant</SelectItem>
                <SelectItem value="research-scientist">Research Scientist</SelectItem>
                <SelectItem value="laboratory-technician">Laboratory Technician</SelectItem>
                <SelectItem value="pharmaceutical-sales">Pharmaceutical Sales</SelectItem>
              </SelectGroup>

              <SelectGroup>
                <SelectLabel>Education & Training</SelectLabel>
                <SelectItem value="teacher">Teacher</SelectItem>
                <SelectItem value="training-specialist">Training Specialist</SelectItem>
                <SelectItem value="curriculum-developer">Curriculum Developer</SelectItem>
                <SelectItem value="academic-advisor">Academic Advisor</SelectItem>
              </SelectGroup>

              <SelectGroup>
                <SelectLabel>Sales & Customer Service</SelectLabel>
                <SelectItem value="inside-sales-representative">Inside Sales Representative</SelectItem>
                <SelectItem value="sales-representative">Sales Representative</SelectItem>
                <SelectItem value="account-executive">Account Executive</SelectItem>
                <SelectItem value="customer-service-representative">Customer Service Representative</SelectItem>
                <SelectItem value="sales-manager">Sales Manager</SelectItem>
                <SelectItem value="regional-sales-director">Regional Sales Director</SelectItem>
              </SelectGroup>

              <SelectGroup>
                <SelectLabel>Human Resources</SelectLabel>
                <SelectItem value="hr-generalist">HR Generalist</SelectItem>
                <SelectItem value="recruiter">Recruiter</SelectItem>
                <SelectItem value="compensation-analyst">Compensation Analyst</SelectItem>
                <SelectItem value="training-coordinator">Training Coordinator</SelectItem>
              </SelectGroup>

              <SelectGroup>
                <SelectLabel>Legal & Compliance</SelectLabel>
                <SelectItem value="legal-assistant">Legal Assistant</SelectItem>
                <SelectItem value="compliance-officer">Compliance Officer</SelectItem>
                <SelectItem value="paralegal">Paralegal</SelectItem>
              </SelectGroup>

              <SelectGroup>
                <SelectLabel>Operations & Supply Chain</SelectLabel>
                <SelectItem value="supply-chain-manager">Supply Chain Manager</SelectItem>
                <SelectItem value="logistics-coordinator">Logistics Coordinator</SelectItem>
                <SelectItem value="quality-assurance-manager">Quality Assurance Manager</SelectItem>
                <SelectItem value="warehouse-manager">Warehouse Manager</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Interview Mode</label>
          <div className="flex gap-4">
            <Button
              variant={interviewMode === 'text' ? 'default' : 'outline'}
              onClick={() => setInterviewMode('text')}
              className="flex-1"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Text Mode
            </Button>
            <Button
              variant={interviewMode === 'voice' ? 'default' : 'outline'}
              onClick={() => setInterviewMode('voice')}
              className="flex-1"
            >
              <Mic className="w-4 h-4 mr-2" />
              Voice Mode
            </Button>
          </div>
          <p className="text-xs text-gray-600">
            {interviewMode === 'text' 
              ? 'Type your responses to interview questions'
              : 'Speak your responses and get real-time transcription'
            }
          </p>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">What to expect:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• 4-5 role-specific questions</li>
            <li>• Real-time AI feedback on your responses</li>
            <li>• Detailed analysis of communication skills</li>
            <li>• Improvement suggestions for future interviews</li>
          </ul>
        </div>

        <Button onClick={startInterview} className="w-full" size="lg">
          Start Interview Session
        </Button>
      </CardContent>
    </Card>
  );

  const ActiveInterview = () => (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Progress</span>
            <span className="text-sm text-gray-600">
              Question {currentQuestion + 1} of {questions.length}
            </span>
          </div>
          <Progress value={(currentQuestion + 1) / questions.length * 100} />
        </CardContent>
      </Card>

      {/* Current Question */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">
              Question {currentQuestion + 1}
            </CardTitle>
            <div className="flex gap-2">
              <Badge variant="secondary">{questions[currentQuestion].type}</Badge>
              <Badge variant="outline">{questions[currentQuestion].expectedDuration}</Badge>
            </div>
          </div>
          {interviewMode === 'voice' && (
            <Button variant="outline" size="sm" className="w-fit">
              <Volume2 className="w-4 h-4 mr-2" />
              Listen to Question
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <p className="text-lg leading-relaxed mb-6">
            {questions[currentQuestion].question}
          </p>

          {/* Answer Input */}
          <div className="space-y-4">
            {interviewMode === 'text' ? (
              <div className="space-y-2">
                <label className="text-sm font-medium">Your Answer</label>
                <Textarea
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  placeholder="Type your response here..."
                  rows={6}
                  className="resize-none"
                />
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Voice Response</label>
                  <div className="flex justify-center">
                    <Button
                      size="lg"
                      variant={isRecording ? "destructive" : "default"}
                      onClick={toggleRecording}
                      className="w-32 h-32 rounded-full"
                    >
                      {isRecording ? (
                        <>
                          <MicOff className="w-8 h-8" />
                          <span className="sr-only">Stop Recording</span>
                        </>
                      ) : (
                        <>
                          <Mic className="w-8 h-8" />
                          <span className="sr-only">Start Recording</span>
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-sm text-gray-600">
                    {isRecording ? "Recording... Click to stop" : "Click to start recording"}
                  </p>
                </div>
                
                {userAnswer && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg text-left">
                    <label className="text-sm font-medium text-gray-700">Transcription:</label>
                    <p className="mt-1 text-sm">{userAnswer}</p>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button variant="outline" disabled={currentQuestion === 0}>
                Previous Question
              </Button>
              <Button onClick={handleAnswerSubmit}>
                {currentQuestion < questions.length - 1 ? (
                  <>
                    Next Question <SkipForward className="w-4 h-4 ml-2" />
                  </>
                ) : (
                  "Finish Interview"
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const InterviewFeedback = () => (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl text-center">Interview Complete!</CardTitle>
          <CardDescription className="text-center">
            Here's your personalized feedback and performance analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">82%</div>
              <p className="text-sm text-gray-600">Overall Score</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">88%</div>
              <p className="text-sm text-gray-600">Communication</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">76%</div>
              <p className="text-sm text-gray-600">Content Quality</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">84%</div>
              <p className="text-sm text-gray-600">Confidence</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-green-600">Strengths</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li>• Clear and articulate communication</li>
              <li>• Good use of specific examples</li>
              <li>• Confident delivery and tone</li>
              <li>• Relevant experience highlighted</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-orange-600">Areas for Improvement</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li>• Add more quantifiable achievements</li>
              <li>• Practice concise responses</li>
              <li>• Include more leadership examples</li>
              <li>• Prepare stronger closing statements</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4 justify-center">
        <Button onClick={() => {
          setInterviewStep('setup');
          setCurrentQuestion(0);
          setUserAnswer("");
        }} variant="outline">
          New Interview
        </Button>
        <Button>View Detailed Report</Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav />
      
      <main className="container mx-auto px-6 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Mock Interview</h1>
          <p className="text-gray-600">Practice with AI-generated questions and get instant feedback</p>
        </div>

        {interviewStep === 'setup' && <InterviewSetup />}
        {interviewStep === 'active' && <ActiveInterview />}
        {interviewStep === 'feedback' && <InterviewFeedback />}
      </main>
    </div>
  );
};

export default Interview;
