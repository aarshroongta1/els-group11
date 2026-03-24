$apiKey = "7MLN1V774I3VMJ07"
$tickers = @("VSMPX", "FXAIX", "VFIAX", "VTSAX", "SPAXX", "VMFXX", "VGTSX", "SWVXX", "FDRXX", "FGTXX", "OGVXX", "FCTDX", "VIIIX", "FRGXX", "VTBNX", "MVRXX", "TFDXX", "GVMXX", "AGTHX", "VTBIX", "CJTXX", "TTTXX", "FCNTX", "SNAXX", "PIMIX")

$results = @()

Write-Host "`n=== Fetching 2025 Returns for 25 Mutual Funds ===`n"

foreach ($ticker in $tickers) {
    try {
        Write-Host "Fetching $ticker..."
        $url = "https://www.alphavantage.co/query?function=TIME_SERIES_MONTHLY&symbol=$ticker&apikey=$apiKey"
        $response = Invoke-WebRequest -Uri $url -ErrorAction Stop
        $data = $response.Content | ConvertFrom-Json
        
        $timeSeries = $data.'Monthly Time Series'
        
        if ($timeSeries) {
            $dec2024 = $timeSeries.'2024-12-31'.'4. close'
            $dec2025 = $timeSeries.'2025-12-31'.'4. close'
            
            if ($dec2024 -and $dec2025) {
                $start = [double]$dec2024
                $end = [double]$dec2025
                $return = ($end - $start) / $start
                
                $results += [PSCustomObject]@{
                    Ticker = $ticker
                    Start_Price = [math]::Round($start, 2)
                    End_Price = [math]::Round($end, 2)
                    Return_Pct = [math]::Round($return * 100, 2)
                    Return_Decimal = [math]::Round($return, 4)
                }
                
                Write-Host "  ✓ $ticker : $([math]::Round($return * 100, 2))%" -ForegroundColor Green
            } else {
                Write-Host "  ✗ $ticker : Missing 2025 data" -ForegroundColor Yellow
                $results += [PSCustomObject]@{
                    Ticker = $ticker
                    Start_Price = "N/A"
                    End_Price = "N/A"
                    Return_Pct = "N/A"
                    Return_Decimal = "N/A"
                }
            }
        } else {
            Write-Host "  ✗ $ticker : API error or no data" -ForegroundColor Red
            $results += [PSCustomObject]@{
                Ticker = $ticker
                Start_Price = "N/A"
                End_Price = "N/A"
                Return_Pct = "N/A"
                Return_Decimal = "N/A"
            }
        }
        
        # Rate limit: wait 12 seconds between calls (5 calls per minute max)
        Start-Sleep -Seconds 13
        
    } catch {
        Write-Host "  ✗ $ticker : Error - $($_.Exception.Message)" -ForegroundColor Red
        $results += [PSCustomObject]@{
            Ticker = $ticker
            Start_Price = "ERROR"
            End_Price = "ERROR"
            Return_Pct = "ERROR"
            Return_Decimal = "ERROR"
        }
    }
}

Write-Host "`n=== Results Summary ===`n"
$results | Format-Table -AutoSize

# Export to CSV for reference
$results | Export-Csv -Path "fund_returns_2025.csv" -NoTypeInformation
Write-Host "`nResults saved to fund_returns_2025.csv"
