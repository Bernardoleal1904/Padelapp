# Auto-elevate to Administrator
if (!([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "A solicitar permissoes de Administrador..."
    Start-Process powershell.exe "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
    exit
}

$port = 8080
$root = $PSScriptRoot

# Obter IP
$ip = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias *Ethernet* | Where-Object { $_.IPAddress -like "192.*" }).IPAddress
if (!$ip) { $ip = "192.168.1.71" }

Write-Host "---------------------------------------------------"
Write-Host "CONFIGURANDO SERVIDOR"
Write-Host "---------------------------------------------------"

# Configurar Firewall
Write-Host "1. A configurar Firewall..."
try {
    New-NetFirewallRule -DisplayName "Padel App Server" -Direction Inbound -LocalPort $port -Protocol TCP -Action Allow -ErrorAction SilentlyContinue | Out-Null
    Write-Host "   -> Sucesso." -ForegroundColor Green
} catch {
    Write-Host "   -> Aviso: Firewall nao configurada." -ForegroundColor Yellow
}

# Iniciar Listener
Write-Host "2. A iniciar servidor..."
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://*:$($port)/")

try {
    $listener.Start()
    Write-Host ""
    Write-Host "SUCESSO! Servidor online." -ForegroundColor Green
    Write-Host "No telemovel, abra: http://$($ip):$($port)/" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Pressione Ctrl+C para parar."
} catch {
    Write-Error "Erro: $($_.Exception.Message)"
    exit
}

$mimeTypes = @{
    ".html" = "text/html"
    ".js"   = "application/javascript"
    ".css"  = "text/css"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".svg"  = "image/svg+xml"
}

while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $res = $ctx.Response
    
    $localPath = $ctx.Request.Url.LocalPath.TrimStart('/')
    $path = Join-Path $root $localPath
    
    if ($localPath -eq "" -or (Test-Path $path -PathType Container)) { 
        $path = Join-Path $path "index.html" 
    }
    
    if (Test-Path $path -PathType Leaf) {
        try {
            $bytes = [System.IO.File]::ReadAllBytes($path)
            $res.ContentLength64 = $bytes.Length
            
            $ext = [System.IO.Path]::GetExtension($path).ToLower()
            
            if ($mimeTypes.ContainsKey($ext)) {
                $res.ContentType = $mimeTypes[$ext]
            } else {
                $res.ContentType = "application/octet-stream"
            }
            
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
            $res.StatusCode = 200
        } catch {
            $res.StatusCode = 500
        }
    } else {
        $res.StatusCode = 404
    }
    $res.Close()
}
