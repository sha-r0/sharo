// Read-only trace: employee identity, deployed function metadata and recent errors.
import { getApp } from 'firebase-admin/app';
import { adminDb } from '../src/lib/firebase-admin.js';
try {
  const companyId = 'agcqb5F8KKZCXjRkotut';
  const company = adminDb.collection('Companies').doc(companyId);
  const employees = await company.collection('Usermanagement').where('employeeId', '==', '00000015').get();
  console.log(JSON.stringify({ employees: employees.docs.map((doc) => ({ employeeFirestoreId: doc.id, employeeId: doc.data().employeeId, name: doc.data().personalInfo?.fullName, employmentStatus: doc.data().employment?.status, accessStatus: doc.data().access?.status })) }));
  const token = (await getApp().options.credential.getAccessToken()).access_token;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const metadataResponse = await fetch('https://cloudfunctions.googleapis.com/v2/projects/sharo-ad80a/locations/asia-south1/functions/createAdvanceRequest', { headers });
  const metadata = await metadataResponse.json();
  console.log(JSON.stringify({ metadataStatus: metadataResponse.status, updateTime: metadata.updateTime, service: metadata.serviceConfig?.service, source: metadata.buildConfig?.source, error: metadata.error?.message }));
  const response = await fetch('https://logging.googleapis.com/v2/entries:list', { method: 'POST', headers, body: JSON.stringify({ resourceNames: ['projects/sharo-ad80a'], filter: '(resource.labels.service_name="createadvancerequest" OR resource.labels.function_name="createAdvanceRequest") AND severity>=ERROR', orderBy: 'timestamp desc', pageSize: 10 }) });
  const result = await response.json();
  console.log(JSON.stringify({ logsStatus: response.status, error: result.error?.message, entries: result.entries?.map((entry) => ({ timestamp: entry.timestamp, text: entry.textPayload, message: entry.jsonPayload?.message })) }, null, 2));
} catch { console.error('Trace unavailable. No credentials logged.'); process.exitCode = 1; }
finally { await adminDb.terminate(); }
