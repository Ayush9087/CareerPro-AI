import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="bg-career-dark text-career-background/60 py-12 border-t border-career-border/20">
      <div className="max-w-7xl mx-auto px-4 md:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h2 className="text-2xl font-serif text-career-surface font-bold">CareerPro AI</h2>
          <p className="text-sm mt-2 max-w-xs">
            AI-powered career readiness and employability for every student.
          </p>
        </div>
        
        <div className="flex gap-8 text-sm font-medium">
          <Link to="/login" className="hover:text-career-surface transition-colors">Login</Link>
          <Link to="/signup" className="hover:text-career-surface transition-colors">Sign Up</Link>
          <a href="#how-it-works" className="hover:text-career-surface transition-colors">How it Works</a>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-12 text-xs text-center md:text-left opacity-50">
        &copy; {new Date().getFullYear()} CareerPro AI. Built for the Hackathon.
      </div>
    </footer>
  );
}
