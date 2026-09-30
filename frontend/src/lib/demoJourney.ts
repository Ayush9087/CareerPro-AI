export const DEMO_EMAIL = 'alex@demo.careerpro.ai';
export const DEMO_PASSWORD = 'DemoPassword123!';

export type LoopPhase = 'ASSESS' | 'DIAGNOSE' | 'PLAN' | 'PROVE' | 'TRACK';

export type DemoStep = {
  id: string;
  path: string;
  label: string;
  phase: LoopPhase;
  judgeCue: string;
  nextLabel: string;
  nextPath: string;
};

export const DEMO_STEPS: DemoStep[] = [
  {
    id: 'profile',
    path: '/profile',
    label: 'Student profile',
    phase: 'ASSESS',
    judgeCue: 'Where the student stands today: identity, target role, and recorded evidence.',
    nextLabel: 'Open resume analysis',
    nextPath: '/resume',
  },
  {
    id: 'resume',
    path: '/resume',
    label: 'Resume analysis',
    phase: 'ASSESS',
    judgeCue: 'AI extracts skills, projects, and evidence that become the assessment baseline.',
    nextLabel: 'See readiness score',
    nextPath: '/readiness',
  },
  {
    id: 'readiness',
    path: '/readiness',
    label: 'Readiness score',
    phase: 'ASSESS',
    judgeCue: 'The score is weighted from skills, projects, experience, problem solving, communication, and interviews.',
    nextLabel: 'Inspect skill gaps',
    nextPath: '/skills',
  },
  {
    id: 'skills',
    path: '/skills',
    label: 'Skill gap map',
    phase: 'DIAGNOSE',
    judgeCue: 'Missing skills are ranked by role relevance, evidence gap, and market demand.',
    nextLabel: 'Build 30-day plan',
    nextPath: '/roadmap',
  },
  {
    id: 'roadmap',
    path: '/roadmap',
    label: '30-day roadmap',
    phase: 'PLAN',
    judgeCue: 'The next actions close the highest-priority gaps, with evidence required for each task.',
    nextLabel: 'Prove with an interview',
    nextPath: '/interview',
  },
  {
    id: 'interview',
    path: '/interview',
    label: 'Mock interview',
    phase: 'PROVE',
    judgeCue: 'Practice scores feed interview readiness and show what still needs work.',
    nextLabel: 'Track improvement',
    nextPath: '/progress',
  },
  {
    id: 'progress',
    path: '/progress',
    label: 'Updated progress',
    phase: 'TRACK',
    judgeCue: 'CareerPro measures change from saved scores, completed tasks, interviews, and new evidence.',
    nextLabel: 'Ask the Career Advisor',
    nextPath: '/chat',
  },
  {
    id: 'chat',
    path: '/chat',
    label: 'Career AI Advisor',
    phase: 'TRACK',
    judgeCue: 'Advice is grounded in this same loop: score, gaps, plan, and proof.',
    nextLabel: 'Return to dashboard',
    nextPath: '/dashboard',
  },
];

export const LOOP_PHASES: { id: LoopPhase; meaning: string }[] = [
  { id: 'ASSESS', meaning: 'Baseline from resume and profile' },
  { id: 'DIAGNOSE', meaning: 'Why the score is what it is' },
  { id: 'PLAN', meaning: 'Exactly what to do next' },
  { id: 'PROVE', meaning: 'Validate skill with interviews' },
  { id: 'TRACK', meaning: 'Measure improvement over time' },
];

export function stepForPath(pathname: string): DemoStep | null {
  if (pathname.startsWith('/dashboard')) {
    return {
      id: 'dashboard',
      path: '/dashboard',
      label: 'Workspace',
      phase: 'TRACK',
      judgeCue: 'Current position, why the score exists, missing skills, and the next action — in one view.',
      nextLabel: 'Review student profile',
      nextPath: '/profile',
    };
  }
  return DEMO_STEPS.find((step) => pathname.startsWith(step.path)) ?? null;
}

export function createDemoResumeFile(): File {
  const pdf = `%PDF-1.1
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>endobj
4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
5 0 obj<</Length 280>>stream
BT /F1 14 Tf 72 720 Td (Jane Doe) Tj 0 -24 Td /F1 11 Tf (Software Engineer intern candidate) Tj
0 -20 Td (Python, React, SQL, FastAPI, Git) Tj
0 -20 Td (IIT Delhi B.Tech Computer Science 2025) Tj
0 -20 Td (Built REST APIs and a student portfolio web app.) Tj ET
endstream
endobj
trailer<</Root 1 0 R>>
%%EOF`;
  return new File([pdf], 'jane-doe-demo-resume.pdf', { type: 'application/pdf' });
}

export const DEMO_PERSONA = {
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
};
