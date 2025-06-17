
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Upload, MessageSquare, BarChart3, Shield, Zap, Users } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Navigation */}
      <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
        <div className="text-2xl font-bold text-gray-900">InterviewAce</div>
        <div className="flex gap-4">
          <Link to="/auth">
            <Button variant="ghost">Sign In</Button>
          </Link>
          <Link to="/auth">
            <Button>Get Started</Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-16 text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          Ace Your Next Interview with
          <span className="text-blue-600"> AI-Powered </span>
          Practice
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
          Upload your resume, practice with AI-generated questions, and get real-time feedback 
          to boost your interview confidence and land your dream job.
        </p>
        <Link to="/auth">
          <Button size="lg" className="text-lg px-8 py-3">
            Start Practicing Now <ArrowRight className="ml-2" />
          </Button>
        </Link>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          Everything You Need to Succeed
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <Upload className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <CardTitle>Smart Resume Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base">
                Upload your resume and get AI-powered insights on how to optimize it for your target role
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <MessageSquare className="w-12 h-12 text-purple-600 mx-auto mb-4" />
              <CardTitle>Mock Interviews</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base">
                Practice with AI-generated questions tailored to your role, with voice or text interaction
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <BarChart3 className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <CardTitle>Progress Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base">
                Monitor your improvement with detailed analytics and personalized feedback
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-gray-50 py-16">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            How It Works
          </h2>
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">1</div>
              <h3 className="text-xl font-semibold mb-2">Upload Resume</h3>
              <p className="text-gray-600">Upload your resume and job description for analysis</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">2</div>
              <h3 className="text-xl font-semibold mb-2">Get Insights</h3>
              <p className="text-gray-600">Receive AI-powered feedback and improvement suggestions</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">3</div>
              <h3 className="text-xl font-semibold mb-2">Practice Interviews</h3>
              <p className="text-gray-600">Take mock interviews with personalized questions</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">4</div>
              <h3 className="text-xl font-semibold mb-2">Track Progress</h3>
              <p className="text-gray-600">Monitor your improvement and ace your interview</p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="container mx-auto px-6 py-16">
        <div className="grid md:grid-cols-3 gap-8 text-center">
          <div>
            <Shield className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Secure & Private</h3>
            <p className="text-gray-600">Your data is encrypted and protected with enterprise-grade security</p>
          </div>
          <div>
            <Zap className="w-12 h-12 text-purple-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">AI-Powered</h3>
            <p className="text-gray-600">Advanced AI algorithms provide personalized feedback and questions</p>
          </div>
          <div>
            <Users className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Proven Results</h3>
            <p className="text-gray-600">Join thousands of professionals who've improved their interview skills</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Ace Your Next Interview?</h2>
          <p className="text-xl mb-8 opacity-90">Join thousands of professionals who've improved their interview skills</p>
          <Link to="/auth">
            <Button size="lg" variant="secondary" className="text-lg px-8 py-3">
              Start Your Journey <ArrowRight className="ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="container mx-auto px-6 text-center">
          <div className="text-2xl font-bold mb-4">InterviewAce</div>
          <p className="text-gray-400">Empowering careers through AI-powered interview preparation</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
