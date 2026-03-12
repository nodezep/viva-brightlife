-- Auto-generated from LOANSMANUAL.xlsx
-- Inserts members if they do not exist (member_number is not unique)
begin;
insert into public.members (member_number, full_name, phone) select '1', 'DR WENDE', '734354545' where not exists (select 1 from public.members where member_number = '1');
insert into public.members (member_number, full_name, phone) select '2', 'THE TADZ GROUP LTD', '734354545' where not exists (select 1 from public.members where member_number = '2');
insert into public.members (member_number, full_name, phone) select '3', 'PETER I. KITONGWE', '734354545' where not exists (select 1 from public.members where member_number = '3');
insert into public.members (member_number, full_name, phone) select '4', 'ELIAS BENJAMIN CHAMHENE', '734354545' where not exists (select 1 from public.members where member_number = '4');
insert into public.members (member_number, full_name, phone) select '5', 'THE TADZ GROUP LTD', '734354545' where not exists (select 1 from public.members where member_number = '5');
insert into public.members (member_number, full_name, phone) select '6', 'NATALIA SEVERINE KABAKAMA', '734354545' where not exists (select 1 from public.members where member_number = '6');
insert into public.members (member_number, full_name, phone) select '7', 'ROTHAR MACHIBYA MASALU', '734354545' where not exists (select 1 from public.members where member_number = '7');
insert into public.members (member_number, full_name, phone) select '8', 'INNO MAPUNDA', '734354545' where not exists (select 1 from public.members where member_number = '8');
insert into public.members (member_number, full_name, phone) select '9', 'GAUDENCIA AARON LUENA', '75353426' where not exists (select 1 from public.members where member_number = '9');
insert into public.members (member_number, full_name, phone) select '11', 'THE TADZ GROUP LTD', '734354545' where not exists (select 1 from public.members where member_number = '11');
insert into public.members (member_number, full_name, phone) select '12', 'CATHERIN CLEMENT', '734354545' where not exists (select 1 from public.members where member_number = '12');
insert into public.members (member_number, full_name, phone) select '13', 'FERDNAND MATATA', '734354545' where not exists (select 1 from public.members where member_number = '13');
insert into public.members (member_number, full_name, phone) select '14', 'ANGEL MGEMELA', '734354545' where not exists (select 1 from public.members where member_number = '14');
insert into public.members (member_number, full_name, phone) select '15', 'JACKLINE MDEGELA', '734354545' where not exists (select 1 from public.members where member_number = '15');
insert into public.members (member_number, full_name, phone) select '16', 'THE TADZ GROUP LTD', '734354545' where not exists (select 1 from public.members where member_number = '16');
insert into public.members (member_number, full_name, phone) select '17', 'VIO JUICE', '734354545' where not exists (select 1 from public.members where member_number = '17');
insert into public.members (member_number, full_name, phone) select '18', 'ANILINDA SOVERA', '734354545' where not exists (select 1 from public.members where member_number = '18');
insert into public.members (member_number, full_name, phone) select '19', 'THE TADZ GROUP LTD', '734354545' where not exists (select 1 from public.members where member_number = '19');
commit;