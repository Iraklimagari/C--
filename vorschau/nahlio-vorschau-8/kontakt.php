<?php
/* ==========================================================================
   NAHLIO — Empfaenger des Kontaktformulars (Vertrag: README > Formular-Anbindung)
   Prueft die Eingaben erneut und schickt sie als Klartext-E-Mail an RECIPIENT.
   Der Empfaenger steht nur hier, nie in der Anfrage oder im HTML.
   Antwort: 200 {"ok":true} | 422 {"ok":false,"errors":{...}} | sonst Fehler.
   Keine Zugangsdaten noetig: PHP mail() des Hostings. Es werden keine Anfragen
   gespeichert; die Sperre je Adresse merkt sich nur eine Pruefsumme und Zeiten.
   ========================================================================== */

const RECIPIENT = 'yakovlev@nahlio.org';
const SENDER = 'yakovlev@nahlio.org';      // Absender: Adresse der eigenen Domain
const SITE = 'nahlio.org';
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

/* E-Mail als Klartext. Der Betreff ist fest, Antworten gehen an den Besucher. */
$label = $PACKAGES[$paket] . ($care ? ' + CARE' : '');
$subject = 'Neue Anfrage ueber ' . SITE . ' - ' . $label;
$body = "Neue Anfrage ueber das Kontaktformular auf " . SITE . "\n\n"
      . "Name:    " . $name . "\n"
      . "Betrieb: " . ($betrieb !== '' ? $betrieb : '-') . "\n"
      . "E-Mail:  " . $email . "\n"
      . "Paket:   " . $PACKAGES[$paket] . "\n"
      . "CARE:    " . ($care ? 'ja' : 'nein') . "\n\n"
      . "Nachricht:\n" . ($nachricht !== '' ? str_replace("\r\n", "\n", $nachricht) : '-') . "\n";

$headers = [
    'From: NAHLIO Website <' . SENDER . '>',
    'Reply-To: ' . $email,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
];
$sent = mail(RECIPIENT, $subject, $body, implode("\r\n", $headers), '-f' . SENDER);

if (!$sent) {
    reply(502, ['ok' => false], 'Die Anfrage konnte gerade nicht gesendet werden. Bitte versuchen Sie es noch einmal oder schreiben Sie uns direkt.');
}
reply(200, ['ok' => true], 'Vielen Dank. Wir melden uns bei Ihnen.');
