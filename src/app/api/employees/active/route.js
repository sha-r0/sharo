import { adminDb } from '@/lib/firebase-admin';
import { authorizeCompanyRequest } from '@/lib/server/authorizeCompanyRequest';
import { readActiveEmployeeDirectory } from '@/lib/server/activeEmployeeDirectory';

export const runtime = 'nodejs';
export async function GET(request) {
  const headers = { 'Cache-Control': 'private, no-store' };
  try {
    const context = await authorizeCompanyRequest(request);
    const companyId = new URL(request.url).searchParams.get('companyId');
    return Response.json(await readActiveEmployeeDirectory(adminDb, context, companyId), { headers });
  } catch (error) {
    const code = error?.message;
    const unauthenticated = code === 'UNAUTHENTICATED' || String(error?.code || '').startsWith('auth/');
    const forbidden = ['FORBIDDEN', 'COMPANY_MISMATCH', 'COMPANY_INACTIVE'].includes(code);
    const status = unauthenticated ? 401 : forbidden ? 403 : 500;
    return Response.json({ error: unauthenticated ? 'UNAUTHENTICATED' : forbidden ? code : 'EMPLOYEE_DIRECTORY_UNAVAILABLE' }, { status, headers });
  }
}
