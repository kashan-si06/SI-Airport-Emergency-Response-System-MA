import { useChecklists, useHome } from '@/api/queries';
import { can, useSession } from '@/auth/session';
import type { IconName } from '@/ui/icon';

export type TabKey = '(alerts)' | 'tasks' | 'command' | 'reports' | 'account';

export type TabDef = {
  name: TabKey;
  href: '/' | '/tasks' | '/command' | '/reports' | '/account';
  label: string;
  icon: IconName;
  visible: boolean;
  badge: number;
};

/**
 * Bottom navigation by role (PRD §7.2). Five destinations maximum
 * (Android limit); order follows frequency of use under incident load.
 */
export function useTabs(): TabDef[] {
  const me = useSession((s) => s.me);
  const home = useHome();
  const checklistsVisible = can(me, 'checklist.execute');
  const checklists = useChecklists('active');

  const pendingAck = home.data?.pendingAck.length ?? 0;
  const pendingReports = home.data?.pendingFieldReports ?? 0;
  const openMandatory = checklistsVisible ? (checklists.data?.reduce((s, c) => s + c.mandatoryOpen, 0) ?? 0) : 0;

  return [
    { name: '(alerts)', href: '/', label: 'Alerts', icon: 'alertsActive', visible: true, badge: pendingAck },
    { name: 'tasks', href: '/tasks', label: 'Checklists', icon: 'checklist', visible: checklistsVisible, badge: openMandatory },
    {
      name: 'command',
      href: '/command',
      label: 'Command',
      icon: 'command',
      visible: can(me, 'command.view') || can(me, 'command.view.dept'),
      badge: 0,
    },
    {
      name: 'reports',
      href: '/reports',
      label: 'Reports',
      icon: 'report',
      visible: can(me, 'fieldreport.create') || can(me, 'fieldreport.validate'),
      badge: can(me, 'fieldreport.validate') ? pendingReports : 0,
    },
    { name: 'account', href: '/account', label: 'Account', icon: 'account', visible: true, badge: 0 },
  ];
}
