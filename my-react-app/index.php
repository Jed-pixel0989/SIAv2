<?php
// Waterline Utility System - React Entry Bridge
// Automatically redirects direct directory hits to the production build
header("Location: dist/");
exit;
?>
<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="refresh" content="0; url=dist/" />
  <script>window.location.href = "dist/";</script>
</head>
<body>
  <p>Redirecting to <a href="dist/">Waterline Application</a>...</p>
</body>
</html>
