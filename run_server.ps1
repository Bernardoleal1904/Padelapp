$port = 8080
$ip = "192.168.1.71"
$root = $PSScriptRoot

Write-Host "Iniciando servidor..."

try {
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add("http://$($ip):$($port)/")
    $listener.Start()
    Write-Host "SERVIDOR ONLINE: http://$($ip):$($port)/"
} catch {
    Write-Warning "Falha ao iniciar no IP da rede (requer Administrador)."
    Write-Host "Tentando localhost..."
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add("http://localhost:$($port)/")
    $listener.Start()
    Write-Host "SERVIDOR LOCAL: http://localhost:$($port)/"
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
            if ($ext -eq ".html") { $res.ContentType = "text/html" }
            elseif ($ext -eq ".js") { $res.ContentType = "application/javascript" }
            elseif ($ext -eq ".css") { $res.ContentType = "text/css" }
            elseif ($ext -eq ".png") { $res.ContentType = "image/png" }
            
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
