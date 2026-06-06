import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../../../services/api';
import { NotificationDto } from '../../../types/dto';
import { formatDate } from '../../../utils/formatDate';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    let isCancelled = false;

    api
      .get<NotificationDto[]>('/notifications')
      .then((loaded) => {
        if (isCancelled) return;
        setNotifications(loaded);
        setError('');
      })
      .catch((err: unknown) => {
        if (isCancelled) return;
        setError(err instanceof Error ? err.message : t('notifications.loadFailed'));
      });

    return () => {
      isCancelled = true;
    };
  }, [t]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((notification) => !notification.readAt).length;

  function notificationText(notification: NotificationDto) {
    if (
      notification.type === 'COURSE_SHARED' &&
      notification.data?.courseName &&
      notification.data?.sharedByUsername
    ) {
      return {
        title: t('notifications.courseShared.title'),
        message: t('notifications.courseShared.message', {
          courseName: notification.data.courseName,
          sharedByUsername: notification.data.sharedByUsername,
        }),
      };
    }

    return {
      title: notification.title,
      message: notification.message,
    };
  }

  async function handleNotificationClick(notification: NotificationDto) {
    if (!notification.readAt) {
      try {
        const updated = await api.patch<NotificationDto>(
          `/notifications/${notification.id}/read`,
          {}
        );
        setNotifications((prev) =>
          prev.map((item) => (item.id === notification.id ? updated : item))
        );
      } catch {
        // Navigation should still work if marking read fails.
      }
    }

    setOpen(false);

    if (notification.courseId) {
      navigate(`/courses/${notification.courseId}`);
    }
  }

  return (
    <div className="notification-bell" ref={dropdownRef}>
      <button
        type="button"
        className="dashboard-topbar__icon notification-bell__trigger"
        aria-label={t('notifications.bellAria', { count: unreadCount })}
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <i className="fa-solid fa-bell" />
        {unreadCount > 0 && (
          <span className="notification-bell__badge" aria-hidden="true">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="notification-bell__menu panel" role="menu">
          <div className="notification-bell__header">
            <h2>{t('notifications.title')}</h2>
            {unreadCount > 0 && (
              <span className="notification-bell__count">
                {t('notifications.unreadCount', { count: unreadCount })}
              </span>
            )}
          </div>

          {error && <div className="notification-bell__state">{error}</div>}

          {!error && notifications.length === 0 && (
            <div className="notification-bell__state">{t('notifications.empty')}</div>
          )}

          {!error && notifications.length > 0 && (
            <ul className="notification-bell__list">
              {notifications.map((notification) => {
                const unread = !notification.readAt;
                const text = notificationText(notification);

                return (
                  <li key={notification.id}>
                    <button
                      type="button"
                      className={`notification-bell__item${unread ? ' notification-bell__item--unread' : ''}`}
                      onClick={() => void handleNotificationClick(notification)}
                      role="menuitem"
                    >
                      <span className="notification-bell__item-icon">
                        <i className="fa-solid fa-book-open" />
                      </span>
                      <span className="notification-bell__item-body">
                        <span className="notification-bell__item-title">{text.title}</span>
                        <span className="notification-bell__item-message">{text.message}</span>
                        <span className="notification-bell__item-date">
                          {formatDate(notification.createdAt)}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
