
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { User, Settings, LogOut, Home } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const DashboardNav = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = () => {
    toast({
      title: "Logged out successfully",
      description: "You have been signed out of your account.",
    });
    navigate("/");
  };

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center gap-8">
          <Link to="/dashboard" className="text-2xl font-bold text-gray-900 hover:text-blue-600 transition-colors">
            InterviewAce
          </Link>
          
          <div className="hidden md:flex items-center gap-6">
            <Link to="/dashboard">
              <Button variant="ghost" className="flex items-center gap-2">
                <Home className="w-4 h-4" />
                Dashboard
              </Button>
            </Link>
            <Link to="/upload">
              <Button variant="ghost">Resume Analysis</Button>
            </Link>
            <Link to="/interview">
              <Button variant="ghost">Mock Interviews</Button>
            </Link>
            <Link to="/progress">
              <Button variant="ghost">Progress</Button>
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-blue-600 text-white">JD</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-white" align="end" forceMount>
              <div className="flex flex-col space-y-1 p-2">
                <p className="text-sm font-medium leading-none">John Doe</p>
                <p className="text-xs leading-none text-muted-foreground">john@example.com</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
};

export default DashboardNav;
