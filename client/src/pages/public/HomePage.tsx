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
      <section className="brand-gradient-hero relative overflow-hidden py-28 px-6 text-white">
        <div className="absolute -top-24 -right-24 size-96 rounded-full bg-white/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 -left-16 size-72 rounded-full bg-[#00c9a8]/10 blur-3xl pointer-events-none" />

        <div className="relative max-w-3xl mx-auto text-center">
          <div className="flex justify-center mb-6">
            <div className="size-20 overflow-hidden shadow-2xl shadow-black/30" style={{ borderRadius: '6px' }}>
              <AppLogo size={80} />
            </div>
          </div>

          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white/90 text-xs font-medium px-3 py-1.5 rounded-full mb-6">
            Université de Béjaïa — Département Informatique
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
            Gérez vos{' '}
            <span className="text-[#00c9a8]">Projets de Fin d'Études</span>
            {' '}en ligne
          </h1>

          <p className="mt-5 text-lg text-white/70 max-w-xl mx-auto leading-relaxed">
            e-PFE centralise la proposition de thèmes, la formation de binômes,
            les affectations et la planification des soutenances pour les étudiants M2.
          </p>

          <div className="mt-9 flex gap-3 flex-wrap justify-center">
            {isAuthenticated ? (
              <Link to={dashLink}>
                <Button size="lg" className="brand-gradient gap-2 shadow-lg">
                  Accéder à mon espace <ArrowRight className="size-4" />
                </Button>
              </Link>
            ) : (
              <Link to="/connexion">
                <Button size="lg" className="brand-gradient gap-2 shadow-lg">
                  Se connecter <ArrowRight className="size-4" />
                </Button>
              </Link>
            )}
            <Link to="/chatbot">
              <Button size="lg" variant="outline" className="border-white/30 text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm">
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
