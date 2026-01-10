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
    
    # API Handler
    if ($localPath -eq "api/state") {
        $res.AddHeader("Access-Control-Allow-Origin", "*")
        $res.AddHeader("Content-Type", "application/json")
        
        if ($ctx.Request.HttpMethod -eq "GET") {
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
        elseif ($ctx.Request.HttpMethod -eq "POST") {
            $reader = New-Object System.IO.StreamReader($ctx.Request.InputStream)
            $body = $reader.ReadToEnd()
            $dbPath = Join-Path $root "db.json"
            [System.IO.File]::WriteAllText($dbPath, $body)
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
