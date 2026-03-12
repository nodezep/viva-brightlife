import {LoanModule} from '@/components/loans/loan-module';

export default async function Page({
  searchParams
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const query = typeof searchParams?.query === 'string' ? searchParams.query : '';
  const startDate = typeof searchParams?.startDate === 'string' ? searchParams.startDate : '';
  const endDate = typeof searchParams?.endDate === 'string' ? searchParams.endDate : '';
  const page = typeof searchParams?.page === 'string' ? parseInt(searchParams.page) : 1;
  const sort = typeof searchParams?.sort === 'string' ? searchParams.sort : undefined;

  return (
    <LoanModule 
      loanType="watumishi" 
      title="Mikopo Watumishi" 
      query={query} 
      startDate={startDate} 
      endDate={endDate} 
      page={page || 1} 
      sort={sort}
    />
  );
}
