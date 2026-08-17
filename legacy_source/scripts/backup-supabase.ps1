# Remote Supabase backup without Docker (uses Supabase CLI login role + local pg_dump).
# Writes to: supabase-backup/schema_*.sql, data_*.sql, migrations/, functions/
# Always dumps the currently linked project (see supabase/.temp/project-ref).

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$backupDir = Join-Path $root "supabase-backup"
$migrationsDir = Join-Path $root "supabase\migrations"
$functionsDir = Join-Path $root "supabase\functions"
$projectRefFile = Join-Path $root "supabase\.temp\project-ref"
$expectedProjectRef = "vitmvkmjjwabfzndynlj" # webmain

New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

$stamp = Get-Date -Format "yyyy-MM-dd_HHmm"
$schemaFile = Join-Path $backupDir "schema_$stamp.sql"
$dataFile = Join-Path $backupDir "data_$stamp.sql"
$snapshotDir = Join-Path $backupDir "snapshot_$stamp"

if (-not (Test-Path $projectRefFile)) {
    throw "No linked Supabase project (missing supabase/.temp/project-ref). Run: npx supabase link"
}
$linkedRef = (Get-Content $projectRefFile -Raw).Trim()
if ($linkedRef -ne $expectedProjectRef) {
    throw "Linked project is '$linkedRef', expected webmain '$expectedProjectRef'. Aborting backup."
}
Write-Host "Linked project: webmain ($linkedRef)"

function Get-SupabasePgEnv {
    param([switch]$DataOnly)
    $args = if ($DataOnly) { "db dump --linked --data-only --dry-run" } else { "db dump --linked --dry-run" }
    $dry = (cmd /c "npx supabase $args 2>&1") -join "`n"
    if (-not ($dry -match 'export PGHOST=')) {
        throw "supabase db dump --dry-run failed`n$dry"
    }
    @{
        Host = ($dry | Select-String 'export PGHOST="([^"]+)"').Matches[0].Groups[1].Value
        Port = ($dry | Select-String 'export PGPORT="([^"]+)"').Matches[0].Groups[1].Value
        User = ($dry | Select-String 'export PGUSER="([^"]+)"').Matches[0].Groups[1].Value
        Pass = ($dry | Select-String 'export PGPASSWORD="([^"]+)"').Matches[0].Groups[1].Value
        Db   = ($dry | Select-String 'export PGDATABASE="([^"]+)"').Matches[0].Groups[1].Value
    }
}

function Invoke-SchemaDump {
    param($Pg, $OutFile)
    $exclude = "information_schema|pg_*|_analytics|_realtime|_supavisor|auth|etl|extensions|pgbouncer|realtime|storage|supabase_functions|supabase_migrations|cron|dbdev|graphql|graphql_public|net|pgmq|pgsodium|pgsodium_masks|pgtle|repack|tiger|tiger_data|timescaledb_*|_timescaledb_*|topology|vault"
    & pg_dump `
        -h $Pg.Host -p $Pg.Port -U $Pg.User -d $Pg.Db `
        --schema-only --quote-all-identifiers --role postgres `
        "--exclude-schema=$exclude" `
        -f $OutFile
    if ($LASTEXITCODE -ne 0) { throw "schema pg_dump failed ($LASTEXITCODE)" }
}

function Invoke-DataDump {
    param($Pg, $OutFile)
    $exclude = "information_schema|pg_*|graphql|graphql_public|pgsodium|pgsodium_masks|pgtle|repack|tiger|tiger_data|timescaledb_*|_timescaledb_*|topology|vault|etl|extensions|pgbouncer|realtime|supabase_migrations|_analytics|_realtime|_supavisor"
    @"
SET session_replication_role = replica;

"@ | Set-Content $OutFile -Encoding UTF8
    & pg_dump `
        -h $Pg.Host -p $Pg.Port -U $Pg.User -d $Pg.Db `
        --data-only --quote-all-identifiers --role postgres `
        "--exclude-schema=$exclude" `
        --exclude-table=auth.schema_migrations `
        --exclude-table=storage.migrations `
        --exclude-table=supabase_functions.migrations `
        --schema=* --column-inserts --rows-per-insert=100000 `
        | Add-Content $OutFile -Encoding UTF8
    if ($LASTEXITCODE -ne 0) { throw "data pg_dump failed ($LASTEXITCODE)" }
    "`nRESET ALL;" | Add-Content $OutFile -Encoding UTF8
}

Push-Location $root
try {
    Write-Host "Schema dump..."
    $pgSchema = Get-SupabasePgEnv
    $env:PGPASSWORD = $pgSchema.Pass
    Invoke-SchemaDump -Pg $pgSchema -OutFile $schemaFile
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue

    Write-Host "Data dump..."
    $pgData = Get-SupabasePgEnv -DataOnly
    $env:PGPASSWORD = $pgData.Pass
    Invoke-DataDump -Pg $pgData -OutFile $dataFile
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue

    Write-Host "Copying migrations and edge functions..."
    New-Item -ItemType Directory -Force -Path $snapshotDir | Out-Null
    if (Test-Path $migrationsDir) {
        Copy-Item -Recurse -Force $migrationsDir (Join-Path $snapshotDir "migrations")
    }
    if (Test-Path $functionsDir) {
        Copy-Item -Recurse -Force $functionsDir (Join-Path $snapshotDir "functions")
    }

    Copy-Item -Force $schemaFile (Join-Path $backupDir "schema_latest.sql")
    Copy-Item -Force $dataFile (Join-Path $backupDir "data_latest.sql")

    $s = Get-Item $schemaFile
    $d = Get-Item $dataFile
    Write-Host ""
    Write-Host "Backup complete ($stamp):"
    Write-Host "  $($s.Name)  $([math]::Round($s.Length / 1KB, 1)) KB"
    Write-Host "  $($d.Name)    $([math]::Round($d.Length / 1KB, 1)) KB"
    Write-Host "  snapshot_$stamp/ (migrations + functions)"
}
finally {
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    Pop-Location
}
