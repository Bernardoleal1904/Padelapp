# Auto-elevate to Administrator
if (!([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "A solicitar permissoes de Administrador..."
    Start-Process powershell.exe "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
    exit
}

$port = 8080
$root = $PSScriptRoot

# 1. Detetar e Corrigir Perfil de Rede (Public -> Private)
Write-Host "1. A verificar Perfil de Rede..."
$profile = Get-NetConnectionProfile | Where-Object { $_.InterfaceAlias -like "*Ethernet*" -or $_.InterfaceAlias -like "*Wi-Fi*" }
if ($profile) {
    if ($profile.NetworkCategory -eq "Public") {
        Write-Host "   -> A sua rede esta definida como 'Publica'. Isto bloqueia conexoes." -ForegroundColor Yellow
        Write-Host "   -> A mudar para 'Privada' (Trust Network)..."
        try {
            $profile | Set-NetConnectionProfile -NetworkCategory Private
            Write-Host "   -> Sucesso! Rede agora e Privada." -ForegroundColor Green
        } catch {
            Write-Host "   -> FALHA ao mudar perfil de rede. O telemovel pode nao conseguir ligar." -ForegroundColor Red
        }
    } else {
        Write-Host "   -> Rede ja esta configurada como 'Privada' ou 'Domain'. (OK)" -ForegroundColor Green
    }
}

# 2. Configurar Firewall (Forçar Entrada)
Write-Host "2. A configurar Firewall..."
try {
    # Remove old rules just in case
    Remove-NetFirewallRule -DisplayName "Padel App Server" -ErrorAction SilentlyContinue | Out-Null
    
    # Add new rule allowing ALL profiles (Public, Private, Domain)
    New-NetFirewallRule -DisplayName "Padel App Server" -Direction Inbound -LocalPort $port -Protocol TCP -Action Allow -Profile Any
    Write-Host "   -> Regra de Firewall criada com sucesso (Porta $port)." -ForegroundColor Green
} catch {
    Write-Host "   -> Aviso: Nao foi possivel configurar a Firewall automaticamente." -ForegroundColor Yellow
}

# 3. Obter IP
$ip = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias *Ethernet* | Where-Object { $_.IPAddress -like "192.*" }).IPAddress
if (!$ip) { 
    $ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -like "192.*" -and $_.InterfaceAlias -notlike "*Loopback*" }).IPAddress 
}
if (!$ip) { $ip = "192.168.1.71" } # Fallback

# 4. Iniciar Servidor
Write-Host "---------------------------------------------------"
Write-Host "SERVIDOR ONLINE" -ForegroundColor Green
Write-Host "---------------------------------------------------"
Write-Host ""
Write-Host "No seu telemovel, abra este endereco:" 
Write-Host "http://$($ip):$($port)/" -ForegroundColor Cyan
Write-Host ""
Write-Host "IMPORTANTE:"
Write-Host "- O telemovel TEM de estar ligado ao mesmo Wi-Fi que este PC."
Write-Host "- Se nao funcionar, desligue temporariamente o Antivirus/Firewall."
Write-Host ""

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://*:$($port)/")

try {
    $listener.Start()
} catch {
    Write-Error "Erro ao iniciar na porta $port. Tente fechar outras janelas do servidor."
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
    $req = $ctx.Request
    $res = $ctx.Response
    
    $localPath = $req.Url.LocalPath.TrimStart('/')
    
    # Log Request
    $remoteIP = $req.RemoteEndPoint.Address.ToString()
    Write-Host "[$((Get-Date).ToString('HH:mm:ss'))] $remoteIP -> $($req.HttpMethod) /$localPath" -ForegroundColor Gray

    # Global CORS (Preflight)
    $res.AddHeader("Access-Control-Allow-Origin", "*")
    $res.AddHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    $res.AddHeader("Access-Control-Allow-Headers", "Content-Type")

    if ($req.HttpMethod -eq "OPTIONS") {
        $res.StatusCode = 200
        $res.Close()
        continue
    }
    
    # API Handler
    if ($localPath -eq "api/state") {
        $res.AddHeader("Content-Type", "application/json")
        
        if ($req.HttpMethod -eq "GET") {
            $dbPath = Join-Path $root "db.json"
            if (Test-Path $dbPath) {
                $bytes = [System.IO.File]::ReadAllBytes($dbPath)
                $res.OutputStream.Write($bytes, 0, $bytes.Length)
            } else {
                $bytes = [System.Text.Encoding]::UTF8.GetBytes("null")
                $res.OutputStream.Write($bytes, 0, $bytes.Length)
            }
            $res.StatusCode = 200
        }
        elseif ($req.HttpMethod -eq "POST") {
            $reader = New-Object System.IO.StreamReader($req.InputStream)
            $body = $reader.ReadToEnd()
            $dbPath = Join-Path $root "db.json"
            [System.IO.File]::WriteAllText($dbPath, $body)
            Write-Host "   -> DADOS GUARDADOS ($($body.Length) bytes)" -ForegroundColor Green
            $bytes = [System.Text.Encoding]::UTF8.GetBytes('{"success":true}')
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
            $res.StatusCode = 200
        }
        $res.Close()
        continue
    }

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