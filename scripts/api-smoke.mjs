const base = "http://127.0.0.1:8788";
const results = [];

function addResult(name, ok, detail) {
  results.push({ name, ok, detail });
}

async function callApi(method, path, body, token) {
  const headers = {};
  if (body !== undefined && body !== null) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;
  let res;
  try {
    res = await fetch(`${base}${path}`, {
      method,
      headers,
      body: body !== undefined && body !== null ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    return { status: 0, body: null, raw: String(e) };
  }
  let raw = "";
  let json = null;
  try {
    raw = await res.text();
    json = raw ? JSON.parse(raw) : null;
  } catch {
    json = null;
  }
  return { status: res.status, body: json, raw };
}

let r = await callApi("POST", "/api/auth/login", {
  email: "superadmin@nova.local",
  password: "12345678",
});
let superToken = null;
if (r.body?.code === 0 && r.body?.data?.token) {
  superToken = r.body.data.token;
  addResult("super_admin 登录", true, "ok");
} else {
  addResult("super_admin 登录", false, `status=${r.status} body=${r.raw}`);
}

r = await callApi("POST", "/api/auth/login", {
  email: "admin@nova.local",
  password: "12345678",
});
let tenantToken = null;
if (r.body?.code === 0 && r.body?.data?.token) {
  tenantToken = r.body.data.token;
  addResult("tenant_admin 登录", true, "ok");
} else {
  addResult("tenant_admin 登录", false, `status=${r.status} body=${r.raw}`);
}

r = await callApi("GET", "/api/platform/tenants", null, tenantToken);
const denied = r.status === 403 || r.body?.code === 4003;
addResult("tenant_admin 访问平台接口拦截", denied, `status=${r.status}`);

const uniq = Date.now();
const newTenantName = `冒烟租户_${uniq}`;
const newAdminEmail = `smoke_${uniq}@nova.local`;
const newAdminPwd = "abc12345";
r = await callApi(
  "POST",
  "/api/platform/tenants",
  {
    tenantName: newTenantName,
    companyName: `冒烟公司_${uniq}`,
    adminEmail: newAdminEmail,
    adminPassword: newAdminPwd,
  },
  superToken,
);
const newTenantId = r.body?.data?.tenant?.id || null;
if (newTenantId) {
  addResult("super_admin 创建租户", true, newTenantId);
} else {
  addResult("super_admin 创建租户", false, `status=${r.status} body=${r.raw}`);
}

const kw = encodeURIComponent(newTenantName);
r = await callApi(
  "GET",
  `/api/platform/tenants?keyword=${kw}&page=1&pageSize=5`,
  null,
  superToken,
);
const items = r.body?.data?.items || [];
const searchOk = items.some((it) => it.id === newTenantId);
addResult("super_admin 租户分页搜索", searchOk, `status=${r.status}`);

r = await callApi("GET", `/api/platform/tenants/${newTenantId}`, null, superToken);
const detailOk = r.body?.code === 0 && r.body?.data?.tenant?.id === newTenantId;
addResult("super_admin 租户详情查看", detailOk, `status=${r.status}`);

const newUserEmail = `viewer_${uniq}@nova.local`;
const newUserPwd = "viewer123";
r = await callApi(
  "POST",
  `/api/platform/tenants/${newTenantId}/users`,
  { email: newUserEmail, password: newUserPwd, role: "tenant_viewer" },
  superToken,
);
const newUserId = r.body?.data?.id || null;
if (newUserId) {
  addResult("super_admin 新增租户账号", true, newUserId);
} else {
  addResult("super_admin 新增租户账号", false, `status=${r.status} body=${r.raw}`);
}

r = await callApi(
  "PUT",
  `/api/platform/tenants/${newTenantId}/users/${newUserId}/status`,
  { status: "disabled" },
  superToken,
);
const disableOk = r.body?.code === 0 && r.body?.data?.status === "disabled";
addResult("super_admin 停用租户账号", disableOk, `status=${r.status}`);

r = await callApi("POST", "/api/auth/login", { email: newUserEmail, password: newUserPwd });
const loginDenied = r.status === 401 || r.body?.code === 4003;
addResult("disabled 账号登录拦截", loginDenied, `status=${r.status}`);

const r1 = await callApi(
  "PUT",
  `/api/platform/tenants/${newTenantId}/users/${newUserId}/password`,
  { newPassword: "newpass123" },
  superToken,
);
const r2 = await callApi(
  "PUT",
  `/api/platform/tenants/${newTenantId}/users/${newUserId}/status`,
  { status: "active" },
  superToken,
);
const recoverOk = r1.body?.code === 0 && r2.body?.code === 0;
addResult(
  "super_admin 重置密码并启用账号",
  recoverOk,
  `pwdStatus=${r1.status}, enableStatus=${r2.status}`,
);

r = await callApi("POST", "/api/auth/login", { email: newUserEmail, password: "newpass123" });
const newUserToken = r.body?.data?.token || null;
if (newUserToken) {
  addResult("重置后账号可登录", true, "ok");
} else {
  addResult("重置后账号可登录", false, `status=${r.status} body=${r.raw}`);
}

r = await callApi("GET", "/api/assets", null, newUserToken);
const assetOk = r.body?.code === 0 && Array.isArray(r.body?.data);
addResult(
  "新租户账号访问本租户业务接口",
  assetOk,
  `status=${r.status}, assetsCount=${Array.isArray(r.body?.data) ? r.body.data.length : -1}`,
);

const pass = results.filter((x) => x.ok).length;
const total = results.length;
console.log(`SMOKE_SUMMARY pass=${pass} total=${total}`);
for (const row of results) {
  console.log(`${row.ok ? "PASS" : "FAIL"} ${row.name} :: ${row.detail}`);
}

if (pass !== total) process.exit(1);
