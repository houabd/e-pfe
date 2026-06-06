import { createBrowserRouter } from 'react-router-dom';

import AuthLayout from '@/layouts/AuthLayout';
import DashboardLayout from '@/layouts/DashboardLayout';
import PublicLayout from '@/layouts/PublicLayout';
import ProtectedRoute from './ProtectedRoute';
import RoleRoute from './RoleRoute';

import LoginPage from '@/pages/auth/LoginPage';

import DashboardEtudiant from '@/pages/etudiant/DashboardEtudiant';
import ChoixThemes from '@/pages/etudiant/ChoixThemes';
import ProposerTheme from '@/pages/etudiant/ProposerTheme';
import GestionBinome from '@/pages/etudiant/GestionBinome';
import Annonces from '@/pages/etudiant/Annonces';
import MonStartup from '@/pages/etudiant/MonStartup';

import DashboardEnseignant from '@/pages/enseignant/DashboardEnseignant';
import GestionThemes from '@/pages/enseignant/GestionThemes';
import ProposeThemePage from '@/pages/enseignant/ProposeThemePage';
import DemandesEnAttente from '@/pages/enseignant/DemandesEnAttente';
import EtudiantsEncadres from '@/pages/enseignant/EtudiantsEncadres';

import DashboardAdmin from '@/pages/admin/DashboardAdmin';
import GestionThemesAdmin from '@/pages/admin/GestionThemes';
import GestionUtilisateurs from '@/pages/admin/GestionUtilisateurs';
import GestionAffectations from '@/pages/admin/GestionAffectations';
import PlanificationSoutenances from '@/pages/admin/PlanificationSoutenances';
import GestionSessions from '@/pages/admin/GestionSessions';
import GestionSpecialites from '@/pages/admin/GestionSpecialites';
import Statistiques from '@/pages/admin/Statistiques';
import GestionDocumentsRAG from '@/pages/admin/GestionDocumentsRAG';
import StatsSpecialite from '@/pages/responsable/StatsSpecialite';
import HomePage from '@/pages/public/HomePage';
import ChatbotPage from '@/pages/shared/ChatbotPage';
import SearchPage from '@/pages/shared/SearchPage';
import ProfilePage from '@/pages/shared/ProfilePage';
import NotificationsPage from '@/pages/shared/NotificationsPage';
import ForceChangePasswordPage from '@/pages/shared/ForceChangePasswordPage';

const ADMIN_ROLES = ['CHEF_DEPT', 'CHEF_EQUIPE', 'TECHNICIEN'] as const;

export const router = createBrowserRouter([
  // Auth
  {
    element: <AuthLayout />,
    children: [
      { path: '/connexion', element: <LoginPage /> },
    ],
  },

  // Public (sans auth)
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/chatbot', element: <ChatbotPage /> },
    ],
  },

  // Routes protégées
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/changer-mot-de-passe', element: <ForceChangePasswordPage /> },
      {
        element: <DashboardLayout />,
        children: [
          // Étudiant
          {
            element: <RoleRoute roles={['ETUDIANT']} redirectTo="/connexion" />,
            children: [
              { path: '/etudiant', element: <DashboardEtudiant /> },
              { path: '/etudiant/themes', element: <ChoixThemes /> },
              { path: '/etudiant/proposer', element: <ProposerTheme /> },
              { path: '/etudiant/binome', element: <GestionBinome /> },
              { path: '/etudiant/annonces', element: <Annonces /> },
              { path: '/etudiant/startup', element: <MonStartup /> },
            ],
          },

          // Enseignant + Responsable de Spécialité + Chef d'Équipe + Chef de Département
          {
            element: <RoleRoute roles={['ENSEIGNANT', 'RESP_SPECIALITE', 'CHEF_EQUIPE', 'CHEF_DEPT']} redirectTo="/connexion" />,
            children: [
              { path: '/enseignant', element: <DashboardEnseignant /> },
              { path: '/enseignant/themes', element: <GestionThemes /> },
              { path: '/enseignant/themes/nouveau', element: <ProposeThemePage /> },
              { path: '/enseignant/demandes', element: <DemandesEnAttente /> },
              { path: '/enseignant/etudiants', element: <EtudiantsEncadres /> },
            ],
          },

          // Admin / Staff (toutes les pages sauf utilisateurs)
          {
            element: <RoleRoute roles={[...ADMIN_ROLES]} redirectTo="/connexion" />,
            children: [
              { path: '/admin', element: <DashboardAdmin /> },
              { path: '/admin/themes', element: <GestionThemesAdmin /> },
              { path: '/admin/affectations', element: <GestionAffectations /> },
              { path: '/admin/soutenances', element: <PlanificationSoutenances /> },
              { path: '/admin/sessions', element: <GestionSessions /> },
              { path: '/admin/specialites', element: <GestionSpecialites /> },
              { path: '/admin/statistiques', element: <Statistiques /> },
              { path: '/admin/chatbot', element: <GestionDocumentsRAG /> },
            ],
          },
          // Gestion des utilisateurs : CHEF_DEPT et TECHNICIEN uniquement
          {
            element: <RoleRoute roles={['CHEF_DEPT', 'TECHNICIEN']} redirectTo="/admin" />,
            children: [
              { path: '/admin/utilisateurs', element: <GestionUtilisateurs /> },
            ],
          },

          // Responsable de spécialité
          {
            element: <RoleRoute roles={['RESP_SPECIALITE']} redirectTo="/admin" />,
            children: [
              { path: '/responsable', element: <StatsSpecialite /> },
            ],
          },

          // Partagé (tous rôles connectés)
          { path: '/recherche', element: <SearchPage /> },
          { path: '/profil', element: <ProfilePage /> },
          { path: '/notifications', element: <NotificationsPage /> },
        ],
      },
    ],
  },
]);
