import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import {
  Activity, ArrowRight, AlertTriangle, BookOpen, Check, CloudRain, Droplets, FilePlus2,
  Filter, Leaf, MapPin, Menu, Search, Settings2, ShieldCheck, Sprout, Sun, Thermometer,
  Trash2, Upload, X,
} from 'lucide-react';
import { Link, Route, Switch, useLocation, useParams, Router as WouterRouter } from 'wouter';
import {
  getGetAdvisoryQueryKey, getGetDashboardSummaryQueryKey, getGetProfileQueryKey,
  getListAdvisoriesQueryKey, useCreateAdvisory, useDeleteAdvisory, useGetAdvisory,
  useGetDashboardSummary, useGetProfile, useListAdvisories, useUpdateProfile,
} from '@workspace/api-client-react';
import type { Advisory, AdvisoryInput, DashboardSummary, ProfileInput } from '@workspace/api-client-react';

const queryClient = new QueryClient();
const severityClasses: Record<string, string> = {
  Low: 'status-low', Moderate: 'status-moderate', High: 'status-high', Critical: 'status-critical',
};
const stages = ['Germination', 'Vegetative', 'Flowering', 'Fruiting', 'Maturation'] as const;
const advisorySeverity = (a: Advisory) => a.diagnosis?.severityLevel || 'Low';
const dateLabel = (date?: string) => date ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(date)) : '—';

function Severity({ value }: { value: string }) {
  return <span className={`status-pill ${severityClasses[value] || 'status-low'}`} data-testid={`status-severity-${value.toLowerCase()}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{value}</span>;
}
function LoadingPanel({ rows = 3 }: { rows?: number }) {
  return <div className="space-y-3" aria-label="Loading content" data-testid="state-loading">{Array.from({ length: rows }, (_, i) => <div key={i} className="skeleton h-[76px] rounded-xl" />)}</div>;
}
function ErrorState({ retry, label = 'We could not load this information.' }: { retry: () => void; label?: string }) {
  return <div className="panel flex flex-col items-start gap-3 p-6" data-testid="state-error"><p className="font-semibold">{label}</p><button className="button-secondary" onClick={retry} data-testid="button-retry">Try again</button></div>;
}
function EmptyState({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) {
  return <div className="panel flex flex-col items-center px-6 py-12 text-center" data-testid="state-empty"><div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-[#edf1e8] text-[#315e49]"><Sprout size={22} /></div><h3 className="serif text-xl">{title}</h3><p className="mt-2 max-w-sm text-sm leading-6 text-[#69766c]">{detail}</p>{action && <div className="mt-5">{action}</div>}</div>;
}
function Brand() {
  return <Link href="/dashboard" className="flex items-center gap-3" data-testid="link-brand"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e5b971] text-[#244d3d]"><Sprout size={22} strokeWidth={2.3} /></span><span><span className="serif block text-lg leading-5 text-[#fff7e8]">Fieldnote</span><span className="text-[10px] uppercase tracking-[.18em] text-[#bdcbbf]">crop advisory</span></span></Link>;
}
function Shell({ children }: { children: ReactNode }) {
  const [path] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navItems = [
    { href: '/dashboard', label: 'Overview', icon: Activity },
    { href: '/advisory/new', label: 'New assessment', icon: FilePlus2 },
    { href: '/history', label: 'Advisory archive', icon: BookOpen },
    { href: '/profile', label: 'Farm profile', icon: Settings2 },
  ];
  return <div className="app-shell flex">
    <aside className="sidebar fixed inset-y-0 left-0 z-30 hidden w-[252px] flex-col px-5 py-6 md:flex">
      <Brand />
      <div className="mt-11 px-3 text-[10px] font-bold uppercase tracking-[.19em] text-[#a9bcae]">Your workspace</div>
      <nav className="mt-3 space-y-1" aria-label="Main navigation">
        {navItems.map(({ href, label, icon: Icon }) => <Link href={href} key={href} className={`nav-link ${path === href || (href === '/dashboard' && path === '/') ? 'active' : ''}`} data-testid={`link-${label.toLowerCase().replaceAll(' ', '-')}`}><Icon size={17} strokeWidth={1.8} /><span>{label}</span></Link>)}
      </nav>
      <div className="mt-auto rounded-2xl border border-white/10 bg-[#ffffff0b] p-4">
        <div className="mb-3 flex items-center gap-2 text-[#e9c27d]"><ShieldCheck size={16} /><span className="text-xs font-bold">A record you can trust</span></div>
        <p className="text-xs leading-5 text-[#d1dacf]">Every field assessment stays organized, so the next decision starts with better context.</p>
      </div>
      <div className="mt-5 flex items-center gap-3 border-t border-white/10 pt-5">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-[#dce7d5] text-sm font-bold text-[#315e49]">F</span>
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">Farm workspace</p><p className="text-xs text-[#b7c8ba]">Field companion</p></div>
        <Link href="/profile" aria-label="Profile settings" className="text-[#c4d2c4] hover:text-white" data-testid="link-profile-settings"><Settings2 size={17} /></Link>
      </div>
    </aside>
    <div className="min-w-0 flex-1 md:ml-[252px]">
      <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-[#e6e1d4] bg-[#f7f4ec]/95 px-4 backdrop-blur md:px-9">
        <div className="flex items-center gap-3">
          <button aria-label="Open navigation" className="button-secondary !p-2 md:hidden" onClick={() => setMobileOpen(!mobileOpen)} data-testid="button-mobile-menu">{mobileOpen ? <X size={18} /> : <Menu size={18} />}</button>
          <div className="hidden items-center gap-2 text-xs text-[#748075] sm:flex"><span>Fieldnote</span><span>/</span><span className="font-semibold text-[#315e49]">{path === '/' ? 'Overview' : navItems.find(n => n.href === path)?.label || (path.includes('/advisory/') ? 'Advisory record' : 'Workspace')}</span></div>
          <span className="serif text-lg text-[#315e49] sm:hidden">Fieldnote</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-2 rounded-full border border-[#e3dfd3] bg-[#fffefb] px-3 py-2 text-xs text-[#66756b] sm:flex"><span className="h-2 w-2 rounded-full bg-[#77936d]" />Season-ready workspace</span>
          <Link href="/profile" className="grid h-9 w-9 place-items-center rounded-full bg-[#315e49] text-sm font-bold text-[#fff8e9]" data-testid="link-profile-avatar">F</Link>
        </div>
      </header>
      {mobileOpen && <nav className="mobile-nav hidden flex-col gap-1 border-b border-[#e6e1d4] bg-[#244d3d] p-3">{navItems.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setMobileOpen(false)} className={`nav-link ${path === href ? 'active' : ''}`} data-testid={`mobile-link-${label.toLowerCase().replaceAll(' ', '-')}`}><Icon size={17} />{label}</Link>)}</nav>}
      <main className="mx-auto w-full max-w-[1440px] px-4 py-7 md:px-9 md:py-9">{children}</main>
    </div>
  </div>;
}

function DashboardPage() {
  const query = useGetDashboardSummary();
  const profile = useGetProfile();
  const summary = query.data as DashboardSummary | undefined;
  return <div className="page-enter space-y-7">
    <section className="relative overflow-hidden rounded-[22px] bg-[#315e49] px-6 py-7 text-[#fff8eb] md:px-9 md:py-9">
      <div className="absolute -right-10 -top-20 h-72 w-72 rounded-full border border-white/10" /><div className="absolute -right-2 -top-12 h-56 w-56 rounded-full border border-white/10" />
      <div className="relative max-w-2xl">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs text-[#e6d9b9]"><Sun size={14} /> A clearer read on your fields</div>
        <h1 className="serif max-w-xl text-3xl leading-[1.12] md:text-[42px]">{profile.data?.fullName ? `Good to have you here, ${profile.data.fullName.split(' ')[0]}.` : 'A steadier hand for every growing season.'}</h1>
        <p className="mt-3 max-w-lg text-sm leading-6 text-[#d4e0d4] md:text-base">Bring crop symptoms, soil readings and local conditions together. Leave with practical next steps and a record you can return to.</p>
        <div className="mt-6 flex flex-wrap gap-3"><Link className="button-primary !bg-[#e6ba72] !text-[#244d3d] hover:!bg-[#f0c980]" href="/advisory/new" data-testid="button-start-assessment">Start an assessment <ArrowRight size={16} /></Link><Link className="inline-flex items-center gap-2 rounded-lg border border-white/25 px-4 py-2.5 text-sm font-semibold text-[#fff8eb] hover:bg-white/10" href="/history" data-testid="link-view-archive">View advisory archive</Link></div>
      </div>
      <div className="absolute bottom-7 right-10 hidden h-32 w-32 items-center justify-center rounded-full border border-[#d5b673]/45 md:flex"><div className="grid h-20 w-20 place-items-center rounded-full bg-[#d8b16c] text-[#315e49]"><Sprout size={34} /></div></div>
    </section>
    {query.isLoading ? <div className="grid gap-4 sm:grid-cols-3"><div className="skeleton h-28 rounded-2xl" /><div className="skeleton h-28 rounded-2xl" /><div className="skeleton h-28 rounded-2xl" /></div> : query.isError ? <ErrorState retry={() => query.refetch()} /> : <>
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric title="Assessments saved" value={summary?.totalAdvisories ?? 0} icon={<BookOpen size={18} />} accent="sage" note="Across your crop records" />
        <Metric title="Needs attention" value={summary?.highRiskCount ?? 0} icon={<AlertTriangle size={18} />} accent="ochre" note="High or critical severity" />
        <Metric title="Crops in view" value={summary?.cropCount ?? 0} icon={<Leaf size={18} />} accent="blue" note="Represented in your advisory history" />
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.25fr_.75fr]">
        <section className="panel p-5 md:p-6">
          <div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.15em] text-[#7b877c]">Field log</p><h2 className="serif mt-1 text-2xl">Recent advisories</h2></div><Link href="/history" className="inline-flex items-center gap-1 text-sm font-semibold text-[#315e49]" data-testid="link-all-advisories">All records <ArrowRight size={15} /></Link></div>
          {summary?.recentAdvisories?.length ? <div className="divide-y divide-[#ece8de]">{summary.recentAdvisories.slice(0, 5).map(a => <AdvisoryRow key={a.id} advisory={a} />)}</div> : <EmptyState title="Your field log starts here" detail="Create your first assessment to keep symptoms, conditions and recommended actions together." action={<Link href="/advisory/new" className="button-primary" data-testid="button-create-first">Create an assessment <ArrowRight size={15} /></Link>} />}
        </section>
        <section className="panel p-5 md:p-6">
          <div className="mb-5"><p className="text-xs font-bold uppercase tracking-[.15em] text-[#7b877c]">Risk snapshot</p><h2 className="serif mt-1 text-2xl">Severity at a glance</h2></div>
          {summary ? <div className="space-y-4">{(['Critical', 'High', 'Moderate', 'Low'] as const).map((level) => {
            const count = summary.severityCounts?.[level] ?? 0; const total = Math.max(summary.totalAdvisories, 1);
            return <div key={level} data-testid={`metric-severity-${level.toLowerCase()}`}><div className="mb-1.5 flex items-center justify-between"><Severity value={level} /><span className="mono text-xs text-[#68766a]">{count} <span className="text-[#9aa198">/ {summary.totalAdvisories}</span></span></div><div className="h-1.5 overflow-hidden rounded-full bg-[#eeeae0]"><div className="h-full rounded-full bg-[#719078] transition-all duration-500" style={{ width: `${Math.min(100, count / total * 100)}%` }} /></div></div>;
          })}</div> : <p className="text-sm text-[#718075]">No severity data available yet.</p>}
          <div className="mt-6 rounded-xl bg-[#f2f0e7] p-4"><div className="flex items-center gap-2 text-sm font-bold text-[#365846]"><CloudRain size={16} /> Keep conditions in context</div><p className="mt-1.5 text-xs leading-5 text-[#717d72]">Add current soil and weather readings when you assess a crop. Small details help make advice more relevant.</p></div>
        </section>
      </div>
      {summary?.latestAdvisory && <section className="flex flex-col gap-4 rounded-2xl border border-[#e1ddcf] bg-[#ebece2] p-5 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.13em] text-[#6e7d70]"><span className="h-1.5 w-1.5 rounded-full bg-[#729174]" /> Latest field note · {dateLabel(summary.latestAdvisory.createdAt)}</div><p className="serif mt-2 text-xl text-[#2f4f3d]">{summary.latestAdvisory.cropName} <span className="text-[#879286]">/</span> {summary.latestAdvisory.diagnosis?.identifiedIssue}</p></div><Link className="button-secondary shrink-0" href={`/advisory/${summary.latestAdvisory.id}`} data-testid="link-latest-advisory">Open record <ArrowRight size={15} /></Link></section>}
    </>}
  </div>;
}
function Metric({ title, value, icon, accent, note }: { title: string; value: number; icon: ReactNode; accent: string; note: string }) {
  const colors: Record<string, string> = { sage: 'bg-[#e5eee4] text-[#426b4d]', ochre: 'bg-[#f3ead7] text-[#9b762e]', blue: 'bg-[#e4ecec] text-[#477274]' };
  return <div className="panel p-5" data-testid={`metric-${title.toLowerCase().replaceAll(' ', '-')}`}><div className="flex items-start justify-between"><div><p className="text-sm font-semibold text-[#6d796f]">{title}</p><p className="mono mt-2 text-3xl font-semibold tracking-tight text-[#2c4a39]">{value}</p></div><span className={`grid h-10 w-10 place-items-center rounded-xl ${colors[accent]}`}>{icon}</span></div><p className="mt-2 text-xs text-[#899287]">{note}</p></div>;
}
function AdvisoryRow({ advisory }: { advisory: Advisory }) {
  return <Link href={`/advisory/${advisory.id}`} className="group flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0" data-testid={`row-advisory-${advisory.id}`}><div className="flex min-w-0 items-start gap-3"><span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#edf1e8] text-[#52775a]"><Leaf size={17} /></span><div className="min-w-0"><p className="truncate font-semibold text-[#33493a]">{advisory.cropName}<span className="mx-2 text-[#b7b6a9]">·</span><span className="font-normal text-[#6c786e]">{advisory.growthStage}</span></p><p className="mt-1 truncate text-xs text-[#869087]">{advisory.diagnosis?.identifiedIssue || advisory.symptomDescription}</p></div></div><div className="flex shrink-0 flex-col items-end gap-1.5"><Severity value={advisorySeverity(advisory)} /><span className="text-[11px] text-[#939b91]">{dateLabel(advisory.createdAt)}</span></div></Link>;
}

function AssessmentPage() {
  const create = useCreateAdvisory();
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const [image, setImage] = useState<{ base64: string; mime: string } | null>(null);
  const [form, setForm] = useState({
    cropName: '', growthStage: 'Vegetative', soilPh: '', nitrogen: '', phosphorus: '', potassium: '',
    temperatureC: '', humidityPercent: '', rainfallMm: '', symptomDescription: '', region: '',
  });
  const [error, setError] = useState('');
  const set = (key: string, value: string) => setForm(current => ({ ...current, [key]: value }));
  const onImage = (file?: File) => {
    if (!file) { setImage(null); return; }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setError('Choose a JPEG, PNG or WebP image.'); return; }
    const reader = new FileReader();
    reader.onload = () => setImage({ base64: String(reader.result).split(',')[1] || '', mime: file.type });
    reader.readAsDataURL(file);
  };
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError('');
    if (form.cropName.trim().length < 1 || form.symptomDescription.trim().length < 5) { setError('Add a crop name and describe the symptoms in at least five characters.'); return; }
    const values = ['soilPh', 'nitrogen', 'phosphorus', 'potassium', 'temperatureC', 'humidityPercent'];
    if (values.some(key => form[key as keyof typeof form] === '' || !Number.isFinite(Number(form[key as keyof typeof form])))) { setError('Complete all soil and weather readings with valid numbers.'); return; }
    const payload: AdvisoryInput = {
      cropName: form.cropName.trim(), growthStage: form.growthStage as AdvisoryInput['growthStage'],
      soilPh: Number(form.soilPh), nitrogen: Number(form.nitrogen), phosphorus: Number(form.phosphorus), potassium: Number(form.potassium),
      temperatureC: Number(form.temperatureC), humidityPercent: Number(form.humidityPercent),
      ...(form.rainfallMm !== '' ? { rainfallMm: Number(form.rainfallMm) } : {}),
      symptomDescription: form.symptomDescription.trim(),
      ...(form.region.trim() ? { region: form.region.trim() } : {}),
      ...(image ? { imageBase64: image.base64, imageMimeType: image.mime as AdvisoryInput['imageMimeType'] } : {}),
    };
    create.mutate({ data: payload }, { onSuccess: async (advisory) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: getListAdvisoriesQueryKey() }),
        qc.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() }),
      ]);
      navigate(`/advisory/${advisory.id}`);
    }, onError: () => setError('The assessment could not be saved. Please check the readings and try again.') });
  };
  const NumberField = ({ label, field, unit, min, max, step }: { label: string; field: keyof typeof form; unit?: string; min?: string; max?: string; step?: string }) => <label><span className="label">{label}{unit ? <span className="ml-1 normal-case tracking-normal text-[#98a095]">({unit})</span> : null}</span><input className="field" type="number" min={min} max={max} step={step || 'any'} required={field !== 'rainfallMm'} value={form[field]} onChange={e => set(field, e.target.value)} data-testid={`input-${field}`} /></label>;
  return <div className="page-enter mx-auto max-w-4xl">
    <div className="mb-7"><Link href="/dashboard" className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-[#65776a]" data-testid="link-back-dashboard">← Overview</Link><p className="text-xs font-bold uppercase tracking-[.16em] text-[#869184]">New field record</p><h1 className="serif mt-1 text-3xl text-[#2e4c3a] md:text-4xl">Start with what you see.</h1><p className="mt-2 max-w-xl text-sm leading-6 text-[#6e7a70]">A few field details help build a useful diagnosis and an organized record for later.</p></div>
    <form onSubmit={submit} className="space-y-5">
      <section className="panel p-5 md:p-7"><SectionHeading n="01" title="Crop & symptoms" detail="Describe the crop and what has changed." />
        <div className="mt-5 grid gap-4 md:grid-cols-2"><label><span className="label">Crop name</span><input className="field" required maxLength={100} placeholder="e.g. Maize" value={form.cropName} onChange={e => set('cropName', e.target.value)} data-testid="input-crop-name" /></label>
          <label><span className="label">Growth stage</span><select className="field" value={form.growthStage} onChange={e => set('growthStage', e.target.value)} data-testid="select-growth-stage">{stages.map(stage => <option key={stage}>{stage}</option>)}</select></label>
          <label className="md:col-span-2"><span className="label">What symptoms are you seeing?</span><textarea className="field min-h-[116px] resize-y" required minLength={5} maxLength={3000} placeholder="Describe visible changes, where they appear, and when you first noticed them." value={form.symptomDescription} onChange={e => set('symptomDescription', e.target.value)} data-testid="input-symptoms" /></label>
          <label className="md:col-span-2"><span className="label">Add a crop photo <span className="normal-case tracking-normal text-[#9ba397]">(optional)</span></span><div className="flex flex-wrap items-center gap-3"><label className="button-secondary cursor-pointer"><Upload size={15} /> Choose image<input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={e => onImage(e.target.files?.[0])} data-testid="input-crop-image" /></label>{image && <span className="inline-flex items-center gap-2 text-xs text-[#617267]"><Check size={14} /> Image attached <button type="button" onClick={() => setImage(null)} className="text-[#a35343]" data-testid="button-remove-image">Remove</button></span>}</div></label>
        </div>
      </section>
      <section className="panel p-5 md:p-7"><SectionHeading n="02" title="Soil readings" detail="Use your latest soil test, if available." /><div className="mt-5 grid gap-4 sm:grid-cols-3"><NumberField label="Soil pH" field="soilPh" min="3" max="10" step=".1" /><NumberField label="Nitrogen" field="nitrogen" unit="mg/kg" min="0" /><NumberField label="Phosphorus" field="phosphorus" unit="mg/kg" min="0" /><NumberField label="Potassium" field="potassium" unit="mg/kg" min="0" /></div></section>
      <section className="panel p-5 md:p-7"><SectionHeading n="03" title="Weather & place" detail="A local snapshot helps put crop stress in context." /><div className="mt-5 grid gap-4 sm:grid-cols-2"><NumberField label="Temperature" field="temperatureC" unit="°C" min="-20" max="70" /><NumberField label="Humidity" field="humidityPercent" unit="%" min="0" max="100" /><NumberField label="Rainfall" field="rainfallMm" unit="mm · optional" min="0" /><label><span className="label">Region <span className="normal-case tracking-normal text-[#9ba397]">(optional)</span></span><input className="field" maxLength={120} placeholder="District or region" value={form.region} onChange={e => set('region', e.target.value)} data-testid="input-region" /></label></div></section>
      {error && <div role="alert" className="rounded-xl border border-[#e5c6b9] bg-[#f9ece6] px-4 py-3 text-sm text-[#974d39]" data-testid="status-form-error">{error}</div>}
      <div className="flex flex-col-reverse justify-between gap-3 sm:flex-row sm:items-center"><p className="text-xs text-[#8a9389]">Your readings and symptoms are saved with the advisory.</p><button className="button-primary disabled:cursor-wait disabled:opacity-60" disabled={create.isPending} type="submit" data-testid="button-submit-assessment">{create.isPending ? 'Preparing your advice…' : 'Generate advisory'}{!create.isPending && <ArrowRight size={16} />}</button></div>
    </form>
  </div>;
}
function SectionHeading({ n, title, detail }: { n: string; title: string; detail: string }) {
  return <div className="flex items-start gap-3"><span className="mono mt-0.5 text-xs text-[#b08b4d]">{n}</span><div><h2 className="serif text-xl text-[#314d3a]">{title}</h2><p className="mt-1 text-xs text-[#859087]">{detail}</p></div></div>;
}

function AdvisoryDetail() {
  const { id = '' } = useParams<{ id: string }>();
  const query = useGetAdvisory(id, { query: { queryKey: getGetAdvisoryQueryKey(id) } });
  const deletion = useDeleteAdvisory();
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const advisory = query.data as Advisory | undefined;
  const [confirmDelete, setConfirmDelete] = useState(false);
  if (query.isLoading) return <div className="mx-auto max-w-5xl space-y-4"><div className="skeleton h-36 rounded-2xl" /><div className="skeleton h-72 rounded-2xl" /></div>;
  if (query.isError || !advisory) return <div className="mx-auto max-w-3xl"><ErrorState retry={() => query.refetch()} label="This advisory record could not be found." /></div>;
  const diagnosis = advisory.diagnosis;
  const doDelete = () => deletion.mutate({ id }, { onSuccess: async () => { await Promise.all([qc.invalidateQueries({ queryKey: getListAdvisoriesQueryKey() }), qc.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() }), qc.removeQueries({ queryKey: getGetAdvisoryQueryKey(id) })]); navigate('/history'); } });
  return <div className="page-enter mx-auto max-w-5xl space-y-5">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><Link href="/history" className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-[#65776a]" data-testid="link-back-history">← Advisory archive</Link><div className="flex flex-wrap items-center gap-3"><h1 className="serif text-3xl text-[#2e4c3a] md:text-4xl">{advisory.cropName}</h1><Severity value={advisorySeverity(advisory)} /></div><p className="mt-2 text-sm text-[#7d897e]">{advisory.growthStage} stage <span className="mx-2">·</span> Recorded {dateLabel(advisory.createdAt)}{advisory.region && <><span className="mx-2">·</span><MapPin className="mr-1 inline" size={13} />{advisory.region}</>}</p></div>
      <button onClick={() => setConfirmDelete(true)} disabled={deletion.isPending} className="button-secondary !text-[#a34f40]" data-testid="button-delete-advisory"><Trash2 size={15} /> Delete record</button></div>
    <section className="relative overflow-hidden rounded-[20px] bg-[#315e49] p-6 text-[#fff7e9] md:p-8"><div className="flex flex-col justify-between gap-5 sm:flex-row"><div className="max-w-2xl"><div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-[#e4c27f]"><ShieldCheck size={15} /> Advisory summary</div><h2 className="serif text-2xl leading-snug md:text-3xl" data-testid="text-diagnosis-summary">{diagnosis.diagnosisSummary}</h2><p className="mt-3 text-sm text-[#cfddd0]">Identified issue: <strong className="text-white">{diagnosis.identifiedIssue}</strong></p></div><div className="flex shrink-0 items-center gap-3 self-start rounded-xl border border-white/15 bg-white/5 p-4"><div className="mono text-3xl font-semibold text-[#e6bf78]">{diagnosis.confidenceScore}<span className="text-base">%</span></div><div className="text-[10px] uppercase leading-4 tracking-[.13em] text-[#d0ded0]">Confidence<br />assessment</div></div></div></section>
    <div className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
      <section className="panel p-5 md:p-6"><p className="text-xs font-bold uppercase tracking-[.14em] text-[#829084]">Field conditions</p><h2 className="serif mt-1 text-xl">At time of assessment</h2><div className="mt-5 grid grid-cols-2 gap-3">
        <Reading icon={<Activity size={16} />} label="Soil pH" value={advisory.soilPh} /><Reading icon={<Thermometer size={16} />} label="Temperature" value={`${advisory.temperatureC}°C`} /><Reading icon={<Droplets size={16} />} label="Humidity" value={`${advisory.humidityPercent}%`} /><Reading icon={<CloudRain size={16} />} label="Rainfall" value={advisory.rainfallMm != null ? `${advisory.rainfallMm} mm` : 'Not recorded'} />
        <Reading icon={<Leaf size={16} />} label="Nitrogen" value={advisory.nitrogen} /><Reading icon={<Leaf size={16} />} label="Phosphorus" value={advisory.phosphorus} /><Reading icon={<Leaf size={16} />} label="Potassium" value={advisory.potassium} />
      </div><div className="mt-5 rounded-xl bg-[#f1efe7] p-4"><p className="label !mb-1">Symptoms noted</p><p className="text-sm leading-6 text-[#5e6f62]">{advisory.symptomDescription}</p></div>{advisory.imageBase64 && <img className="mt-4 max-h-64 w-full rounded-xl object-cover" src={`data:${advisory.imageMimeType || 'image/jpeg'};base64,${advisory.imageBase64}`} alt={`Crop symptom photo for ${advisory.cropName}`} data-testid="img-advisory-evidence" />}</section>
      <div className="space-y-5"><ActionList title="Organic treatments" items={diagnosis.organicTreatments} kind="organic" /><ActionList title="Chemical treatments" items={diagnosis.chemicalTreatments} kind="chemical" /><ActionList title="Preventive measures" items={diagnosis.preventiveMeasures} kind="preventive" /></div>
    </div>
    <section className="flex flex-col gap-4 rounded-2xl border border-[#e4dfd2] bg-[#efeee4] p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#788579]">Expected impact</p><p className="serif mt-1 text-xl text-[#33513e]" data-testid="text-yield-impact">{diagnosis.estimatedYieldImpact}</p></div><Link className="button-secondary shrink-0" href="/advisory/new" data-testid="button-new-assessment">Assess another crop <ArrowRight size={15} /></Link></section>
    {confirmDelete && <div className="fixed inset-0 z-50 grid place-items-center bg-[#182b21]/45 p-4" role="presentation"><div className="w-full max-w-md rounded-2xl border border-[#e5dfd1] bg-[#fffefb] p-6 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="delete-title"><h2 className="serif text-2xl" id="delete-title">Delete this record?</h2><p className="mt-2 text-sm leading-6 text-[#718075]">This advisory will be removed from your archive. This action cannot be undone.</p>{deletion.isError && <p className="mt-3 text-sm text-[#a34f40]" role="alert">The record could not be deleted. Please try again.</p>}<div className="mt-6 flex justify-end gap-2"><button className="button-secondary" onClick={() => setConfirmDelete(false)} data-testid="button-cancel-delete">Keep record</button><button className="button-primary !bg-[#a34f40]" onClick={doDelete} disabled={deletion.isPending} data-testid="button-confirm-delete">{deletion.isPending ? 'Deleting…' : 'Delete record'}</button></div></div></div>}
  </div>;
}
function Reading({ icon, label, value }: { icon: ReactNode; label: string; value: string | number }) {
  return <div className="rounded-xl bg-[#f6f4ed] p-3" data-testid={`reading-${label.toLowerCase().replaceAll(' ', '-')}`}><div className="flex items-center gap-1.5 text-[#79907b]">{icon}<span className="text-[10px] font-bold uppercase tracking-[.09em] text-[#879187]">{label}</span></div><p className="mono mt-2 text-sm font-semibold text-[#365342]">{value}</p></div>;
}
function ActionList({ title, items, kind }: { title: string; items: string[]; kind: string }) {
  return <section className="panel p-5 md:p-6" data-testid={`section-${kind}-actions`}><h2 className="serif text-xl text-[#334f3e]">{title}</h2>{items?.length ? <ul className="mt-4 space-y-3">{items.map((item, index) => <li key={`${kind}-${index}`} className="flex gap-3 text-sm leading-6 text-[#5f6e62]"><span className="mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#e8eee4] text-[#57775b]"><Check size={12} /></span><span>{item}</span></li>)}</ul> : <p className="mt-3 text-sm text-[#8a9389]">No recommendations listed.</p>}</section>;
}

function HistoryPage() {
  const [draftSearch, setDraftSearch] = useState('');
  const [search, setSearch] = useState('');
  const [crop, setCrop] = useState('');
  const [severity, setSeverity] = useState('');
  const params = useMemo(() => ({ ...(crop ? { cropName: crop } : {}), ...(severity ? { severity: severity as 'Low' | 'Moderate' | 'High' | 'Critical' } : {}), ...(search.trim() ? { search: search.trim() } : {}) }), [crop, severity, search]);
  const query = useListAdvisories(Object.keys(params).length ? params : undefined);
  const advisories = (query.data || []) as Advisory[];
  const crops = useMemo(() => Array.from(new Set(advisories.map(item => item.cropName))).sort(), [advisories]);
  const clear = () => { setCrop(''); setSeverity(''); setSearch(''); setDraftSearch(''); };
  return <div className="page-enter space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#879184]">Your records</p><h1 className="serif mt-1 text-3xl text-[#2e4c3a] md:text-4xl">Advisory archive</h1><p className="mt-2 text-sm text-[#758075]">Find earlier field notes and revisit the action plan.</p></div><span className="mono text-sm text-[#829084]" data-testid="text-archive-count">{query.isLoading ? '…' : `${advisories.length} ${advisories.length === 1 ? 'record' : 'records'}`}</span></div>
    <form className="panel flex flex-col gap-3 p-4 md:flex-row md:items-center" onSubmit={e => { e.preventDefault(); setSearch(draftSearch); }}><label className="relative min-w-0 flex-1"><span className="sr-only">Search advisories</span><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#849084]" size={16} /><input className="field !pl-10" placeholder="Search crop, symptoms or diagnosis" value={draftSearch} onChange={e => setDraftSearch(e.target.value)} data-testid="input-search-advisories" /></label><label className="min-w-[155px]"><span className="sr-only">Filter by crop</span><select className="field" value={crop} onChange={e => setCrop(e.target.value)} data-testid="select-filter-crop"><option value="">All crops</option>{crops.map(item => <option value={item} key={item}>{item}</option>)}</select></label><label className="min-w-[155px]"><span className="sr-only">Filter by severity</span><select className="field" value={severity} onChange={e => setSeverity(e.target.value)} data-testid="select-filter-severity"><option value="">All severity</option>{['Critical', 'High', 'Moderate', 'Low'].map(item => <option value={item} key={item}>{item}</option>)}</select></label><button className="button-primary" type="submit" data-testid="button-search-advisories"><Filter size={15} /> Search</button><button className="button-secondary" type="button" onClick={clear} data-testid="button-clear-filters">Clear</button></form>
    {query.isLoading ? <LoadingPanel rows={5} /> : query.isError ? <ErrorState retry={() => query.refetch()} /> : advisories.length ? <section className="panel divide-y divide-[#ece8de] px-5 md:px-6">{advisories.map(a => <AdvisoryRow key={a.id} advisory={a} />)}</section> : <EmptyState title={search || crop || severity ? 'No matching records' : 'Nothing in the archive yet'} detail={search || crop || severity ? 'Try a different crop, severity or search phrase.' : 'Your saved crop assessments will appear here, ready to revisit.'} action={search || crop || severity ? <button className="button-secondary" onClick={clear} data-testid="button-empty-clear">Clear filters</button> : <Link className="button-primary" href="/advisory/new" data-testid="button-archive-create">Create first assessment <ArrowRight size={15} /></Link>} />}
  </div>;
}

function ProfilePage() {
  const query = useGetProfile();
  const update = useUpdateProfile();
  const qc = useQueryClient();
  const [form, setForm] = useState<ProfileInput>({ fullName: '', region: '', role: 'farmer', primaryCrops: [] });
  const [loaded, setLoaded] = useState(false);
  const [cropDraft, setCropDraft] = useState('');
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (query.data && !loaded) {
      const profile = query.data;
      setForm({ fullName: profile.fullName, region: profile.region, role: profile.role, primaryCrops: [...profile.primaryCrops] });
      setLoaded(true);
    }
  }, [query.data, loaded]);
  const set = (key: 'fullName' | 'region' | 'role', value: string) => { setSaved(false); setForm(current => ({ ...current, [key]: value })); };
  const addCrop = () => { const value = cropDraft.trim(); if (value && !form.primaryCrops.some(c => c.toLowerCase() === value.toLowerCase()) && form.primaryCrops.length < 10) { setForm(current => ({ ...current, primaryCrops: [...current.primaryCrops, value] })); setCropDraft(''); setSaved(false); } };
  const save = (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); setSaved(false); update.mutate({ data: form }, { onSuccess: async () => { await qc.invalidateQueries({ queryKey: getGetProfileQueryKey() }); setSaved(true); }, onError: () => setSaved(false) }); };
  if (query.isLoading) return <div className="mx-auto max-w-3xl space-y-4"><div className="skeleton h-28 rounded-2xl" /><div className="skeleton h-80 rounded-2xl" /></div>;
  if (query.isError) return <div className="mx-auto max-w-3xl"><ErrorState retry={() => query.refetch()} /></div>;
  return <div className="page-enter mx-auto max-w-3xl space-y-6">
    <div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#879184]">Workspace details</p><h1 className="serif mt-1 text-3xl text-[#2e4c3a] md:text-4xl">Your farm profile</h1><p className="mt-2 text-sm text-[#758075]">Keep your region and crops close to hand for future assessments.</p></div>
    <div className="flex items-center gap-4 rounded-2xl bg-[#315e49] p-5 text-[#fff8eb]"><span className="grid h-14 w-14 place-items-center rounded-full bg-[#e6ba72] text-xl font-bold text-[#315e49]">{form.fullName ? form.fullName.split(/\s+/).map(s => s[0]).slice(0, 2).join('').toUpperCase() : 'F'}</span><div><p className="serif text-xl">{form.fullName || 'Farm profile'}</p><p className="mt-1 flex items-center gap-1.5 text-xs text-[#d4dfd4]"><MapPin size={13} />{form.region || 'Region not set'}<span className="mx-1">·</span>{form.role}</p></div></div>
    <form className="panel space-y-6 p-5 md:p-7" onSubmit={save}>
      <div><h2 className="serif text-xl text-[#314d3a]">About you</h2><p className="mt-1 text-xs text-[#859087]">A few details help personalize your advisory workspace.</p><div className="mt-5 grid gap-4 sm:grid-cols-2"><label><span className="label">Full name</span><input className="field" required minLength={2} maxLength={120} value={form.fullName} onChange={e => set('fullName', e.target.value)} data-testid="input-profile-name" /></label><label><span className="label">Region</span><input className="field" maxLength={120} placeholder="Your region" value={form.region} onChange={e => set('region', e.target.value)} data-testid="input-profile-region" /></label><label><span className="label">Your role</span><select className="field" value={form.role} onChange={e => set('role', e.target.value)} data-testid="select-profile-role"><option value="farmer">Farmer</option><option value="agronomist">Agronomist</option><option value="admin">Admin</option></select></label></div></div>
      <div className="border-t border-[#ece8de] pt-5"><h2 className="serif text-xl text-[#314d3a]">Primary crops</h2><p className="mt-1 text-xs text-[#859087]">Up to 10 crops you work with most often.</p><div className="mt-4 flex gap-2"><input className="field" placeholder="Add a crop" value={cropDraft} onChange={e => setCropDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCrop(); } }} data-testid="input-primary-crop" /><button type="button" className="button-secondary shrink-0" onClick={addCrop} disabled={!cropDraft.trim() || form.primaryCrops.length >= 10} data-testid="button-add-crop">Add crop</button></div>
        {form.primaryCrops.length ? <div className="mt-4 flex flex-wrap gap-2">{form.primaryCrops.map(crop => <span key={crop} className="inline-flex items-center gap-2 rounded-full bg-[#edf1e8] px-3 py-1.5 text-sm font-semibold text-[#42634d]" data-testid={`tag-crop-${crop.toLowerCase().replaceAll(' ', '-')}`}>{crop}<button type="button" aria-label={`Remove ${crop}`} className="text-[#718675] hover:text-[#a34f40]" onClick={() => { setForm(current => ({ ...current, primaryCrops: current.primaryCrops.filter(item => item !== crop) })); setSaved(false); }} data-testid={`button-remove-crop-${crop.toLowerCase().replaceAll(' ', '-')}`}><X size={14} /></button></span>)}</div> : <p className="mt-4 text-sm text-[#91998f]">No primary crops added.</p>}
      </div>
      {update.isError && <p role="alert" className="rounded-lg bg-[#f9ece6] p-3 text-sm text-[#974d39]" data-testid="status-profile-error">Your profile could not be saved. Please try again.</p>}
      {saved && <p role="status" className="inline-flex items-center gap-2 text-sm font-semibold text-[#3f704d]" data-testid="status-profile-saved"><Check size={16} /> Profile saved</p>}
      <div className="flex justify-end border-t border-[#ece8de] pt-5"><button className="button-primary" disabled={update.isPending} type="submit" data-testid="button-save-profile">{update.isPending ? 'Saving…' : 'Save profile'}{!update.isPending && <Check size={15} />}</button></div>
    </form>
  </div>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}
function Router() {
  return <RoutedErrorBoundary><Shell><Switch>
    <Route path="/" component={DashboardPage} />
    <Route path="/dashboard" component={DashboardPage} />
    <Route path="/advisory/new" component={AssessmentPage} />
    <Route path="/advisory/:id" component={AdvisoryDetail} />
    <Route path="/history" component={HistoryPage} />
    <Route path="/profile" component={ProfilePage} />
    <Route component={NotFound} />
  </Switch></Shell></RoutedErrorBoundary>;
}
function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}
export default App;
