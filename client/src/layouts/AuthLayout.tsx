import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">e-PFE</h1>
          <p className="text-muted-foreground mt-2">
            Gestion des Projets de Fin d'Études — Université de Béjaïa
          </p>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
