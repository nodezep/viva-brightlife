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
  memberId: string;
  memberNumber: string;
  memberName: string;
  itemDescription?: string | null;
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
  repaymentFrequency?: 'weekly' | 'daily' | 'monthly';
  durationMonths?: number;
  amountPaid?: number;
  memberPhone?: string | null;
  interestRate?: number;
  daysOverdue?: number;
  returnStartDate?: string | null;
};

export type NavItem = {
  key: string;
  href: string;
  icon: string;
};

export type MarejeshoSchedule = {
  id?: string;
  expectedDate: string;
  expectedAmount: number;
  paidAmount: number;
  status?: string;
};

export type MarejeshoRow = {
  id: string;
  memberNumber: string;
  memberName: string;
  loanNumber: string;
  loanType: LoanType;
  cycle: number;
  securityAmount: number;
  disbursementDate: string;
  installmentAmount: number;
  outstandingBalance: number;
  overdueAmount?: number;
  status: LoanStatus;
  schedules: MarejeshoSchedule[];
};

export type LoanSort =
  | 'newest'
  | 'oldest'
  | 'sno_asc'
  | 'sno_desc'
  | 'name_asc'
  | 'name_desc';

export type GroupView = {
  id: string;
  name: string; // Used in GroupsModule
  number: string; // Used in GroupsModule
  groupName?: string;
  groupNumber?: string;
  members: string[];
};

export type GroupSummary = {
  id: string;
  name: string;
  number: string;
  groupName?: string; // Support for legacy/alternate components
  groupNumber?: string;
  groupType: string;
  createdAt: string;
  memberCount: number;
};

export type GroupMemberDetail = {
  id: string;
  memberId: string;
  memberNumber: string;
  fullName: string;
  phone: string | null;
  roleInGroup: string | null;
  hasBook: boolean;
};

export type GroupDetail = {
  id: string;
  groupName: string;
  groupNumber: string;
  name?: string;
  number?: string;
  groupType: string;
  createdAt: string;
  members: GroupMemberDetail[];
};

export type MemberOption = {
  id: string;
  fullName: string;
  memberNumber: string;
  phone: string | null;
};

export type AdmissionBookRow = {
  groupId: string;
  groupName: string;
  groupNumber: string;
  memberId: string;
  memberNumber: string;
  fullName: string;
  phone: string | null;
  hasBook: boolean;
};

export type AdmissionGroup = {
  id: string;
  name: string;
  number: string;
};

export type InsuranceView = {
  id: string;
  policyNumber: string;
  memberName: string;
  policyType: string;
  premium: number;
  coverage: number;
  endDate: string;
  status: string;
};
