import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

type Item = {
  to: string;
  label: string;
  icon: string;
  end?: boolean;
  admin?: boolean;
};

const baseItems: Item[] = [
  { to: '/', label: 'ပင်မ', icon: '🏠', end: true },
  { to: '/machines', label: 'စက်များ', icon: '⛏️' },
  { to: '/drop', label: 'Drop', icon: '💸' },
  { to: '/refer', label: 'Refer', icon: '🔗' },
];

/**
 * Sticky bottom navigation — main entry points. Admin link is added at the
 * end when the user has is_admin = true, replacing one of the slots.
 */
export function BottomNav() {
  const { isAdmin } = useAuth();
  const items: Item[] = isAdmin
    ? [...baseItems, { to: '/admin', label: 'Admin', icon: '⚙️', admin: true }]
    : baseItems;

  return (
    <nav className="bottom-nav" aria-label="Main">
      <div className="bottom-nav__inner">
        {items.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.end}
            className={({ isActive }) =>
              `bottom-nav__item${isActive ? ' bottom-nav__item--active' : ''}${
                it.admin ? ' bottom-nav__item--admin' : ''
              }`
            }
          >
            <span className="bottom-nav__icon" aria-hidden>{it.icon}</span>
            <span className="bottom-nav__label">{it.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}