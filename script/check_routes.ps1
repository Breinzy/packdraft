$urls = @('http://localhost:3000/', 'http://localhost:3000/auth/login', 'http://localhost:3000/auth/signup')
foreach ($url in $urls) {
    $r = Invoke-WebRequest -Uri $url -UseBasicParsing -SkipHttpErrorCheck
    Write-Host "$url : $($r.StatusCode)"
    if ($r.StatusCode -ge 400 -and $r.Content) {
        $snippet = $r.Content.Substring(0, [Math]::Min(500, $r.Content.Length))
        if ($snippet -match 'Supabase|Error|error|digest') { Write-Host "  Snippet: $snippet" }
    }
}
