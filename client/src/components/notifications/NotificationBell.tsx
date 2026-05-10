import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useNotificationStore } from '@/stores/notificationStore';
import { useMarkAllRead, useMarkAsRead } from '@/hooks/useNotifications';
import { NotificationItem } from './NotificationItem';

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount } = useNotificationStore();
  const { mutate: markRead } = useMarkAsRead();
  const { mutate: markAll, isPending } = useMarkAllRead();

  const preview = notifications.slice(0, 8);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" title="Notifications">
          <Bell className={
            unreadCount > 0
              ? 'size-5 text-primary'
              : 'size-5'
          } />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 size-5 flex items-center justify-center p-0 text-[10px] font-bold"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" sideOffset={8} className="w-80 p-0 shadow-xl">
        {/* En-tête */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">Notifications</span>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs h-5 px-1.5">
                {unreadCount}
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
              onClick={() => markAll()}
              disabled={isPending}
            >
              <CheckCheck className="size-3.5" />
              Tout lire
            </Button>
          )}
        </div>

        {/* Liste */}
        <div className="max-h-[400px] overflow-y-auto">
          {preview.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
              <Bell className="size-8 opacity-25" />
              <p className="text-sm">Aucune notification</p>
            </div>
          ) : (
            <div className="divide-y">
              {preview.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onRead={markRead}
                  onNavigate={() => setOpen(false)}
                  compact
                />
              ))}
            </div>
          )}
        </div>

        {/* Pied */}
        {notifications.length > 0 && (
          <>
            <Separator />
            <div className="p-2.5 text-center">
              <Link
                to="/notifications"
                onClick={() => setOpen(false)}
                className="text-xs text-primary hover:underline font-medium"
              >
                Voir toutes les notifications ({notifications.length})
              </Link>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
