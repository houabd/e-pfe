import { Link } from 'react-router-dom';
import { BookOpen, Users, Calendar, BarChart2, GraduationCap, Shield, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppLogo } from '@/components/ui/AppLogo';
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
    description: 'Proposez, consultez et choisissez vos thèmes de PFE en ligne, avec classement par préférence.',
    color: 'from-[#1e72d8] to-[#1a5fc0]',
  },
  {
    icon: <Users className="size-5 text-white" />,
    title: 'Formation de binômes',
    description: 'Recherchez un partenaire par spécialité et constituez votre binôme simplement.',
    color: 'from-[#00c9a8] to-[#00a88e]',
  },
  {
    icon: <Calendar className="size-5 text-white" />,
    title: 'Planification des soutenances',
    description: 'Consultez le calendrier des soutenances et recevez vos convocations automatiquement.',
    color: 'from-[#1e72d8] to-[#00c9a8]',
  },
  {
    icon: <BarChart2 className="size-5 text-white" />,
    title: 'Statistiques en temps réel',
    description: "Suivez l'avancement des affectations et des soutenances par spécialité.",
    color: 'from-[#0d1f70] to-[#1e72d8]',
  },
  {
    icon: <GraduationCap className="size-5 text-white" />,
    title: 'Suivi des étudiants',
    description: 'Les enseignants suivent leurs étudiants encadrés depuis un espace dédié.',
    color: 'from-[#00c9a8] to-[#1e72d8]',
  },
  {
    icon: <Shield className="size-5 text-white" />,
    title: 'Accès sécurisé par rôle',
    description: 'Chaque utilisateur accède uniquement aux fonctionnalités de son rôle.',
    color: 'from-[#1752d4] to-[#0d1f70]',
  },
];

const ROLES_INFO = [
  { label: 'Étudiants M2',  desc: 'Choisissez votre thème et gérez votre binôme',    color: 'border-[#00c9a8] bg-[#00c9a8]/5' },
  { label: 'Enseignants',   desc: 'Proposez des thèmes et encadrez vos étudiants',    color: 'border-[#1e72d8] bg-[#1e72d8]/5' },
  { label: 'Administration',desc: 'Gérez les sessions, affectations et soutenances',  color: 'border-[#0d1f70] bg-[#0d1f70]/5' },
];

export default function HomePage() {
  const { isAuthenticated } = useAuthStore();
  const role = useUserRole();
  const dashLink = role ? DASHBOARD_LINK[role] : '/connexion';

  return (
    <div className="flex flex-col">

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="brand-gradient-hero relative overflow-hidden text-white" style={{ minHeight: '60vh' }}>
        {/* Background orbs */}
        <div className="absolute -top-32 -right-32 size-[500px] rounded-full bg-white/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 -left-24 size-80 rounded-full bg-[#00c9a8]/10 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[600px] rounded-full bg-[#1e72d8]/10 blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto px-6 py-20 flex flex-col items-center text-center">

          {/* Dual logos */}
          <div className="flex items-center justify-center gap-6 sm:gap-10 mb-8">
            {/* UB logo */}
            <div className="flex flex-col items-center gap-2">
              <div className="size-20 sm:size-28 flex items-center justify-center">
                <img
                  src="/logo/univ.png"
                  alt="Université de Béjaïa"
                  width={110}
                  height={110}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    filter: 'brightness(0) invert(1)'
                  }}
                />
              </div>
            </div>

            

            {/* e-PFE logo */}
            <div className="flex flex-col items-center gap-2">
              <div className="size-20 sm:size-28 flex items-center justify-center">
                <img
                  src="/logo.png"
                  alt="e-PFE"
                  width={110}
                  height={110}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Institution badge */}
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white/90 text-xs font-medium px-4 py-1.5 rounded-full mb-6 tracking-wide">
            Université de Béjaïa — Faculté des Sciences Exactes — Département Informatique
          </div>

          {/* Heading */}
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight"
            style={{ fontFamily: "'Libre Baskerville', Georgia, serif" }}
          >
            Plateforme de Gestion des{' '}
            <span className="text-[#00c9a8]">PFE</span>
          </h1>

          <p className="mt-5 text-base sm:text-lg text-white/70 max-w-2xl mx-auto leading-relaxed">
            Gérez vos projets de fin d'études de A à Z — propositions de thèmes, formation de binômes,
            affectations enseignants et planification des soutenances, tout en un.
          </p>

          {/* CTA buttons */}
          <div className="mt-10 flex gap-3 flex-wrap justify-center">
            {isAuthenticated ? (
              <Link to={dashLink}>
                <Button
                  size="lg"
                  className="gap-2 bg-white text-[#0d1f70] hover:bg-white/90 font-semibold shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-200"
                  style={{ borderRadius: '6px' }}
                >
                  Accéder à mon espace <ArrowRight className="size-4" />
                </Button>
              </Link>
            ) : (
              <Link to="/connexion">
                <Button
                  size="lg"
                  className="gap-2 bg-white text-[#0d1f70] hover:bg-white/90 font-semibold shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-200"
                  style={{ borderRadius: '6px' }}
                >
                  Se connecter <ArrowRight className="size-4" />
                </Button>
              </Link>
            )}
            <Link to="/chatbot">
              <Button
                size="lg"
                variant="outline"
                className="border-white/30 text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm hover:scale-[1.02] transition-all duration-200"
                style={{ borderRadius: '6px' }}
              >
                Consulter l'assistant IA
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Roles ───────────────────────────────────────────────────────── */}
      <section className="py-14 px-6 bg-background">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {ROLES_INFO.map((r) => (
              <div key={r.label} className={`border-2 p-5 ${r.color}`} style={{ borderRadius: '3px' }}>
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
            <h2 className="text-3xl font-bold text-foreground">
              Tout ce dont vous avez besoin
            </h2>
            <p className="text-muted-foreground mt-2">Une plateforme complète pour tous les acteurs du PFE</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="border bg-card p-6 space-y-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                style={{ borderRadius: '3px' }}
              >
                <div className={`size-10 bg-gradient-to-br ${f.color} flex items-center justify-center shadow-sm`} style={{ borderRadius: '3px' }}>
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
        <div className="absolute inset-0 bg-[#00c9a8]/5 pointer-events-none" />
        <div className="relative">
          <h2 className="text-3xl font-bold mb-3">Prêt à commencer ?</h2>
          <p className="text-white/70 mb-8 max-w-md mx-auto">
            Connectez-vous avec vos identifiants universitaires et accédez à votre espace personnalisé.
          </p>
          {isAuthenticated ? (
            <Link to={dashLink}>
              <Button size="lg" className="bg-white text-[#0d1f70] hover:bg-white/90 font-semibold gap-2" style={{ borderRadius: '3px' }}>
                Mon tableau de bord <ArrowRight className="size-4" />
              </Button>
            </Link>
          ) : (
            <Link to="/connexion">
              <Button size="lg" className="bg-white text-[#0d1f70] hover:bg-white/90 font-semibold gap-2" style={{ borderRadius: '3px' }}>
                Se connecter <ArrowRight className="size-4" />
              </Button>
            </Link>
          )}
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t py-6 px-6 flex items-center justify-between text-sm text-muted-foreground bg-background">
        <div className="flex items-center gap-2">
          <div className="size-6 overflow-hidden" style={{ borderRadius: '3px' }}>
            <AppLogo size={24} />
          </div>
          <span className="font-semibold text-foreground" style={{ fontFamily: "'Libre Baskerville', Georgia, serif" }}>e-PFE</span>
        </div>
        <span>© {new Date().getFullYear()} Université de Béjaïa — Département Informatique</span>
      </footer>
    </div>
  );
}
