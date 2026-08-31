<?php
/* =========================================================
   Decidio · Приём заявок (Beget)
   ---------------------------------------------------------
   Принимает два типа заявок:
     • с формы на главной — name, contact, task, source, source_auto;
     • из конструктора    — name, contact, token (+task, +source).
   Плюс антиспам-поля: website (honeypot), elapsed.
   Шлёт письмо на почту владельца; для конструктора вкладывает
   ссылку на служебную admin/preview.html и сам код макета.

   Заливается в корень сайта рядом с constructor.html.
   ========================================================= */

// Небольшой помощник вместо оператора ?? — чтобы файл работал
// и на старых версиях PHP (5.x), где ?? ещё не существует.
function post_val($key) {
  return isset($_POST[$key]) ? $_POST[$key] : '';
}

// ==== НАСТРОЙКИ ====
$TO   = 'Decidio@yandex.ru';             // куда слать заявки
$SITE = 'https://decidio.ru';            // адрес сайта (для ссылки на preview)
// ===================

header('Content-Type: text/plain; charset=utf-8');

// Разрешаем только POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo 'Method Not Allowed';
  exit;
}

/* ======================= АНТИСПАМ =======================
   Отвечаем ботам «OK» (200), но письмо НЕ шлём — чтобы бот
   не понял, что его отсеяли, и не подбирал обход. */

// 1) Honeypot: скрытое поле-ловушка. Люди его не видят и не заполняют,
//    боты-автозаполнители — заполняют. Если непусто — это бот.
if (trim(post_val('website')) !== '') {
  echo 'OK';
  exit;
}

// 2) Отсечка мгновенной отправки: форма должна «прожить» на странице
//    хотя бы 0,8 секунды. Боты шлют почти мгновенно, а человек физически
//    не успеет вписать имя и контакт быстрее — поэтому порог низкий:
//    раньше стояло 3 секунды, и быстрая отправка (например, вставка из
//    буфера) молча терялась, а посетитель видел «Заявка принята».
//    elapsed — миллисекунды с загрузки формы (считает браузер).
$elapsed = intval(post_val('elapsed'));
if ($elapsed > 0 && $elapsed < 800) {
  echo 'OK';
  exit;
}

// ========================================================

// Собираем и чистим поля
$name    = trim(post_val('name'));
$contact = trim(post_val('contact'));
$task    = trim(post_val('task'));   // текст задачи (форма на главной)
$source  = trim(post_val('source')); // «откуда узнали» — со слов клиента
$srcAuto = trim(post_val('source_auto')); // метка перехода (?from=...) — факт
$token   = trim(post_val('token'));   // макет (конструктор) — необязательно

if ($name === '' || $contact === '') {
  http_response_code(400);
  echo 'Не заполнены обязательные поля.';
  exit;
}

// Защита от инъекций в заголовки письма
$strip = function ($s) { return str_replace(["\r", "\n"], ' ', $s); };
$name    = $strip($name);
$contact = $strip($contact);
$srcAuto = preg_replace('/[^a-zA-Z0-9_-]/', '', $srcAuto);

// Токен (макет из конструктора) не должен быть абсурдно длинным
if (strlen($token) > 20000) {
  http_response_code(413);
  echo 'Слишком большой макет.';
  exit;
}

// Формируем письмо в зависимости от типа заявки
if ($token !== '') {
  // --- Заявка из КОНСТРУКТОРА макетов ---
  $previewUrl = $SITE . '/admin/preview.html#' . $token;
  $subject = 'Заявка из конструктора: ' . $name;
  $body  = "Новая заявка из конструктора макетов.\n\n";
  $body .= "Имя:     $name\n";
  $body .= "Контакт: $contact\n";
  if ($task !== '') $body .= "Задача:  $task\n";
  if ($source !== '') $body .= "Узнали:  $source\n";
  if ($srcAuto !== '') $body .= "Метка:   $srcAuto\n";
  $body .= "Время:   " . date('d.m.Y H:i') . "\n\n";
  $body .= "Открыть макет (просмотр + скачивание index.html):\n$previewUrl\n\n";
  $body .= "----- КОД МАКЕТА (запасной путь, вставить в admin/preview.html) -----\n";
  $body .= $token . "\n";
} else {
  // --- Обычная заявка С САЙТА (форма на главной) ---
  $subject = 'Заявка с сайта: ' . $name;
  $body  = "Новая заявка с сайта.\n\n";
  $body .= "Имя:     $name\n";
  $body .= "Контакт: $contact\n";
  $body .= "Задача:  " . ($task !== '' ? $task : "—") . "\n";
  $body .= "Узнали:  " . ($source !== '' ? $source : "—") . "\n";
  $body .= "Метка:   " . ($srcAuto !== '' ? $srcAuto : "—") . "\n";
  $body .= "Время:   " . date('d.m.Y H:i') . "\n";
}

// Заголовки. From — на домене сайта, чтобы письмо не улетало в спам.
$domain  = preg_replace('#^https?://#', '', $SITE);
$headers  = "From: Decidio <noreply@$domain>\r\n";
// Reply-To ставим, только если в контакте действительно почта. Иначе там
// окажется «@username» или телефон — заголовок станет некорректным, и часть
// почтовых серверов отклонит письмо целиком (заявка потеряется).
if (filter_var($contact, FILTER_VALIDATE_EMAIL)) {
  $headers .= "Reply-To: $contact\r\n";
}
$headers .= "Content-Type: text/plain; charset=UTF-8\r\n";

$ok = @mail($TO, '=?UTF-8?B?' . base64_encode($subject) . '?=', $body, $headers);

if ($ok) {
  echo 'OK';
} else {
  http_response_code(500);
  echo 'Не удалось отправить письмо.';
}
