import { CheckCheck, Bell, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useMarkAllRead, useMarkAsRead, useNotifications } from '@/hooks/useNotifications';
import { useNotificationStore } from '@/stores/notificationStore';
import { NotificationItem } from '@/components/notifications/NotificationItem';

export default function NotificationsPage() {
  const { refetch, isFetching } = useNotifications();
  const { mutate: markRead } = useMarkAsRead();
  const { mutate: markAll, isPending: isMarkingAll } = useMarkAllRead();
  const { notifications, unreadCount } = useNotificationStore();

  const unread = notifications.filter((n) => !n.is_read);
  const read = notifications.filter((n) => n.is_read);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          {unreadCount > 0 && (
            <Badge variant="destructive">
              {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            disabled={isFetching}
            title="Actualiser"
          >
            <RefreshCw className={`size-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => markAll()}
              disabled={isMarkingAll}
            >
              <CheckCheck className="size-4" />
              Tout marquer comme lu
            </Button>
          )}
        </div>
      </div>

      {/* Contenu */}
      {notifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4 text-muted-foreground">
            <Bell className="size-12 opacity-25" />
            <div className="text-center">
              <p className="font-medium">Aucune notification</p>
              <p className="text-sm mt-1">Vous êtes à jour !</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {/* Non lues */}
          {unread.length > 0 && (
            <Card className="border-primary/20">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  Non lues · {unread.length}
                </CardTitle>
              </CardHeader>
              <Separator />
              <CardContent className="p-0 divide-y">
                {unread.map((n) => (
                  <NotificationItem key={n.id} notification={n} onRead={markRead} />
                ))}
              </CardContent>
            </Card>
          )}

          {/* Lues */}
          {read.length > 0 && (
            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  Lues · {read.length}
                </CardTitle>
              </CardHeader>
              <Separator />
              <CardContent className="p-0 divide-y">
                {read.map((n) => (
                  <NotificationItem key={n.id} notification={n} onRead={markRead} />
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
