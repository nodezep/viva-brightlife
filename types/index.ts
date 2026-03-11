export type LoanType =
  | 'binafsi'
  | 'biashara'
  | 'watumishi'
  | 'electronics'
  | 'kilimo'
  | 'bima'
  | 'vikundi_wakinamama'
  | 'vyombo_moto';

export type LoanStatus = 'active' | 'closed' | 'defaulted' | 'pending';

export type LoanRecord = {
  id: string;
  memberNumber: string;
  memberName: string;
  cycle: number;
  securityAmount: number;
  loanNumber: string;
  disbursementAmount: number;
  disbursementDate: string;
  installmentSize: number;
  outstandingBalance: number;
  overdueAmount: number;
  status: LoanStatus;
  loanType: LoanType;
};

export type NavItem = {
  key: string;
  href: string;
  icon: string;
};