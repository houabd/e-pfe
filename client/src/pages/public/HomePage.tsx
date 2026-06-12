import { Link } from 'react-router-dom';
import { BookOpen, Users, Calendar, BarChart2, GraduationCap, Shield, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore, useUserRole } from '@/stores/authStore';
import type { Role } from '@/types';

const DASHBOARD_LINK: Record<Role, string> = {
  ETUDIANT:       '/etudiant',
  ENSEIGNANT:     '/enseignant',
  RESP_SPECIALITE:'/enseignant',
  CHEF_DEPT:      '/admin',
  CHEF_EQUIPE:    '/admin',
  TECHNICIEN:     '/admin',
};

const FEATURES = [
  {
    icon: <BookOpen className="size-5 text-white" />,
    title: 'Gestion des thèmes',
    description: 'Proposez, consultez et choisissez vos thèmes de PFC en ligne, avec classement par préférence.',
    color: 'from-[#009474] to-[#007a5f]',
  },
  {
    icon: <Users className="size-5 text-white" />,
    title: 'Formation de binômes',
    description: 'Recherchez un partenaire par spécialité et constituez votre binôme simplement.',
    color: 'from-[#009474] to-[#00b08a]',
  },
  {
    icon: <Calendar className="size-5 text-white" />,
    title: 'Planification des soutenances',
    description: 'Consultez le calendrier des soutenances et recevez vos convocations automatiquement.',
    color: 'from-[#007a5f] to-[#009474]',
  },
  {
    icon: <BarChart2 className="size-5 text-white" />,
    title: 'Statistiques en temps réel',
    description: "Suivez l'avancement des affectations et des soutenances par spécialité.",
    color: 'from-[#1a1a1a] to-[#3d3d3d]',
  },
  {
    icon: <GraduationCap className="size-5 text-white" />,
    title: 'Suivi des étudiants',
    description: 'Les enseignants suivent leurs étudiants encadrés depuis un espace dédié.',
    color: 'from-[#009474] to-[#007a5f]',
  },
  {
    icon: <Shield className="size-5 text-white" />,
    title: 'Accès sécurisé par rôle',
    description: 'Chaque utilisateur accède uniquement aux fonctionnalités de son rôle.',
    color: 'from-[#1a1a1a] to-[#009474]',
  },
];

const ROLES_INFO = [
  { label: 'Étudiants M2',   desc: 'Choisissez votre thème et gérez votre binôme',   color: 'border-[#e8e8e8] bg-[#f7f7f7]' },
  { label: 'Enseignants',    desc: 'Proposez des thèmes et encadrez vos étudiants',   color: 'border-[#009474] bg-[#ccede6]/30' },
  { label: 'Administration', desc: 'Gérez les sessions, affectations et soutenances', color: 'border-[#1a1a1a] bg-[#1a1a1a]/5' },
];

export default function HomePage() {
  const { isAuthenticated } = useAuthStore();
  const role = useUserRole();
  const dashLink = role ? DASHBOARD_LINK[role] : '/connexion';

  return (
    <div className="flex flex-col">

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section
        className="brand-gradient-hero relative overflow-hidden text-white flex items-center"
        style={{ minHeight: 'calc(100vh - 4rem)' }}
      >
        {/* Wave layers — decorative, like the image */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 1200 600"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          {/* Wave 1 — lightest, highest */}
          <path
            d="M0,160 C150,100 380,220 600,155 C820,90 1050,175 1200,130 L1200,600 L0,600 Z"
            fill="rgba(0,184,148,0.18)"
          />
          {/* Wave 2 — medium */}
          <path
            d="M0,290 C180,220 420,320 680,255 C880,205 1080,275 1200,240 L1200,600 L0,600 Z"
            fill="rgba(0,148,116,0.22)"
          />
          {/* Wave 3 — darkest, lowest */}
          <path
            d="M0,420 C220,355 480,445 750,380 C960,330 1100,390 1200,360 L1200,600 L0,600 Z"
            fill="rgba(0,90,70,0.30)"
          />
        </svg>

        <div className="relative w-full max-w-5xl mx-auto px-6 py-10 flex flex-col lg:flex-row items-center gap-10 lg:gap-16">

          {/* Left — text */}
          <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left">

            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/25 text-white/90 text-xs font-medium px-3 py-1.5 rounded-full mb-5 tracking-wide">
              Université de Béjaïa · Département Informatique
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
              Plateforme de gestion<br />
              <span className="underline decoration-white/30 decoration-2 underline-offset-4">
                des Projets de Fin de Cycle
              </span>
            </h1>

            <p className="mt-4 text-sm sm:text-base text-white/90 max-w-lg leading-relaxed" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.15)' }}>
              Propositions de thèmes, formation de binômes, affectations enseignants
              et planification des soutenances — tout en un.
            </p>

            <div className="mt-7 flex gap-3 flex-wrap justify-center lg:justify-start">
              {isAuthenticated ? (
                <Link to={dashLink}>
                  <Button size="lg" className="gap-2 bg-white text-[#009474] hover:bg-white/90 font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
                    Accéder à mon espace <ArrowRight className="size-4" />
                  </Button>
                </Link>
              ) : (
                <Link to="/connexion">
                  <Button size="lg" className="gap-2 bg-white text-[#009474] hover:bg-white/90 font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
                    Se connecter <ArrowRight className="size-4" />
                  </Button>
                </Link>
              )}
              <Link to="/chatbot">
                <Button size="lg" variant="outline" className="border-white/40 text-white bg-white/10 hover:bg-white/20 hover:scale-[1.02] transition-all duration-200">
                  Assistant IA
                </Button>
              </Link>
            </div>
          </div>

          {/* Right — logos */}
          <div className="flex lg:flex-col items-center gap-6 lg:gap-5 shrink-0">
            <div className="size-24 sm:size-28 bg-white/10 rounded-2xl flex items-center justify-center p-3 backdrop-blur-sm border border-white/20 shadow-lg">
              <img src="/logo/univ.png" alt="Université de Béjaïa" style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
            </div>
            <div className="hidden lg:block w-10 h-px bg-white/30" />
            <div className="size-24 sm:size-28 bg-white/10 rounded-2xl flex items-center justify-center p-3 backdrop-blur-sm border border-white/20 shadow-lg">
              <img src="/logo/logo1.png" alt="E-pfc" style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
            </div>
          </div>
        </div>

        {/* Wave bottom */}
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
          <svg viewBox="0 0 1440 40" preserveAspectRatio="none" className="w-full h-8 fill-background">
            <path d="M0,40 C360,0 1080,0 1440,40 L1440,40 L0,40 Z" />
          </svg>
        </div>
      </section>

      {/* ── Roles ───────────────────────────────────────────────────────── */}
      <section className="py-14 px-6 bg-background">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {ROLES_INFO.map((r) => (
              <div key={r.label} className={`border-2 p-5 ${r.color}`} style={{ borderRadius: '4px' }}>
                <p className="font-semibold text-foreground">{r.label}</p>
                <p className="text-sm text-muted-foreground mt-1">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-secondary/40">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-foreground">Tout ce dont vous avez besoin</h2>
            <p className="text-muted-foreground mt-2">Une plateforme complète pour tous les acteurs du PFE</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="border bg-card p-6 space-y-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200" style={{ borderRadius: '4px' }}>
                <div className={`size-10 bg-gradient-to-br ${f.color} flex items-center justify-center shadow-sm`} style={{ borderRadius: '4px' }}>
                  {f.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-base">{f.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{f.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section className="py-20 px-6 text-center brand-gradient-hero text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10 pointer-events-none" />
        <div className="relative">
          <h2 className="text-3xl font-bold mb-3">Prêt à commencer ?</h2>
          <p className="text-white/75 mb-8 max-w-md mx-auto">
            Connectez-vous avec vos identifiants universitaires et accédez à votre espace personnalisé.
          </p>
          {isAuthenticated ? (
            <Link to={dashLink}>
              <Button size="lg" className="bg-white text-[#009474] hover:bg-white/90 shadow-md gap-2">
                Mon tableau de bord <ArrowRight className="size-4" />
              </Button>
            </Link>
          ) : (
            <Link to="/connexion">
              <Button size="lg" className="bg-white text-[#009474] hover:bg-white/90 shadow-md gap-2">
                Se connecter <ArrowRight className="size-4" />
              </Button>
            </Link>
          )}
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t py-6 px-6 flex items-center justify-between text-sm text-muted-foreground bg-background">
        <div className="flex items-center gap-2">
          <img src="/logo/logo1.png" alt="e-PFC" className="h-8 w-auto object-contain" />
          <span className="font-semibold text-[#009474]">e-PFC</span>
        </div>
        <span>© {new Date().getFullYear()} Université de Béjaïa — Département Informatique</span>
      </footer>
    </div>
  );
}
