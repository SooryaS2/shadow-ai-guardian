Add-Type -AssemblyName System.Drawing

$sizes = @(16, 48, 128)
$outputDir = $PSScriptRoot

foreach ($size in $sizes) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = 'AntiAlias'
    $g.Clear([System.Drawing.Color]::Black)

    # Shield gradient brush
    $shieldBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        [System.Drawing.Point]::new(0, 0),
        [System.Drawing.Point]::new($size, $size),
        [System.Drawing.Color]::FromArgb(10, 132, 255),
        [System.Drawing.Color]::FromArgb(50, 215, 75)
    )

    # Shield polygon
    $s = [float]$size
    $points = @(
        [System.Drawing.PointF]::new($s * 0.5, $s * 0.08),
        [System.Drawing.PointF]::new($s * 0.85, $s * 0.25),
        [System.Drawing.PointF]::new($s * 0.85, $s * 0.52),
        [System.Drawing.PointF]::new($s * 0.5, $s * 0.92),
        [System.Drawing.PointF]::new($s * 0.15, $s * 0.52),
        [System.Drawing.PointF]::new($s * 0.15, $s * 0.25)
    )
    $g.FillPolygon($shieldBrush, $points)

    # Center circle (AI eye)
    $whitePen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, [Math]::Max(1, $size / 20))
    $circleSize = $s * 0.3
    $circleX = ($s - $circleSize) / 2
    $circleY = ($s - $circleSize) / 2 - ($s * 0.02)
    $g.DrawEllipse($whitePen, $circleX, $circleY, $circleSize, $circleSize)

    # Inner dot
    $dotBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $dotSize = $s * 0.12
    $dotX = ($s - $dotSize) / 2
    $dotY = ($s - $dotSize) / 2 - ($s * 0.02)
    $g.FillEllipse($dotBrush, $dotX, $dotY, $dotSize, $dotSize)

    $g.Dispose()
    $outputPath = Join-Path $outputDir "icon${size}.png"
    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Created $outputPath"
}
