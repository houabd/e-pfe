import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Users, BookOpen, CheckCircle, Calendar, FileText,
  Settings, Bell, UserCheck, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUserRole } from '@/stores/authStore';
import { getNotificationLink } from '@/utils/notificationLinks';
import type { Notification, TypeNotification } from '@/types';

// ─── Icônes par type ──────────────────────────────────────────────────────────

const ICON_MAP: Record<TypeNotification, React.ReactNode> = {
  BINOME_REQUEST:       <Users className="size-4 text-blue-500" />,
  BINOME_RESPONSE:      <UserCheck className="size-4 text-blue-500" />,
  THEME_CHOSEN:         <BookOpen className="size-4 text-violet-500" />,
  THEME_RESPONSE:       <BookOpen className="size-4 text-violet-500" />,
  AFFECTATION:          <CheckCircle className="size-4 text-green-500" />,
  THEME_VALIDATED:      <CheckCircle className="size-4 text-green-500" />,
  SOUTENANCE_PLANIFIEE: <Calendar className="size-4 text-orange-500" />,
  NEW_DOCUMENT:         <FileText className="size-4 text-gray-500" />,
  SESSION_UPDATE:       <Settings className="size-4 text-gray-500" />,
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  notification: Notification;
  onRead?: (id: string) => void;
  onNavigate?: () => void;
  compact?: boolean;
}

// ─── Composant ────────────────────────────────────────────────────────────────

export function NotificationItem({ notification, onRead, onNavigate, compact }: Props) {
  const navigate = useNavigate();
  const role = useUserRole();

  const icon = ICON_MAP[notification.type] ?? <Bell className="size-4 text-gray-400" />;

  const ago = formatDistanceToNow(new Date(notification.created_at), {
    addSuffix: true,
    locale: fr,
  });

  const meta = notification.metadata as Record<string, unknown> | undefined;
  const href = getNotificationLink(notification.type, meta, role ?? undefined);

  function handleClick() {
    if (!notification.is_read) onRead?.(notification.id);
    if (href) {
      onNavigate?.();
      navigate(href);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'w-full text-left flex items-start gap-3 transition-colors group',
        compact ? 'px-3 py-2.5' : 'px-4 py-3',
        notification.is_read
          ? 'hover:bg-muted/50'
          : 'bg-primary/5 hover:bg-primary/10',
        href && 'cursor-pointer',
        !href && 'cursor-default',
      )}
    >
      {/* Icône */}
      <span className="mt-0.5 shrink-0">{icon}</span>

      {/* Contenu */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-sm leading-snug',
          !notification.is_read && 'font-medium',
          notification.is_read && 'text-muted-foreground',
        )}>
          {notification.message}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{ago}</p>
      </div>

      {/* Indicateurs droite */}
      <div className="flex items-center gap-1 mt-0.5 shrink-0">
        {!notification.is_read && (
          <span className="size-2 rounded-full bg-primary" />
        )}
        {href && (
          <ChevronRight className={cn(
            'size-3.5 text-muted-foreground/50 transition-transform',
            'group-hover:translate-x-0.5 group-hover:text-muted-foreground',
          )} />
        )}
      </div>
    </button>
  );
}
