$base = "http://127.0.0.1:8788"
$results = @()

function Add-Result($name, $ok, $detail) {
  $script:results += [pscustomobject]@{
    name = $name
    ok = $ok
    detail = $detail
  }
}

function Invoke-Api($method, $path, $body, $token) {
  $headers = @{}
  if ($token) { $headers["Authorization"] = "Bearer $token" }
  $params = @{
    Method = $method
    Uri = "$base$path"
    Headers = $headers
    ErrorAction = "Stop"
  }
  if ($null -ne $body) {
    $params["ContentType"] = "application/json"
    $params["Body"] = ($body | ConvertTo-Json -Depth 10 -Compress)
  }
  try {
    $resp = Invoke-RestMethod @params
    return @{ status = 200; body = $resp; raw = "" }
  } catch {
    $status = 0
    try { $status = [int]$_.Exception.Response.StatusCode } catch {}
    $raw = $_.ErrorDetails.Message
    $json = $null
    if ($raw) { try { $json = $raw | ConvertFrom-Json } catch {} }
    return @{ status = $status; body = $json; raw = $raw }
  }
}

$r = Invoke-Api "POST" "/api/auth/login" @{ email = "superadmin@nova.local"; password = "12345678" } $null
$superToken = $null
if ($r.body -and $r.body.code -eq 0 -and $r.body.data.token) {
  $superToken = $r.body.data.token
  Add-Result "super_admin 登录" $true "ok"
} else {
  Add-Result "super_admin 登录" $false ("status={0} body={1}" -f $r.status, $r.raw)
}

$r = Invoke-Api "POST" "/api/auth/login" @{ email = "admin@nova.local"; password = "12345678" } $null
$tenantToken = $null
if ($r.body -and $r.body.code -eq 0 -and $r.body.data.token) {
  $tenantToken = $r.body.data.token
  Add-Result "tenant_admin 登录" $true "ok"
} else {
  Add-Result "tenant_admin 登录" $false ("status={0} body={1}" -f $r.status, $r.raw)
}

$r = Invoke-Api "GET" "/api/platform/tenants" $null $tenantToken
$denied = ($r.status -eq 403) -or ($r.body -and $r.body.code -eq 4003)
Add-Result "tenant_admin 访问平台接口拦截" $denied ("status={0}" -f $r.status)

$uniq = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$newTenantName = "冒烟租户_$uniq"
$newAdminEmail = "smoke_$uniq@nova.local"
$newAdminPwd = "abc12345"
$r = Invoke-Api "POST" "/api/platform/tenants" @{
  tenantName = $newTenantName
  companyName = "冒烟公司_$uniq"
  adminEmail = $newAdminEmail
  adminPassword = $newAdminPwd
} $superToken
$newTenantId = $null
if ($r.body -and $r.body.code -eq 0) {
  $newTenantId = $r.body.data.tenant.id
  Add-Result "super_admin 创建租户" $true $newTenantId
} else {
  Add-Result "super_admin 创建租户" $false ("status={0} body={1}" -f $r.status, $r.raw)
}

$kw = [uri]::EscapeDataString($newTenantName)
$r = Invoke-Api "GET" "/api/platform/tenants?keyword=$kw&page=1&pageSize=5" $null $superToken
$searchOk = $false
if ($r.body -and $r.body.code -eq 0 -and $r.body.data.items) {
  foreach ($it in $r.body.data.items) {
    if ($it.id -eq $newTenantId) {
      $searchOk = $true
      break
    }
  }
}
Add-Result "super_admin 租户分页搜索" $searchOk ("status={0}" -f $r.status)

$r = Invoke-Api "GET" "/api/platform/tenants/$newTenantId" $null $superToken
$detailOk = ($r.body -and $r.body.code -eq 0 -and $r.body.data.tenant.id -eq $newTenantId)
Add-Result "super_admin 租户详情查看" $detailOk ("status={0}" -f $r.status)

$newUserEmail = "viewer_$uniq@nova.local"
$newUserPwd = "viewer123"
$r = Invoke-Api "POST" "/api/platform/tenants/$newTenantId/users" @{
  email = $newUserEmail
  password = $newUserPwd
  role = "tenant_viewer"
} $superToken
$newUserId = $null
if ($r.body -and $r.body.code -eq 0) {
  $newUserId = $r.body.data.id
  Add-Result "super_admin 新增租户账号" $true $newUserId
} else {
  Add-Result "super_admin 新增租户账号" $false ("status={0} body={1}" -f $r.status, $r.raw)
}

$r = Invoke-Api "PUT" "/api/platform/tenants/$newTenantId/users/$newUserId/status" @{ status = "disabled" } $superToken
$disableOk = ($r.body -and $r.body.code -eq 0 -and $r.body.data.status -eq "disabled")
Add-Result "super_admin 停用租户账号" $disableOk ("status={0}" -f $r.status)

$r = Invoke-Api "POST" "/api/auth/login" @{ email = $newUserEmail; password = $newUserPwd } $null
$loginDenied = ($r.status -eq 401) -or ($r.body -and $r.body.code -eq 4003)
Add-Result "disabled 账号登录拦截" $loginDenied ("status={0}" -f $r.status)

$r1 = Invoke-Api "PUT" "/api/platform/tenants/$newTenantId/users/$newUserId/password" @{ newPassword = "newpass123" } $superToken
$r2 = Invoke-Api "PUT" "/api/platform/tenants/$newTenantId/users/$newUserId/status" @{ status = "active" } $superToken
$recoverOk = ($r1.body -and $r1.body.code -eq 0 -and $r2.body -and $r2.body.code -eq 0)
Add-Result "super_admin 重置密码并启用账号" $recoverOk ("pwdStatus={0}, enableStatus={1}" -f $r1.status, $r2.status)

$r = Invoke-Api "POST" "/api/auth/login" @{ email = $newUserEmail; password = "newpass123" } $null
$newUserToken = $null
if ($r.body -and $r.body.code -eq 0) {
  $newUserToken = $r.body.data.token
  Add-Result "重置后账号可登录" $true "ok"
} else {
  Add-Result "重置后账号可登录" $false ("status={0} body={1}" -f $r.status, $r.raw)
}

$r = Invoke-Api "GET" "/api/assets" $null $newUserToken
$assetOk = ($r.body -and $r.body.code -eq 0 -and $r.body.data -is [array])
Add-Result "新租户账号访问本租户业务接口" $assetOk ("status={0}, assetsCount={1}" -f $r.status, @($r.body.data).Count)

$pass = @($results | Where-Object { $_.ok }).Count
$total = $results.Count
Write-Output ("SMOKE_SUMMARY pass={0} total={1}" -f $pass, $total)
$results | ForEach-Object {
  $mark = if ($_.ok) { "PASS" } else { "FAIL" }
  Write-Output ("{0} {1} :: {2}" -f $mark, $_.name, $_.detail)
}

if ($pass -ne $total) { exit 1 }
