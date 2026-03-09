import type {LoanType, NavItem} from '@/types';

export const navItems: NavItem[] = [
  {key: 'dashboard', href: '/dashboard', icon: 'LayoutDashboard'},
  {key: 'mikopo_binafsi', href: '/mikopo-binafsi', icon: 'Wallet'},
  {key: 'mikopo_wafanyabiashara', href: '/mikopo-wafanyabiashara', icon: 'Briefcase'},
  {key: 'mikopo_watumishi', href: '/mikopo-watumishi', icon: 'Users2'},
  {key: 'mikopo_electronics', href: '/mikopo-electronics', icon: 'Tv'},
  {key: 'mikopo_kilimo', href: '/mikopo-kilimo', icon: 'Sprout'},
  {key: 'huduma_bima', href: '/huduma-bima', icon: 'ShieldCheck'},
  {
    key: 'mikopo_vikundi_wakinamama',
    href: '/mikopo-vikundi-wakinamama',
    icon: 'HandHeart'
  },
  {key: 'mikopo_vyombo_moto', href: '/mikopo-vyombo-moto', icon: 'Bike'},
  {key: 'ripoti', href: '/ripoti', icon: 'FileSpreadsheet'}
];

export const loanPageMap: Record<string, LoanType> = {
  'mikopo-binafsi': 'binafsi',
  'mikopo-wafanyabiashara': 'biashara',
  'mikopo-watumishi': 'watumishi',
  'mikopo-electronics': 'electronics',
  'mikopo-kilimo': 'kilimo',
  'huduma-bima': 'bima',
  'mikopo-vikundi-wakinamama': 'vikundi_wakinamama',
  'mikopo-vyombo-moto': 'vyombo_moto'
};