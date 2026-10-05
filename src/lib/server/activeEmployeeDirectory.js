// context must come from authorizeCompanyRequest, never from request input.
export async function readActiveEmployeeDirectory(db, context, requestedCompanyId) {
  if (!requestedCompanyId || requestedCompanyId !== context.companyId) throw new Error('COMPANY_MISMATCH');
  const role = String(context.roleId || 'employee').trim().toLowerCase();
  const selfOnly = !context.isOwner && role === 'employee';
  if (!context.isOwner && !selfOnly && !context.permissions?.includes('employee.view')) throw new Error('FORBIDDEN');
  const collection = db.collection('Companies').doc(context.companyId).collection('Usermanagement');
  let docs;
  if (selfOnly) {
    if (!context.employeeFirestoreId) throw new Error('FORBIDDEN');
    const own = await collection.doc(context.employeeFirestoreId).get();
    docs = own.exists ? [own] : [];
  } else {
    docs = (await collection.get()).docs;
  }
  const employees = docs.filter((doc) => {
    const data = doc.data();
    const statuses = [data.employment?.status, data.status, data.access?.status].filter(Boolean);
    return data.isActive !== false && statuses.every((status) => ['active', 'enabled'].includes(String(status).trim().toLowerCase()));
  }).map((doc) => {
    const data = doc.data();
    return {
      id: doc.id, employeeFirestoreId: doc.id,
      employeeId: String(data.employeeId || data.login?.employeeId || ''),
      fullName: data.personalInfo?.fullName || data.fullName || data.name || 'Unnamed employee',
      department: data.employment?.department || data.department || '',
      designation: data.employment?.designation || data.designation || '',
      dob: data.personalInfo?.dob || data.dob || data.dateOfBirth || null,
      joiningDate: data.employment?.joiningDate || data.joiningDate || data.joinDate || null,
      createdAt: data.createdAt || null,
    };
  }).sort((a, b) => a.fullName.localeCompare(b.fullName));
  return { companyId: context.companyId, employees };
}
