function Convert-StringToJsonLiteral([string]$input) {
    $escaped = $input -replace '\\', '\\\\' -replace '"', '\\"' -replace "`r", '' -replace '<', '\\u003c' -replace '>', '\\u003e' -replace "`n", '\\n';
    return '"' + $escaped + '"';
}

$baseData = Get-Content 'Kaniu Site Admin Beta.json' -Raw | ConvertFrom-Json;
$baseScript = ($baseData.nodes | Where-Object { $_.name -eq 'Details Page' }).parameters.jsCode;
$newScript = Get-Content 'details_page_updated.js' -Raw;
$estiloScript = Get-Content 'estilo_updated.js' -Raw;

$baseLiteral = Convert-StringToJsonLiteral $baseScript;
$newLiteral = Convert-StringToJsonLiteral $newScript;
$estiloBase = ($baseData.nodes | Where-Object { $_.name -eq 'Estilo' }).parameters.jsCode;
$estiloLiteralBase = Convert-StringToJsonLiteral $estiloBase;
$estiloLiteralNew = Convert-StringToJsonLiteral $estiloScript;

$content = Get-Content 'Kaniu Site Admin Beta.json' -Raw;
$content = $content.Replace($estiloLiteralBase, $estiloLiteralNew);
$content = $content.Replace($baseLiteral, $newLiteral);
Set-Content -Path 'Details Page' -Value $content -Encoding utf8;
