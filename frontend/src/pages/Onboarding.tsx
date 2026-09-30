import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ChevronRight, ChevronLeft, Upload, FileText, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface RoleOption {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
}

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    full_name: '',
    college: '',
    degree: '',
    branch: '',
    graduation_year: '',
    city: '',
    state: '',
    target_role: '',
    experience_level: '',
    available_study_time: '',
    learning_style: '',
    confidence: '',
  });
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  
  // Upload states
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'parsing' | 'analyzing' | 'created' | 'calculated'>('idle');
  const [error, setError] = useState('');
  
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const navigate = useNavigate();
  const { setHasCompletedOnboarding } = useAuth();

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/roles`);
        if (res.ok) {
          const data = await res.json();
          setRoles(data);
        }
      } catch (e) {
        console.error('Failed to load roles', e);
      }
    };
    fetchRoles();
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      
      if (!validTypes.includes(file.type)) {
        setError('Only PDF and DOCX files are allowed.');
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB.');
        return;
      }
      
      setError('');
      setResumeFile(file);
    }
  };

  const submitOnboarding = async () => {
    if (!resumeFile) {
      setError('Please upload your resume.');
      return;
    }

    try {
      setUploadState('uploading');
      
      const { supabase } = await import('../lib/supabase');
      const { data: { session: freshSession } } = await supabase.auth.getSession();
      
      if (!freshSession?.access_token) {
        throw new Error('Authentication session expired. Please log in again.');
      }
      
      const formPayload = new FormData();
      formPayload.append('profile_data', JSON.stringify(formData));
      formPayload.append('resume', resumeFile);

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/onboarding/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${freshSession.access_token}`
        },
        body: formPayload
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || errorData.detail || 'Failed to complete onboarding');
      }
      
      const responseData = await response.json();
      const resumeId = responseData.resume_id;
      
      // Start polling
      const pollStatus = async () => {
        try {
          const statusRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/resumes/${resumeId}/status`, {
            headers: {
              'Authorization': `Bearer ${freshSession.access_token}`
            }
          });
          
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            const status = statusData.status;
            
            setUploadState(status as any);
            
            if (status === 'completed' || status === 'failed') {
               // Update Supabase user metadata once completed
              const { supabase } = await import('../lib/supabase');
              await supabase.auth.updateUser({
                data: { has_completed_onboarding: true }
              });
              
              setHasCompletedOnboarding(true);

              setTimeout(() => {
                navigate('/dashboard');
              }, 1500);
              return;
            }
          }
        } catch (e) {
          console.error("Polling error", e);
        }
        
        // Continue polling every 2 seconds
        setTimeout(pollStatus, 2000);
      };
      
      pollStatus();

    } catch (err: any) {
      setError(err.message || 'An error occurred during onboarding.');
      setUploadState('idle');
    }
  };

  const inputClass = 'w-full bg-career-surface border border-career-border rounded-xl px-4 py-2.5 text-career-dark text-sm placeholder:text-career-muted/60 focus:outline-none focus:ring-2 focus:ring-career-primary focus:border-transparent transition-all duration-200 hover:border-career-primary/40';

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="flex items-center justify-between gap-3 mb-6">
              <h2 className="text-2xl font-serif text-career-dark">Let's build your profile</h2>
              <button
                onClick={() => {
                  setFormData({
                    full_name: 'Jane Doe',
                    college: 'IIT Delhi',
                    degree: 'B.Tech',
                    branch: 'Computer Science',
                    graduation_year: '2025',
                    city: 'New Delhi',
                    state: 'Delhi',
                    target_role: 'Software Engineer',
                    experience_level: 'Student',
                    available_study_time: '10-20 hours',
                    learning_style: 'Hands-on',
                    confidence: '6',
                  });
                  setStep(5);
                }}
                className="text-xs font-semibold text-career-primary hover:text-career-dark transition-colors underline decoration-career-primary/30 underline-offset-4"
              >
                Use Demo Persona
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-career-dark mb-1.5">Full Name</label>
                <input type="text" className={inputClass} placeholder="Your full name"
                  value={formData.full_name} onChange={(e) => handleInputChange('full_name', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-career-dark mb-1.5">College/University</label>
                  <input type="text" className={inputClass} placeholder="e.g. IIT Delhi"
                    value={formData.college} onChange={(e) => handleInputChange('college', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-career-dark mb-1.5">Graduation Year</label>
                  <input type="number" className={inputClass} placeholder="e.g. 2027"
                    value={formData.graduation_year} onChange={(e) => handleInputChange('graduation_year', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-career-dark mb-1.5">Degree</label>
                  <input type="text" placeholder="e.g. B.Tech" className={inputClass}
                    value={formData.degree} onChange={(e) => handleInputChange('degree', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-career-dark mb-1.5">Branch</label>
                  <input type="text" placeholder="e.g. Computer Science" className={inputClass}
                    value={formData.branch} onChange={(e) => handleInputChange('branch', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-career-dark mb-1.5">City</label>
                  <input type="text" className={inputClass} placeholder="e.g. New Delhi"
                    value={formData.city} onChange={(e) => handleInputChange('city', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-career-dark mb-1.5">State</label>
                  <input type="text" className={inputClass} placeholder="e.g. Delhi"
                    value={formData.state} onChange={(e) => handleInputChange('state', e.target.value)} />
                </div>
              </div>
            </div>
          </motion.div>
        );
      case 2:
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <h2 className="text-2xl font-serif text-career-dark mb-6">What role are you preparing for?</h2>
            <div className="grid grid-cols-2 gap-3">
              {roles.length > 0 ? roles.map(role => (
                <button key={role.id} 
                  onClick={() => handleInputChange('target_role', role.title)}
                  className={`p-4 rounded-xl border text-sm font-medium transition-all duration-200 text-left ${formData.target_role === role.title ? 'border-career-primary bg-career-primary/10 text-career-primary ring-2 ring-career-primary/20' : 'border-career-border bg-career-surface text-career-dark hover:border-career-primary/40 hover:bg-career-primary/[0.04]'}`}>
                  <span className="block">{role.title}</span>
                  {role.description && <span className="text-xs text-career-muted mt-1 block">{role.description}</span>}
                </button>
              )) : (
                <div className="col-span-2 text-center text-career-muted py-4">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-career-primary" />
                  Loading roles...
                </div>
              )}
            </div>
          </motion.div>
        );
      case 3:
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <h2 className="text-2xl font-serif text-career-dark mb-6">What is your current experience level?</h2>
            <div className="space-y-3">
              {['Student', 'Fresher', 'Intern', 'Entry Level'].map(level => (
                <button key={level} 
                  onClick={() => handleInputChange('experience_level', level)}
                  className={`w-full p-4 rounded-xl border text-left font-medium transition-all duration-200 flex items-center justify-between ${formData.experience_level === level ? 'border-career-primary bg-career-primary/10 text-career-primary ring-2 ring-career-primary/20' : 'border-career-border bg-career-surface text-career-dark hover:border-career-primary/40 hover:bg-career-primary/[0.04]'}`}>
                  {level}
                  {formData.experience_level === level && <CheckCircle2 className="w-5 h-5 text-career-primary" />}
                </button>
              ))}
            </div>
          </motion.div>
        );
      case 4:
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <h2 className="text-2xl font-serif text-career-dark mb-6">Career Preferences</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-career-dark mb-3">Available study time per week</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {['< 5 hours', '5-10 hours', '10-20 hours', '20+ hours'].map(time => (
                    <button key={time} onClick={() => handleInputChange('available_study_time', time)}
                      className={`py-2.5 px-2 rounded-xl border text-sm transition-all duration-200 ${formData.available_study_time === time ? 'border-career-primary bg-career-primary/10 text-career-primary font-medium ring-2 ring-career-primary/20' : 'border-career-border bg-career-surface text-career-muted hover:border-career-primary/40'}`}>
                      {time}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-career-dark mb-3">Preferred learning style</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {['Visual', 'Reading', 'Hands-on', 'Mixed'].map(style => (
                    <button key={style} onClick={() => handleInputChange('learning_style', style)}
                      className={`py-2.5 px-2 rounded-xl border text-sm transition-all duration-200 ${formData.learning_style === style ? 'border-career-primary bg-career-primary/10 text-career-primary font-medium ring-2 ring-career-primary/20' : 'border-career-border bg-career-surface text-career-muted hover:border-career-primary/40'}`}>
                      {style}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-career-dark mb-3">Current interview confidence (1-10)</label>
                <input type="range" min="1" max="10" className="w-full accent-career-primary" 
                  value={formData.confidence || 5} onChange={(e) => handleInputChange('confidence', e.target.value)} />
                <div className="text-center text-career-primary font-bold mt-2 text-lg">{formData.confidence || 5}/10</div>
              </div>
            </div>
          </motion.div>
        );
      case 5:
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <h2 className="text-2xl font-serif text-career-dark mb-6">Upload your Resume</h2>
            {uploadState === 'idle' ? (
              <div>
                <div className="border-2 border-dashed border-career-border rounded-2xl p-12 text-center hover:border-career-primary/50 transition-all duration-300 bg-career-surface/50 group">
                  <Upload className="w-12 h-12 text-career-muted mx-auto mb-4 group-hover:text-career-primary transition-colors" />
                  <p className="text-career-dark font-medium mb-2">Drag and drop your resume here, or</p>
                  <label className="cursor-pointer bg-career-primary hover:bg-career-primary/85 text-career-surface px-5 py-2.5 rounded-xl inline-block transition-all duration-200 font-medium text-sm btn-press">
                    Browse Files
                    <input type="file" className="hidden" accept=".pdf,.docx" onChange={handleFileChange} />
                  </label>
                  <p className="text-career-muted text-xs mt-4">Supported formats: PDF, DOCX (Max 5MB)</p>
                </div>
                {resumeFile && (
                  <div className="mt-4 p-4 bg-career-surface rounded-xl flex items-center border border-career-primary/30">
                    <FileText className="w-8 h-8 text-career-primary mr-3" />
                    <div className="flex-1">
                      <p className="text-career-dark font-medium text-sm truncate">{resumeFile.name}</p>
                      <p className="text-career-muted text-xs">{(resumeFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-career-primary animate-[success-pop_0.5s_ease-out]" />
                  </div>
                )}
                {error && <p className="text-red-600 text-sm mt-3 text-center">{error}</p>}
              </div>
            ) : (
              <div className="space-y-5 max-w-md mx-auto py-8">
                <StatusItem status={uploadState === 'uploading' ? 'active' : 'done'} text="Uploading resume..." />
                <StatusItem status={['uploading'].includes(uploadState) ? 'pending' : uploadState === 'parsing' ? 'active' : 'done'} text="Parsing document structure..." />
                <StatusItem status={['uploading', 'parsing'].includes(uploadState) ? 'pending' : uploadState === 'analyzing' ? 'active' : 'done'} text="Analyzing skills & experience..." />
                <StatusItem status={['uploading', 'parsing', 'analyzing'].includes(uploadState) ? 'pending' : uploadState === 'created' ? 'active' : 'done'} text="Generating AI profile..." />
                <StatusItem status={uploadState === 'calculated' ? 'done' : 'pending'} text="Calculating career readiness score..." />
              </div>
            )}
          </motion.div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-career-background flex flex-col relative overflow-hidden">
      {/* Organic background blobs */}
      <div className="absolute top-[-15%] right-[-10%] w-[500px] h-[500px] bg-career-primary/[0.04] rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-career-accent/[0.06] rounded-full blur-3xl pointer-events-none" />
      
      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-2xl">
          {/* Progress bar */}
          <div className="mb-10">
            <div className="flex justify-between mb-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className={`text-xs font-semibold tracking-wide transition-colors duration-300 ${step >= i ? 'text-career-primary' : 'text-career-muted/50'}`}>
                  Step {i}
                </div>
              ))}
            </div>
            <div className="h-1.5 bg-career-border rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-career-primary rounded-full"
                initial={{ width: '20%' }}
                animate={{ width: `${(step / 5) * 100}%` }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
          </div>

          {/* Form Content */}
          <div className="bg-career-surface border border-career-border rounded-2xl p-8 shadow-[0_4px_20px_rgba(48,42,30,0.06)] relative overflow-hidden">
            <AnimatePresence mode="wait">
              {renderStep()}
            </AnimatePresence>

            {/* Navigation Buttons */}
            {uploadState === 'idle' && (
              <div className="mt-10 flex justify-between pt-6 border-t border-career-border">
                {step > 1 ? (
                  <button onClick={() => setStep(step - 1)} className="flex items-center text-career-muted hover:text-career-dark transition-colors duration-200 text-sm font-medium">
                    <ChevronLeft className="w-5 h-5 mr-1" /> Back
                  </button>
                ) : <div></div>}
                
                {step < 5 ? (
                  <button onClick={() => setStep(step + 1)} className="flex items-center bg-career-primary text-career-surface px-6 py-2.5 rounded-xl font-medium hover:bg-career-primary/85 transition-all duration-200 text-sm btn-press">
                    Continue <ChevronRight className="w-5 h-5 ml-1" />
                  </button>
                ) : (
                  <button onClick={submitOnboarding} className="flex items-center bg-career-primary text-career-surface px-8 py-2.5 rounded-xl font-medium hover:bg-career-primary/85 transition-all duration-200 text-sm btn-press">
                    Complete Setup <CheckCircle2 className="w-5 h-5 ml-2" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusItem({ status, text }: { status: 'pending' | 'active' | 'done', text: string }) {
  return (
    <div className={`flex items-center ${status === 'pending' ? 'opacity-40' : 'opacity-100'} transition-opacity duration-500`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-4 shrink-0 transition-colors duration-300
        ${status === 'done' ? 'bg-career-primary/15 text-career-primary' : 
          status === 'active' ? 'bg-career-accent/15 text-career-accent' : 'bg-career-border text-career-muted'}`}>
        {status === 'done' ? <CheckCircle2 className="w-5 h-5" /> : 
         status === 'active' ? <Loader2 className="w-5 h-5 animate-spin" /> : 
         <div className="w-2 h-2 bg-career-muted/50 rounded-full" />}
      </div>
      <span className={`font-medium text-sm ${status === 'active' ? 'text-career-dark' : 'text-career-text'}`}>{text}</span>
    </div>
  );
}
