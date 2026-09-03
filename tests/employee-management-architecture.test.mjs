import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const serviceSource = fs.readFileSync(new URL("../src/app/allservice/employee/employeeService.js", import.meta.url), "utf8");
const routeSource = fs.readFileSync(new URL("../src/app/api/rbac/users/route.js", import.meta.url), "utf8");
const directorySource = fs.readFileSync(new URL("../src/app/(dashboard)/manager/userManagement/page.jsx", import.meta.url), "utf8");
const roleManagementSource = fs.readFileSync(new URL("../src/app/(dashboard)/manager/userManagement/components/RoleManagement.jsx", import.meta.url), "utf8");
const firestoreHelpersSource = fs.readFileSync(new URL("../src/lib/firestore-firebase.js", import.meta.url), "utf8");

test("employee create and edit use authenticated backend profile operations", () => {
  assert.match(serviceSource, /method: "POST"/);
  assert.match(serviceSource, /method: "PUT"/);
  assert.doesNotMatch(serviceSource, /this\.repository\.create\(/);
  assert.doesNotMatch(serviceSource, /this\.repository\.update\(/);
});

test("employee profile backend derives company and preserves immutable employee ID", () => {
  assert.match(routeSource, /doc\(context\.companyId\)/);
  assert.match(routeSource, /employeeProfileUpdates/);
  assert.doesNotMatch(routeSource, /updates\.employeeId\s*=/);
});

test("employee directory lists the company-scoped collection", () => {
  assert.match(directorySource, /employeeService\.getEmployees\(/);
  assert.match(firestoreHelpersSource, /collection\(\s*db,\s*"Companies",\s*companyId,\s*"Usermanagement"\s*\)/);
});

test("role management does not attempt the server-owned permission catalog write", () => {
  assert.doesNotMatch(roleManagementSource, /ensureCatalog|permissionRepository/);
  assert.match(roleManagementSource, /roleRepository\.list\(company\.id\)/);
});
