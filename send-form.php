<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
http_response_code(410);
echo json_encode([
    'ok' => false,
    'code' => 'direct_contact_only',
    'message' => 'Онлайн-форма не используется. Используйте WhatsApp, телефон или e-mail, указанные на сайте.',
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
