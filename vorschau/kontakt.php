<?php
/* ==========================================================================
   NAHLIO — Empfaenger des Kontaktformulars (Vertrag: README > Formular-Anbindung)
   Prueft die Eingaben erneut und schickt sie als Klartext-E-Mail an RECIPIENT.
   Der Empfaenger steht nur hier, nie in der Anfrage oder im HTML.
   Antwort: 200 {"ok":true} | 422 {"ok":false,"errors":{...}} | sonst Fehler.
   Versand ueber das Postfach (SMTP); das Passwort liegt nur auf dem Server in
   nahlio-mail.php oberhalb von public_html. Ohne Passwort: PHP mail() des Hostings.
   Es werden keine Anfragen gespeichert; die Sperre je Adresse merkt sich nur
   eine Pruefsumme und Zeiten.
   ========================================================================== */

ini_set('display_errors', '0');            // Warnungen duerfen die JSON-Antwort nie stoeren

const RECIPIENT = 'yakovlev@nahlio.org';
const SENDER = 'yakovlev@nahlio.org';      // Absender: das Postfach selbst
const SITE = 'nahlio.org';
const SMTP_HOST = 'smtp.hostinger.com';
const SMTP_PORT = 465;
const LIMIT_COUNT = 5;                     // hoechstens so viele Anfragen ...
const LIMIT_WINDOW = 600;                  // ... je Adresse in dieser Zeit (Sekunden)

$PACKAGES = ['refresh' => 'REFRESH', 'digital' => 'DIGITAL', 'unsure' => 'Noch nicht sicher'];

header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store');

$wantsJson = strpos($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json') !== false;

/* Mit Skript: JSON. Ohne Skript (normales Absenden): kurze Seite mit Weg zurueck. */
function reply(int $status, array $json, string $text): void
{
    global $wantsJson;
    http_response_code($status);
    if ($wantsJson) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($json, JSON_UNESCAPED_UNICODE);
    } else {
        header('Content-Type: text/html; charset=utf-8');
        echo '<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
           . '<title>NAHLIO</title><p style="font:18px/1.5 system-ui,sans-serif;margin:3rem auto;max-width:34rem;padding:0 1rem">'
           . htmlspecialchars($text, ENT_QUOTES, 'UTF-8')
           . '<br><br><a href="index.html#kontakt">Zur&uuml;ck zur Seite</a></p></html>';
    }
    exit;
}

function field(string $name): string
{
    $v = $_POST[$name] ?? '';
    return is_string($v) ? trim($v) : '';
}

function length(string $v): int
{
    return function_exists('mb_strlen') ? mb_strlen($v, 'UTF-8') : strlen($v);
}

/* Nur ein einzelne Zeile: keine Steuerzeichen (auch kein Zeilenumbruch) */
function oneLine(string $v): string
{
    return trim(preg_replace('/[\x00-\x1F\x7F]+/u', ' ', $v) ?? '');
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    reply(405, ['ok' => false], 'Diese Adresse nimmt nur Anfragen aus dem Formular an.');
}

/* Honigtopf: ausgefuellt = Bot. Nichts zustellen, aber normal antworten. */
if (field('website') !== '') {
    reply(200, ['ok' => true], 'Vielen Dank. Wir melden uns bei Ihnen.');
}

/* Eingaben erneut pruefen (der Browser allein reicht nicht) */
$name = oneLine(field('name'));
$betrieb = oneLine(field('betrieb'));
$email = field('email');
$nachricht = field('nachricht');
$paket = field('paket');
$care = field('care') === 'true' || field('care') === 'on';

$errors = [];
if ($name === '' || length($name) > 100) {
    $errors['name'] = 'invalid';
}
if ($email === '' || strlen($email) > 254 || preg_match('/[\r\n]/', $email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors['email'] = $email === '' ? 'required' : 'invalid';
}
if (field('einwilligung') === '') {
    $errors['einwilligung'] = 'required';
}
if ($errors) {
    reply(422, ['ok' => false, 'errors' => $errors], 'Bitte pruefen Sie Ihre Angaben: Name, E-Mail-Adresse und Einwilligung sind Pflicht.');
}
if (length($betrieb) > 120 || length($nachricht) > 3000) {
    reply(413, ['ok' => false], 'Die Eingabe ist zu lang.');
}
if (!isset($PACKAGES[$paket])) {
    $paket = 'unsure';
}

/* Missbrauchsschutz: wenige Anfragen je Adresse (nur Pruefsumme und Zeiten, keine Inhalte) */
$store = rtrim(sys_get_temp_dir(), '/\\') . '/nahlio-form-' . sha1(($_SERVER['REMOTE_ADDR'] ?? '') . SITE);
$now = time();
$times = [];
if (is_readable($store)) {
    $times = array_filter(array_map('intval', explode(',', (string) file_get_contents($store))), function ($t) use ($now) {
        return $t > $now - LIMIT_WINDOW;
    });
}
if (count($times) >= LIMIT_COUNT) {
    reply(429, ['ok' => false], 'Zu viele Anfragen in kurzer Zeit. Bitte versuchen Sie es spaeter noch einmal.');
}
$times[] = $now;
@file_put_contents($store, implode(',', $times), LOCK_EX);

/* Passwort des Postfachs: nur in nahlio-mail.php auf dem Server (oberhalb von public_html), nie im Projekt. */
function mailPassword(): string
{
    $dir = __DIR__;
    for ($i = 0; $i < 3; $i++) {
        $file = $dir . '/nahlio-mail.php';
        if (@is_readable($file)) {
            $config = include $file;
            $password = is_array($config) ? (string) ($config['password'] ?? '') : '';
            return $password === 'HIER_PASSWORT_EINTRAGEN' ? '' : $password;
        }
        $dir = dirname($dir);
    }
    return '';
}

/* Versand ueber das Postfach (SMTP mit Anmeldung): So kommt die Mail wirklich von der eigenen Domain. */
function smtpSend(string $password, string $data): bool
{
    $smtp = @stream_socket_client('ssl://' . SMTP_HOST . ':' . SMTP_PORT, $errno, $errstr, 12);
    if (!$smtp) {
        return false;
    }
    stream_set_timeout($smtp, 12);
    $read = function () use ($smtp): int {
        $code = 0;
        while (($line = fgets($smtp, 1024)) !== false) {
            $code = (int) substr($line, 0, 3);
            if (strlen($line) < 4 || $line[3] === ' ') {
                break;                              /* letzte Zeile der Antwort */
            }
        }
        return $code;
    };
    $cmd = function (string $text, int $want) use ($smtp, $read): bool {
        fwrite($smtp, $text . "\r\n");
        return $read() === $want;
    };
    $ok = $read() === 220
        && $cmd('EHLO ' . SITE, 250)
        && $cmd('AUTH LOGIN', 334)
        && $cmd(base64_encode(SENDER), 334)
        && $cmd(base64_encode($password), 235)
        && $cmd('MAIL FROM:<' . SENDER . '>', 250)
        && $cmd('RCPT TO:<' . RECIPIENT . '>', 250)
        && $cmd('DATA', 354)
        && $cmd(rtrim($data) . "\r\n.", 250);
    @fwrite($smtp, "QUIT\r\n");
    fclose($smtp);
    return $ok;
}

/* E-Mail als Klartext (UTF-8, Base64: Umlaute und lange Zeilen sicher). Antworten gehen an den Besucher. */
$label = $PACKAGES[$paket] . ($care ? ' + CARE' : '');
$subject = '=?UTF-8?B?' . base64_encode('Neue Anfrage über ' . SITE . ' – ' . $label) . '?=';
$body = "Neue Anfrage über das Kontaktformular auf " . SITE . "\r\n\r\n"
      . "Name:    " . $name . "\r\n"
      . "Betrieb: " . ($betrieb !== '' ? $betrieb : '-') . "\r\n"
      . "E-Mail:  " . $email . "\r\n"
      . "Paket:   " . $PACKAGES[$paket] . "\r\n"
      . "CARE:    " . ($care ? 'ja' : 'nein') . "\r\n\r\n"
      . "Nachricht:\r\n" . ($nachricht !== '' ? preg_replace('/\r\n|\r|\n/', "\r\n", $nachricht) : '-') . "\r\n";
$encoded = chunk_split(base64_encode($body));

$headers = [
    'From: NAHLIO Website <' . SENDER . '>',
    'Reply-To: ' . $email,
    'Date: ' . date('r'),
    'Message-ID: <' . bin2hex(random_bytes(12)) . '@' . SITE . '>',
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
];

/* Erst ueber das Postfach; klappt das nicht (kein oder falsches Passwort, keine Verbindung), geht die Anfrage ueber
   mail() des Hostings raus. Die landet zwar eher im Spam, aber es geht keine Kundenanfrage verloren. */
$sent = false;
$password = mailPassword();
if ($password !== '') {
    $sent = smtpSend($password, implode("\r\n", array_merge(['To: ' . RECIPIENT, 'Subject: ' . $subject], $headers)) . "\r\n\r\n" . $encoded);
    if (!$sent) {
        error_log('kontakt.php: Versand ueber das Postfach fehlgeschlagen, Ersatz mail()');
    }
}
if (!$sent) {
    $sent = mail(RECIPIENT, $subject, $encoded, implode("\r\n", $headers), '-f' . SENDER);
}

if (!$sent) {
    reply(502, ['ok' => false], 'Die Anfrage konnte gerade nicht gesendet werden. Bitte versuchen Sie es noch einmal oder schreiben Sie uns direkt.');
}
reply(200, ['ok' => true], 'Vielen Dank. Wir melden uns bei Ihnen.');
