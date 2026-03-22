-- Add due soon SMS templates

insert into public.sms_templates (template_key, language, body)
values
  (
    'repayment_due_soon',
    'sw',
    'Ndugu {{member_name}}, kumbusho: malipo ya mkopo {{loan_number}} yanatakiwa tarehe {{due_date}}. Kiasi cha kulipa TZS {{amount_due}}. Tafadhali jiandae. Viva Brightlife.'
  ),
  (
    'repayment_due_soon',
    'en',
    'Dear {{member_name}}, reminder: loan {{loan_number}} payment of TZS {{amount_due}} is due on {{due_date}}. Please prepare. Viva Brightlife.'
  )
on conflict (template_key, language) do update
set body = excluded.body,
    is_active = true;
