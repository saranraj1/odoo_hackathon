#!/usr/bin/env pwsh
<#
.SYNOPSIS
  AssetFlow HTTP smoke-test suite.
.DESCRIPTION
  Runs a full round-trip smoke test against a live backend instance.
  Each run uses a unique $runId so multiple runs never collide with each
  other or with seed data.

  Prerequisites:
    - Backend running on http://localhost:3000
    - .env seeds already applied (npm run seed)

  Usage:
    ./scripts/smoke-test.ps1
    ./scripts/smoke-test.ps1 -BaseUrl http://localhost:3000
    ./scripts/smoke-test.ps1 -StopOnFail

  Exit code: 0 = all PASS, 1 = at least one FAIL
#>

param(
  [string]$BaseUrl = 'http://localhost:3000',
  [switch]$StopOnFail
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ─── Run Identity ────────────────────────────────────────────────────────────
$runId   = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$short   = $runId % 1000000          # 6-digit suffix for readable names
$tag     = "SMOKE-$short"

Write-Host ""
Write-Host "══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  AssetFlow Smoke-Test  |  runId=$runId  |  tag=$tag" -ForegroundColor Cyan
Write-Host "  Backend: $BaseUrl" -ForegroundColor Cyan
Write-Host "══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# ─── Result Tracking ─────────────────────────────────────────────────────────
$results = [System.Collections.Generic.List[pscustomobject]]::new()
$failures = 0

function Record-Result {
  param([string]$Name, [bool]$Passed, [string]$Detail = '')
  $icon   = if ($Passed) { '✓' } else { '✗' }
  $color  = if ($Passed) { 'Green' } else { 'Red' }
  $status = if ($Passed) { 'PASS' } else { 'FAIL' }
  Write-Host "  [$icon] $Name" -ForegroundColor $color
  if (-not $Passed -and $Detail) {
    Write-Host "      → $Detail" -ForegroundColor Yellow
  }
  $script:results.Add([pscustomobject]@{ Name = $Name; Status = $status; Detail = $Detail })
  if (-not $Passed) {
    $script:failures++
    if ($StopOnFail) {
      Write-Host ""
      Write-Host "  StopOnFail is set — aborting." -ForegroundColor Red
      Show-Summary
      exit 1
    }
  }
}

function Show-Summary {
  $total  = $script:results.Count
  $passed = ($script:results | Where-Object Status -eq 'PASS').Count
  $failed = ($script:results | Where-Object Status -eq 'FAIL').Count
  Write-Host ""
  Write-Host "══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
  Write-Host "  SUMMARY: $passed/$total PASS   $failed FAIL" -ForegroundColor $(if ($failed -eq 0) {'Green'} else {'Red'})
  Write-Host "══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
  if ($failed -gt 0) {
    Write-Host ""
    Write-Host "  Failed tests:" -ForegroundColor Red
    $script:results | Where-Object Status -eq 'FAIL' | ForEach-Object {
      Write-Host "    ✗ $($_.Name)" -ForegroundColor Red
      if ($_.Detail) { Write-Host "      $($_.Detail)" -ForegroundColor Yellow }
    }
  }
  Write-Host ""
}

# ─── HTTP Helpers ─────────────────────────────────────────────────────────────
$session = [Microsoft.PowerShell.Commands.WebRequestSession]::new()

function Invoke-Api {
  <#
  .SYNOPSIS
    Calls the API and always returns a structured object.
    On HTTP error, reads ErrorDetails.Message before swallowing the exception.
  #>
  param(
    [string]$Method   = 'GET',
    [string]$Path,
    [object]$Body     = $null,
    [bool]  $Auth     = $true,
    [ref]   $OutCode  = $null
  )

  $uri     = "$BaseUrl$Path"
  $headers = @{ 'Content-Type' = 'application/json'; 'Accept' = 'application/json' }

  $params = @{
    Method      = $Method
    Uri         = $uri
    Headers     = $headers
    WebSession  = $session
    ErrorAction = 'Stop'
  }
  if ($null -ne $Body) {
    $params.Body = ($Body | ConvertTo-Json -Depth 10 -Compress)
  }

  try {
    $resp = Invoke-RestMethod @params
    if ($null -ne $OutCode) { $OutCode.Value = 200 }
    return $resp
  }
  catch {
    # Capture HTTP status code
    $statusCode = 0
    try { $statusCode = [int]$_.Exception.Response.StatusCode } catch {}
    if ($null -ne $OutCode) { $OutCode.Value = $statusCode }

    # Try to parse a JSON error body from ErrorDetails.Message
    $errorJson = $null
    $rawMessage = $null
    try { $rawMessage = $_.ErrorDetails.Message } catch {}
    if ($rawMessage) {
      try { $errorJson = $rawMessage | ConvertFrom-Json } catch {}
    }
    if ($null -ne $errorJson) { return $errorJson }

    # Fallback: structured error with message from exception
    return [pscustomobject]@{
      success = $false
      code    = 'HTTP_ERROR'
      message = $_.Exception.Message
      status  = $statusCode
    }
  }
}

# ─── Assertion Helpers ────────────────────────────────────────────────────────
function Assert-Success {
  param([string]$TestName, $Response, [int]$ExpectedCode = 200, [int]$ActualCode = 200)
  $ok = ($Response.success -eq $true) -and ($ActualCode -in @(200, 201, 204))
  $detail = if (-not $ok) { "success=$($Response.success) code=$ActualCode msg=$($Response.message)" } else { '' }
  Record-Result -Name $TestName -Passed $ok -Detail $detail
  return $ok
}

function Assert-Fail {
  param([string]$TestName, $Response, [int]$ActualCode, [string]$ExpectedCode = '')
  $ok = ($Response.success -eq $false) -and ($ActualCode -ge 400)
  if ($ok -and $ExpectedCode) {
    $ok = ($Response.code -eq $ExpectedCode)
    if (-not $ok) {
      $detail = "Expected error code '$ExpectedCode' but got '$($Response.code)' (HTTP $ActualCode)"
      Record-Result -Name $TestName -Passed $false -Detail $detail
      return $false
    }
  }
  $detail = if (-not $ok) { "Expected a 4xx failure but got success=$($Response.success) HTTP=$ActualCode" } else { '' }
  Record-Result -Name $TestName -Passed $ok -Detail $detail
  return $ok
}

# ─── Cookie Jar path (gitignored, not committed) ──────────────────────────────
# We use $session (WebRequestSession) so no file is written.

# ═══════════════════════════════════════════════════════════════════════════════
#  Section 1 — Health Check
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "── Section 1: Health ───────────────────────────────────────────" -ForegroundColor Magenta

$hCode = [ref]0
$health = Invoke-Api -Path '/health' -OutCode $hCode
Record-Result -Name "GET /health returns 200" -Passed ($hCode.Value -eq 200)

# ═══════════════════════════════════════════════════════════════════════════════
#  Section 2 — Authentication
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "── Section 2: Authentication ───────────────────────────────────" -ForegroundColor Magenta

# 2a. Login as admin
$loginCode = [ref]0
$login = Invoke-Api -Method POST -Path '/api/auth/login' -Body @{
  email    = 'admin@assetflow.com'
  password = 'Password123'
} -OutCode $loginCode

$loginOk = ($login.success -eq $true) -and ($loginCode.Value -in 200,201) -and ($null -ne $login.data)
Record-Result -Name "POST /api/auth/login (admin)" -Passed $loginOk `
  -Detail $(if (-not $loginOk) { "HTTP=$($loginCode.Value) success=$($login.success)" } else { '' })

# 2b. GET /api/auth/me after cookie set
$meCode = [ref]0
$me = Invoke-Api -Path '/api/auth/me' -OutCode $meCode
$meOk = ($me.success -eq $true) -and ($me.data.email -eq 'admin@assetflow.com')
Record-Result -Name "GET /api/auth/me (admin session)" -Passed $meOk `
  -Detail $(if (-not $meOk) { "HTTP=$($meCode.Value) email=$($me.data.email)" } else { '' })

# 2c. Wrong password
$badCode = [ref]0
$bad = Invoke-Api -Method POST -Path '/api/auth/login' -Body @{
  email    = 'admin@assetflow.com'
  password = 'WrongPassword!'
} -OutCode $badCode
Assert-Fail -TestName "POST /api/auth/login (bad password → 401)" -Response $bad -ActualCode $badCode.Value

# ═══════════════════════════════════════════════════════════════════════════════
#  Section 3 — Categories & Departments (prerequisite data)
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "── Section 3: Categories & Departments ─────────────────────────" -ForegroundColor Magenta

$catsCode = [ref]0
$cats = Invoke-Api -Path '/api/categories' -OutCode $catsCode
Assert-Success -TestName "GET /api/categories" -Response $cats -ActualCode $catsCode.Value

# Resolve the Electronics category id
$elecCat = $cats.data | Where-Object { $_.name -eq 'Electronics' } | Select-Object -First 1
if (-not $elecCat) {
  Record-Result -Name "Electronics category present in seed" -Passed $false -Detail "Category 'Electronics' missing from /api/categories"
  $elecCatId = $null
} else {
  Record-Result -Name "Electronics category present in seed" -Passed $true
  $elecCatId = $elecCat.id
}

$deptsCode = [ref]0
$depts = Invoke-Api -Path '/api/departments' -OutCode $deptsCode
Assert-Success -TestName "GET /api/departments" -Response $depts -ActualCode $deptsCode.Value

$engDept = $depts.data | Where-Object { $_.code -eq 'ENG' } | Select-Object -First 1
if (-not $engDept) {
  Record-Result -Name "Engineering dept present in seed" -Passed $false -Detail "ENG department missing"
  $engDeptId = $null
} else {
  Record-Result -Name "Engineering dept present in seed" -Passed $true
  $engDeptId = $engDept.id
}

# ═══════════════════════════════════════════════════════════════════════════════
#  Section 4 — Asset Registration
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "── Section 4: Asset Registration ───────────────────────────────" -ForegroundColor Magenta

# Unique location tag that the audit test will scope to
$smokeLocation = "SMOKE-$runId"

$newAssetCode = [ref]0
$newAsset = $null
if ($elecCatId -and $engDeptId) {
  $newAsset = Invoke-Api -Method POST -Path '/api/assets' -Body @{
    name               = "Smoke Laptop $tag"
    description        = "Smoke-test asset for run $runId"
    categoryId         = $elecCatId
    owningDepartmentId = $engDeptId
    location           = $smokeLocation
    condition          = 'Good'
    serialNumber       = "SN-$tag"
    acquisitionDate    = (Get-Date).ToString('yyyy-MM-dd')
    acquisitionCost    = 999.00
    isBookable         = $false
  } -OutCode $newAssetCode
  Assert-Success -TestName "POST /api/assets (create smoke asset)" -Response $newAsset -ActualCode $newAssetCode.Value
} else {
  Record-Result -Name "POST /api/assets (create smoke asset)" -Passed $false -Detail "Skipped — missing category/dept ids"
}

$smokeAssetId = $newAsset.data.id

# 4b. Duplicate serial number rejected
if ($elecCatId -and $engDeptId) {
  $dupCode = [ref]0
  $dup = Invoke-Api -Method POST -Path '/api/assets' -Body @{
    name               = "Smoke Dup $tag"
    description        = "duplicate serial"
    categoryId         = $elecCatId
    owningDepartmentId = $engDeptId
    location           = $smokeLocation
    condition          = 'Good'
    serialNumber       = "SN-$tag"   # same serial
    acquisitionDate    = (Get-Date).ToString('yyyy-MM-dd')
    acquisitionCost    = 0
    isBookable         = $false
  } -OutCode $dupCode
  Assert-Fail -TestName "POST /api/assets (duplicate serial → 409)" -Response $dup -ActualCode $dupCode.Value
}

# 4c. GET the new asset back
if ($smokeAssetId) {
  $getAssetCode = [ref]0
  $getAsset = Invoke-Api -Path "/api/assets/$smokeAssetId" -OutCode $getAssetCode
  $ok = ($getAsset.success -eq $true) -and ($getAsset.data.id -eq $smokeAssetId)
  Record-Result -Name "GET /api/assets/:id (verify creation persisted)" -Passed $ok `
    -Detail $(if (-not $ok) { "HTTP=$($getAssetCode.Value)" } else { '' })
}

# ═══════════════════════════════════════════════════════════════════════════════
#  Section 5 — Allocation Workflow
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "── Section 5: Allocation ────────────────────────────────────────" -ForegroundColor Magenta

# Need asset manager session for allocation
$mgLoginCode = [ref]0
$mgLogin = Invoke-Api -Method POST -Path '/api/auth/login' -Body @{
  email    = 'manager@assetflow.com'
  password = 'Password123'
} -OutCode $mgLoginCode
Record-Result -Name "Login as Asset Manager" -Passed ($mgLogin.success -eq $true)

# Get employee1 id
$empsCode = [ref]0
$emps = Invoke-Api -Path '/api/employees' -OutCode $empsCode
$emp1 = $emps.data | Where-Object { $_.email -eq 'employee1@assetflow.com' } | Select-Object -First 1
$emp1Id = $emp1.id

$allocCode = [ref]0
$alloc = $null
if ($smokeAssetId -and $emp1Id) {
  $alloc = Invoke-Api -Method POST -Path '/api/allocations' -Body @{
    assetId    = $smokeAssetId
    employeeId = $emp1Id
    expectedReturnAt = (Get-Date).AddDays(30).ToString('o')
  } -OutCode $allocCode
  Assert-Success -TestName "POST /api/allocations (allocate smoke asset)" -Response $alloc -ActualCode $allocCode.Value
} else {
  Record-Result -Name "POST /api/allocations (allocate smoke asset)" -Passed $false -Detail "Missing assetId or employeeId"
}

$allocId = $alloc.data.id

# 5b. Double-allocate should fail
if ($smokeAssetId -and $emp1Id) {
  $dup2Code = [ref]0
  $dup2 = Invoke-Api -Method POST -Path '/api/allocations' -Body @{
    assetId    = $smokeAssetId
    employeeId = $emp1Id
  } -OutCode $dup2Code
  Assert-Fail -TestName "POST /api/allocations (double-allocate → 409)" -Response $dup2 -ActualCode $dup2Code.Value
}

# 5c. Return the allocation
if ($allocId) {
  $retCode = [ref]0
  $ret = Invoke-Api -Method PATCH -Path "/api/allocations/$allocId/return" -Body @{
    returnCondition = 'Good'
    checkInNotes    = "Smoke test run $runId"
  } -OutCode $retCode
  Assert-Success -TestName "PATCH /api/allocations/:id/return" -Response $ret -ActualCode $retCode.Value
}

# ═══════════════════════════════════════════════════════════════════════════════
#  Section 6 — Booking Workflow
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "── Section 6: Bookings ──────────────────────────────────────────" -ForegroundColor Magenta

# Switch to employee1
$e1LoginCode = [ref]0
$e1Login = Invoke-Api -Method POST -Path '/api/auth/login' -Body @{
  email    = 'employee1@assetflow.com'
  password = 'Password123'
} -OutCode $e1LoginCode
Record-Result -Name "Login as employee1" -Passed ($e1Login.success -eq $true)

# Resolve Room B2 (the seeded bookable asset)
$assetsCode = [ref]0
$allAssets = Invoke-Api -Path '/api/assets' -OutCode $assetsCode
$roomB2 = $allAssets.data | Where-Object { $_.assetTag -eq 'AF-0003' } | Select-Object -First 1
$roomB2Id = $roomB2.id

# Use a day far in the future unique to this run so there's no collision
# with other smoke-test runs or with the seeded "tomorrow" booking.
$uniqueOffset = 60 + ($runId % 200)          # 60–259 days out
$bookingDay   = (Get-Date).Date.AddDays($uniqueOffset)
$bookStart    = $bookingDay.AddHours(14).ToString('o')  # 14:00 local
$bookEnd      = $bookingDay.AddHours(15).ToString('o')  # 15:00 local

$bkCode = [ref]0
$bk = $null
if ($roomB2Id) {
  $bk = Invoke-Api -Method POST -Path '/api/bookings' -Body @{
    assetId   = $roomB2Id
    startAt   = $bookStart
    endAt     = $bookEnd
    purpose   = "Smoke test booking $tag"
  } -OutCode $bkCode
  Assert-Success -TestName "POST /api/bookings (unique future slot)" -Response $bk -ActualCode $bkCode.Value
} else {
  Record-Result -Name "POST /api/bookings (unique future slot)" -Passed $false -Detail "Room B2 not found in assets"
}

$bkId = $bk.data.id

# 6b. Overlap on the SAME slot should be rejected (BOOKING_OVERLAP)
if ($roomB2Id -and $bkId) {
  $overlapCode = [ref]0
  $overlap = Invoke-Api -Method POST -Path '/api/bookings' -Body @{
    assetId = $roomB2Id
    startAt = $bookStart
    endAt   = $bookEnd
    purpose = "Overlap attempt $tag"
  } -OutCode $overlapCode
  Assert-Fail -TestName "POST /api/bookings (overlap → BOOKING_OVERLAP)" -Response $overlap -ActualCode $overlapCode.Value -ExpectedCode 'BOOKING_OVERLAP'
}

# 6c. The seeded "tomorrow 09:30" conflict test — intentionally uses the seeded slot.
#     We try to book 09:30–10:30 tomorrow when seed already has 09:00–10:00.
if ($roomB2Id) {
  $seedConflictDay = (Get-Date).Date.AddDays(1)
  $sc1 = $seedConflictDay.AddHours(9).AddMinutes(30).ToString('o')
  $sc2 = $seedConflictDay.AddHours(10).AddMinutes(30).ToString('o')
  $scCode = [ref]0
  $sc = Invoke-Api -Method POST -Path '/api/bookings' -Body @{
    assetId = $roomB2Id
    startAt = $sc1
    endAt   = $sc2
    purpose = "Seed conflict test $tag"
  } -OutCode $scCode
  # This SHOULD fail if the seed booking is still UPCOMING.
  # If the seed booking has been cleaned up, the slot may be free — we record
  # the result informatively without failing the suite.
  if ($scCode.Value -ge 400) {
    Record-Result -Name "POST /api/bookings (seeded slot overlap → rejected)" -Passed $true
  } else {
    Record-Result -Name "POST /api/bookings (seeded slot overlap → rejected)" -Passed $false `
      -Detail "Expected conflict with seeded booking but request succeeded (HTTP=$($scCode.Value)). Was the seed booking already cancelled?"
  }
}

# 6d. Cancel the smoke-test booking
if ($bkId) {
  $cancelCode = [ref]0
  $cancel = Invoke-Api -Method POST -Path "/api/bookings/$bkId/cancel" -OutCode $cancelCode
  Assert-Success -TestName "POST /api/bookings/:id/cancel" -Response $cancel -ActualCode $cancelCode.Value
}

# ═══════════════════════════════════════════════════════════════════════════════
#  Section 7 — Transfer Request
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "── Section 7: Transfer Requests ─────────────────────────────────" -ForegroundColor Magenta

# Create a second smoke asset (AVAILABLE) specifically for transfer test
# Switch back to asset-manager session
Invoke-Api -Method POST -Path '/api/auth/login' -Body @{
  email    = 'manager@assetflow.com'
  password = 'Password123'
} | Out-Null

$xferAssetCode = [ref]0
$xferAsset = $null
if ($elecCatId -and $engDeptId) {
  $xferAsset = Invoke-Api -Method POST -Path '/api/assets' -Body @{
    name               = "Smoke XferAsset $tag"
    description        = "Smoke transfer test asset run $runId"
    categoryId         = $elecCatId
    owningDepartmentId = $engDeptId
    location           = $smokeLocation
    condition          = 'Good'
    serialNumber       = "SN-XFR-$tag"
    acquisitionDate    = (Get-Date).ToString('yyyy-MM-dd')
    acquisitionCost    = 0
    isBookable         = $false
  } -OutCode $xferAssetCode
  Assert-Success -TestName "POST /api/assets (create transfer test asset)" -Response $xferAsset -ActualCode $xferAssetCode.Value
}

$xferAssetId = $xferAsset.data.id

# Switch to employee1 to submit a transfer request
Invoke-Api -Method POST -Path '/api/auth/login' -Body @{
  email    = 'employee1@assetflow.com'
  password = 'Password123'
} | Out-Null

# Get employee2 id
$emp2 = $emps.data | Where-Object { $_.email -eq 'employee2@assetflow.com' } | Select-Object -First 1
$emp2Id = $emp2.id

$trCode = [ref]0
$tr = $null
if ($xferAssetId -and $emp2Id) {
  $tr = Invoke-Api -Method POST -Path '/api/transfers' -Body @{
    assetId      = $xferAssetId
    toEmployeeId = $emp2Id
    reason       = "Smoke transfer $tag"
  } -OutCode $trCode
  Assert-Success -TestName "POST /api/transfers (request transfer)" -Response $tr -ActualCode $trCode.Value
}

$trId = $tr.data.id

# Approve as asset manager — uses PATCH with status field
if ($trId) {
  Invoke-Api -Method POST -Path '/api/auth/login' -Body @{
    email    = 'manager@assetflow.com'
    password = 'Password123'
  } | Out-Null

  $approveCode = [ref]0
  $approve = Invoke-Api -Method PATCH -Path "/api/transfers/$trId" -Body @{
    status = 'APPROVED'
  } -OutCode $approveCode
  Assert-Success -TestName "PATCH /api/transfers/:id (approve)" -Response $approve -ActualCode $approveCode.Value
}

# ═══════════════════════════════════════════════════════════════════════════════
#  Section 8 — Maintenance Request
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "── Section 8: Maintenance ───────────────────────────────────────" -ForegroundColor Magenta

# employee1 creates a third smoke asset (via manager) then reports maintenance
Invoke-Api -Method POST -Path '/api/auth/login' -Body @{
  email    = 'manager@assetflow.com'
  password = 'Password123'
} | Out-Null

$maintAsset = $null
if ($elecCatId -and $engDeptId) {
  $maintAsset = Invoke-Api -Method POST -Path '/api/assets' -Body @{
    name               = "Smoke MaintAsset $tag"
    description        = "Smoke maintenance test asset run $runId"
    categoryId         = $elecCatId
    owningDepartmentId = $engDeptId
    location           = $smokeLocation
    condition          = 'Fair'
    serialNumber       = "SN-MNT-$tag"
    acquisitionDate    = (Get-Date).ToString('yyyy-MM-dd')
    acquisitionCost    = 0
    isBookable         = $false
  }
  Assert-Success -TestName "POST /api/assets (create maintenance test asset)" -Response $maintAsset -ActualCode 200
}
$maintAssetId = $maintAsset.data.id

# Allocate to emp1 so they can report
if ($maintAssetId -and $emp1Id) {
  Invoke-Api -Method POST -Path '/api/allocations' -Body @{
    assetId    = $maintAssetId
    employeeId = $emp1Id
  } | Out-Null
}

Invoke-Api -Method POST -Path '/api/auth/login' -Body @{
  email    = 'employee1@assetflow.com'
  password = 'Password123'
} | Out-Null

$mrCode = [ref]0
$mr = $null
if ($maintAssetId) {
  $mr = Invoke-Api -Method POST -Path '/api/maintenance' -Body @{
    assetId          = $maintAssetId
    issueDescription = "Smoke test fault report $tag — keyboard unresponsive"
    priority         = 'MEDIUM'
  } -OutCode $mrCode
  Assert-Success -TestName "POST /api/maintenance (report fault)" -Response $mr -ActualCode $mrCode.Value
}

$mrId = $mr.data.id

# Manager: PATCH to APPROVED, then TECHNICIAN_ASSIGNED, then resolve — all via PATCH /:id
if ($mrId) {
  Invoke-Api -Method POST -Path '/api/auth/login' -Body @{
    email    = 'manager@assetflow.com'
    password = 'Password123'
  } | Out-Null

  # Step 1: Approve
  $mrApprCode = [ref]0
  $mrAppr = Invoke-Api -Method PATCH -Path "/api/maintenance/$mrId" -Body @{
    status = 'APPROVED'
  } -OutCode $mrApprCode
  Assert-Success -TestName "PATCH /api/maintenance/:id (approve)" -Response $mrAppr -ActualCode $mrApprCode.Value

  # Step 2: Assign the manager as technician (use manager's own id from the me response)
  # Get the manager's id first
  $mgMeCode = [ref]0
  $mgMe = Invoke-Api -Path '/api/auth/me' -OutCode $mgMeCode
  $mgId = $mgMe.data.id

  $mrAssignCode = [ref]0
  $mrAssign = Invoke-Api -Method PATCH -Path "/api/maintenance/$mrId" -Body @{
    status       = 'TECHNICIAN_ASSIGNED'
    technicianId = $mgId
  } -OutCode $mrAssignCode
  Assert-Success -TestName "PATCH /api/maintenance/:id (assign technician)" -Response $mrAssign -ActualCode $mrAssignCode.Value

  # Step 3: Technician (manager) moves to IN_PROGRESS
  $mrProgCode = [ref]0
  $mrProg = Invoke-Api -Method PATCH -Path "/api/maintenance/$mrId" -Body @{
    status = 'IN_PROGRESS'
  } -OutCode $mrProgCode
  Assert-Success -TestName "PATCH /api/maintenance/:id (in progress)" -Response $mrProg -ActualCode $mrProgCode.Value

  # Step 4: Resolve
  $mrResCode = [ref]0
  $mrRes = Invoke-Api -Method PATCH -Path "/api/maintenance/$mrId" -Body @{
    status     = 'RESOLVED'
    resolution = "Replaced keyboard — smoke test run $tag resolved successfully"
    cost       = 150
    condition  = 'Good'
  } -OutCode $mrResCode
  Assert-Success -TestName "PATCH /api/maintenance/:id (resolve)" -Response $mrRes -ActualCode $mrResCode.Value
}

# ═══════════════════════════════════════════════════════════════════════════════
#  Section 9 — Audit Lifecycle (fully isolated to $smokeLocation)
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "── Section 9: Audit Lifecycle (isolated) ───────────────────────" -ForegroundColor Magenta

# Admin creates the cycle scoped to $smokeLocation so ONLY smoke-test assets
# enter the audit — never Engineering-wide assets from seed.
Invoke-Api -Method POST -Path '/api/auth/login' -Body @{
  email    = 'admin@assetflow.com'
  password = 'Password123'
} | Out-Null

$cycleName = "Smoke Audit $tag"
$auditStart = (Get-Date).Date.ToString('yyyy-MM-dd')
$auditEnd   = (Get-Date).Date.AddDays(7).ToString('yyyy-MM-dd')

$cycleCode = [ref]0
$cycle = Invoke-Api -Method POST -Path '/api/audits' -Body @{
  name          = $cycleName
  scopeLocation = $smokeLocation          # isolates to SMOKE-$runId location only
  startDate     = $auditStart
  endDate       = $auditEnd
} -OutCode $cycleCode
Assert-Success -TestName "POST /api/audits (create audit cycle)" -Response $cycle -ActualCode $cycleCode.Value

$cycleId = $cycle.data.id

# Activate
if ($cycleId) {
  $activCode = [ref]0
  $activ = Invoke-Api -Method POST -Path "/api/audits/$cycleId/activate" -OutCode $activCode
  Assert-Success -TestName "POST /api/audits/:id/activate" -Response $activ -ActualCode $activCode.Value
}

# Assign admin as auditor
if ($cycleId -and $me.data.id) {
  $assignCode = [ref]0
  $assign = Invoke-Api -Method POST -Path "/api/audits/$cycleId/assign" -Body @{
    auditorIds    = @($me.data.id)
    assignedScope = $smokeLocation
  } -OutCode $assignCode
  Assert-Success -TestName "POST /api/audits/:id/assign (auditor)" -Response $assign -ActualCode $assignCode.Value
}

# Get audit items for this cycle
if ($cycleId) {
  # GET /:id returns { ...cycle, items: [...] } — no separate /items sub-route
  $itemsCode = [ref]0
  $itemsResp = Invoke-Api -Path "/api/audits/$cycleId" -OutCode $itemsCode
  $auditItems = $itemsResp.data.items
  Record-Result -Name "GET /api/audits/:id (items included in response)" -Passed ($itemsCode.Value -in 200, 201)

  # Verify first item as FOUND
  $firstItem = $auditItems | Select-Object -First 1
  if ($firstItem) {
    $verifyCode = [ref]0
    $verify = Invoke-Api -Method PATCH -Path "/api/audits/$cycleId/items/$($firstItem.id)" -Body @{
      result = 'VERIFIED'
      notes  = "Smoke test verified $tag"
    } -OutCode $verifyCode
    Assert-Success -TestName "PATCH /api/audits/:id/items/:itemId (verify VERIFIED)" -Response $verify -ActualCode $verifyCode.Value
  }

  # Close the cycle
  $closeCode = [ref]0
  $close = Invoke-Api -Method POST -Path "/api/audits/$cycleId/close" -OutCode $closeCode
  Assert-Success -TestName "POST /api/audits/:id/close" -Response $close -ActualCode $closeCode.Value
}

# ═══════════════════════════════════════════════════════════════════════════════
#  Section 10 — Dashboard & Reports endpoints
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "── Section 10: Dashboard & Reports ─────────────────────────────" -ForegroundColor Magenta

# Admin dashboard
Invoke-Api -Method POST -Path '/api/auth/login' -Body @{
  email    = 'admin@assetflow.com'
  password = 'Password123'
} | Out-Null

$dashCode = [ref]0
$dash = Invoke-Api -Path '/api/dashboard' -OutCode $dashCode
$dashOk = ($dash.success -eq $true) -and ($null -ne $dash.data.kpis)
Record-Result -Name "GET /api/dashboard (admin)" -Passed $dashOk `
  -Detail $(if (-not $dashOk) { "HTTP=$($dashCode.Value) success=$($dash.success)" } else { '' })

# Reports (admin)
$repCode = [ref]0
$rep = Invoke-Api -Path '/api/reports' -OutCode $repCode
$repOk = ($rep.success -eq $true) -and ($null -ne $rep.data.utilization)
Record-Result -Name "GET /api/reports (admin)" -Passed $repOk `
  -Detail $(if (-not $repOk) { "HTTP=$($repCode.Value) success=$($rep.success)" } else { '' })

# Employee should get dashboard but NOT reports
Invoke-Api -Method POST -Path '/api/auth/login' -Body @{
  email    = 'employee1@assetflow.com'
  password = 'Password123'
} | Out-Null

$empDashCode = [ref]0
$empDash = Invoke-Api -Path '/api/dashboard' -OutCode $empDashCode
Record-Result -Name "GET /api/dashboard (employee — allowed)" -Passed ($empDash.success -eq $true) `
  -Detail $(if ($empDash.success -ne $true) { "HTTP=$($empDashCode.Value)" } else { '' })

$empRepCode = [ref]0
$empRep = Invoke-Api -Path '/api/reports' -OutCode $empRepCode
Assert-Fail -TestName "GET /api/reports (employee — must be 403)" -Response $empRep -ActualCode $empRepCode.Value

# ═══════════════════════════════════════════════════════════════════════════════
#  Section 11 — RBAC Guard
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "── Section 11: RBAC Guard ───────────────────────────────────────" -ForegroundColor Magenta

# Unauthenticated request to protected route
$session2 = [Microsoft.PowerShell.Commands.WebRequestSession]::new()
$noAuthCode = [ref]0
try {
  $noAuth = Invoke-RestMethod -Method GET -Uri "$BaseUrl/api/assets" `
    -WebSession $session2 -ErrorAction Stop
  Record-Result -Name "GET /api/assets (no auth → 401)" -Passed $false -Detail "Expected 401 but got success"
} catch {
  $sc = 0
  try { $sc = [int]$_.Exception.Response.StatusCode } catch {}
  Record-Result -Name "GET /api/assets (no auth → 401)" -Passed ($sc -eq 401) `
    -Detail $(if ($sc -ne 401) { "Got HTTP $sc" } else { '' })
}

# ═══════════════════════════════════════════════════════════════════════════════
#  Section 12 — Logout
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "── Section 12: Logout ───────────────────────────────────────────" -ForegroundColor Magenta

Invoke-Api -Method POST -Path '/api/auth/login' -Body @{
  email    = 'admin@assetflow.com'
  password = 'Password123'
} | Out-Null

$logoutCode = [ref]0
$logout = Invoke-Api -Method POST -Path '/api/auth/logout' -OutCode $logoutCode
Assert-Success -TestName "POST /api/auth/logout" -Response $logout -ActualCode $logoutCode.Value

# ═══════════════════════════════════════════════════════════════════════════════
#  Summary
# ═══════════════════════════════════════════════════════════════════════════════
Show-Summary

if ($failures -gt 0) {
  exit 1
} else {
  exit 0
}
