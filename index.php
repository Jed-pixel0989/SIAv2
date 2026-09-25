<?php
// Waterline Utility System - Root Entry Bridge
// Directs requests to the main application interface
header("Location: my-react-app/dist/");
exit;
?>
<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="refresh" content="0; url=my-react-app/dist/" />
  <script>window.location.href = "my-react-app/dist/";</script>
</head>
<body>
  <p>Loading Waterline Utility Management Suite... <a href="my-react-app/dist/">Click here</a></p>
</body>
</html>
