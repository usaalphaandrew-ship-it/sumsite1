<?php
define('ACCESS_KEY',       getenv('ADMIN_ACCESS_KEY') ?: 'admin3200');
define('SUMSUB_APP_TOKEN', getenv('SUMSUB_APP_TOKEN') ?: '');
define('SUMSUB_SECRET',    getenv('SUMSUB_SECRET') ?: '');
define('SUMSUB_LEVEL',     getenv('SUMSUB_LEVEL') ?: 'id-and-liveness');
define('SUMSUB_BASE',      'https://api.sumsub.com');
define('USER_PREFIX',      'aich_');
