import { Link, Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-6 overflow-y-auto">
      <div className="w-full max-w-md">
        <Outlet />
      </div>
    </div>
  );
}
