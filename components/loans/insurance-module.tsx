'use client';

import {Bell, Plus} from 'lucide-react';
import type {InsuranceView} from '@/types';

type Props = {
  initialPolicies: InsuranceView[];
};

export function InsuranceModule({initialPolicies}: Props) {
  const activePolicies = initialPolicies.filter((policy) => policy.status === 'active').length;
  const premiumThisMonth = initialPolicies.reduce((sum, policy) => sum + policy.premium, 0);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Huduma za Bima</h1>
        <button className="no-print inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
          <Plus size={16} /> Add Policy
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">Active Policies</p>
          <p className="mt-2 text-2xl font-semibold">{activePolicies}</p>
        </article>
        <article className="rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">Premium Total</p>
          <p className="mt-2 text-2xl font-semibold">TZS {premiumThisMonth.toLocaleString()}</p>
        </article>
        <article className="rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">Renewals in 30 Days</p>
          <p className="mt-2 inline-flex items-center gap-2 text-2xl font-semibold">
            <Bell size={20} /> 0
          </p>
        </article>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-muted/70 text-left">
            <tr>
              <th className="px-3 py-2">Policy #</th>
              <th className="px-3 py-2">Member</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Premium</th>
              <th className="px-3 py-2">Coverage</th>
              <th className="px-3 py-2">End Date</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {initialPolicies.map((policy) => (
              <tr key={policy.id} className="border-t">
                <td className="px-3 py-2">{policy.policyNumber}</td>
                <td className="px-3 py-2">{policy.memberName}</td>
                <td className="px-3 py-2">{policy.policyType}</td>
                <td className="px-3 py-2">{policy.premium.toLocaleString()}</td>
                <td className="px-3 py-2">{policy.coverage.toLocaleString()}</td>
                <td className="px-3 py-2">{policy.endDate}</td>
                <td className="px-3 py-2">{policy.status}</td>
              </tr>
            ))}
            {initialPolicies.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-center text-muted-foreground" colSpan={7}>
                  No policies found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}