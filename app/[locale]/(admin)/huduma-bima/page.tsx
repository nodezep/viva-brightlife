import {InsuranceModule} from '@/components/loans/insurance-module';
import {getInsurancePolicies} from '@/lib/data';

export default async function HudumaBimaPage() {
  const policies = await getInsurancePolicies();
  return <InsuranceModule initialPolicies={policies} />;
}