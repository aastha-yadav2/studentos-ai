-- ── Phase 6: Ambassador Intelligence Migration ──────────────────────────────
-- Migration: 20260718060000_add_ambassador_opportunities.sql

-- 1. Update Opportunity Type Check Constraint to include 'ambassador'
alter table public.opportunities drop constraint if exists opportunities_type_check;
alter table public.opportunities add constraint opportunities_type_check check (
  type in ('hackathon', 'internship', 'job', 'fellowship', 'grant', 'competition', 'ambassador')
);

-- 2. Add application_open_date column for window tracking
alter table public.opportunities add column if not exists application_open_date timestamptz;

-- 3. Add Query Index for application_open_date
create index if not exists opportunities_open_date_idx on public.opportunities(application_open_date);

-- 4. Verified Real-World Ambassador & Student Leadership Seed Data
insert into public.opportunities (
  title, organization, type, category, description,
  eligibility, required_skills, location, stipend_prize,
  source_url, source_platform, deadline, application_open_date,
  status, verification_state, last_verified_at
) values
(
  'GitHub Campus Experts',
  'GitHub',
  'ambassador',
  'Campus Expert',
  'Student leadership program providing training, public speaking, community building, and event support for technical student leaders.',
  array['18+ years old', 'Enrolled in post-secondary institution', 'Completed GitHub Education training'],
  array['Git', 'GitHub', 'Community Building', 'Public Speaking', 'Event Management'],
  'Remote / Global Campus',
  'Event sponsorship, GitHub swag, conference travel grants',
  'https://education.github.com/experts',
  'GitHub',
  null,
  null,
  'active',
  'verified',
  now()
),
(
  'Notion Campus Leader',
  'Notion',
  'ambassador',
  'Campus Leader',
  'Student leaders building productivity communities, hosting workshops, and demonstrating Notion workflows on university campuses.',
  array['Enrolled post-secondary student', 'Active Notion user and community builder'],
  array['Notion', 'Productivity Tools', 'Event Planning', 'Community Building', 'Workshop Facilitation'],
  'Remote / University Campus',
  'Notion Plus subscription, exclusive swag, team mentorship',
  'https://www.notion.so/ambassadors',
  'Notion',
  null,
  null,
  'active',
  'verified',
  now()
),
(
  'Postman Student Leader',
  'Postman',
  'ambassador',
  'Developer Ambassador',
  'Student leaders educating peers on API literacy, hosting hands-on API workshops, and building developer communities.',
  array['Verified Postman Student Expert badge holder', 'Enrolled student'],
  array['Postman', 'REST APIs', 'API Testing', 'Public Speaking', 'Developer Advocacy'],
  'Remote / Global',
  'Event sponsorship, Postman swag, direct connection with Developer Relations team',
  'https://www.postman.com/company/student-program/',
  'Postman',
  null,
  null,
  'active',
  'verified',
  now()
),
(
  'DeepLearning.AI Event Ambassador',
  'DeepLearning.AI',
  'ambassador',
  'AI Ambassador',
  'Community leaders organizing local Pie & AI workshops and fostering machine learning education across global student communities.',
  array['Passionate about AI/ML education', 'Experience hosting meetups or student workshops'],
  array['Machine Learning', 'Python', 'Event Management', 'Community Leadership', 'AI/ML Education'],
  'Remote / Global',
  'Event hosting grants, DeepLearning.AI swag, instructor Q&A access',
  'https://www.deeplearning.ai/ambassador-program/',
  'DeepLearning.AI',
  null,
  null,
  'active',
  'verified',
  now()
),
(
  'AWS Student Community Leader',
  'Amazon Web Services',
  'ambassador',
  'Campus Expert',
  'Student cloud leaders sharing AWS knowledge, facilitating cloud workshops, and mentoring university peers in cloud architecture.',
  array['Enrolled post-secondary student', 'AWS cloud foundational knowledge', 'Student leadership experience'],
  array['AWS', 'Cloud Computing', 'DevOps', 'Technical Presentation', 'Community Building'],
  'Remote / Global',
  'AWS promotional credits, swag, priority access to AWS certifications & events',
  'https://aws.amazon.com/developer/community/students/',
  'Amazon Web Services',
  null,
  null,
  'active',
  'verified',
  now()
),
(
  'Microsoft Copilot Student Ambassador',
  'Microsoft',
  'ambassador',
  'AI Ambassador',
  'Student ambassadors leading AI adoption, demonstrating Copilot developer tools, and hosting technical sessions on campus.',
  array['Enrolled post-secondary student age 18+', 'Interest in AI development and developer tools'],
  array['AI/ML', 'TypeScript', 'Python', 'Public Speaking', 'Developer Advocacy'],
  'Remote / Global',
  'Microsoft credits, certification vouchers, exclusive ambassador swag',
  'https://mvp.microsoft.com/studentambassadors',
  'Microsoft',
  null,
  null,
  'active',
  'verified',
  now()
),
(
  'MyGov Campus Ambassador',
  'MyGov India',
  'ambassador',
  'Campus Representative',
  'Government of India student ambassador program promoting civic digital initiatives, youth innovation, and community awareness across campuses.',
  array['Enrolled college student in India', 'Active in campus student organizations'],
  array['Public Relations', 'Social Media', 'Community Leadership', 'Event Planning', 'Communication'],
  'India / University Campus',
  'Official Certificate of Appreciation, MyGov merchandise, national recognition',
  'https://www.mygov.in',
  'MyGov India',
  null,
  null,
  'active',
  'verified',
  now()
),
(
  'Internshala Student Partner',
  'Internshala',
  'ambassador',
  'Student Partner',
  'Pan-India student leadership program empowering campus leaders to promote career awareness, skill workshops, and internship opportunities.',
  array['College student in India', 'Strong communication and organizational skills'],
  array['Communication', 'Social Media', 'Marketing', 'Event Management', 'Networking'],
  'India / Remote',
  'Performance-based stipends, certificates, exclusive career training',
  'https://internshala.com/isp',
  'Internshala',
  null,
  null,
  'active',
  'verified',
  now()
)
on conflict (source_platform, source_url) do update set
  title = excluded.title,
  organization = excluded.organization,
  category = excluded.category,
  description = excluded.description,
  required_skills = excluded.required_skills,
  last_verified_at = now();
