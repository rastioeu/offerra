# offerra.sk — doména, DNS, Cloudflare Tunnel (odpoveď pred Fázou 1)

Odpoveď na bod 1 z tvojej správy. **Ešte som nezačal s prvým míľnikom** —
presne ako si žiadal, čakám na tvoje rozhodnutia nižšie, hlavne na
DÔLEŽITÝ NÁLEZ hneď v úvode, ktorý si podľa mňa nečakal.

## ⚠️ Najprv dôležitý nález: offerra.sk NIE JE prázdna doména

Pozrel som, čo na `offerra.sk` beží PRÁVE TERAZ (verejne, cez DNS a
`curl` — nič som sa nikam neprihlasoval, nemám na to prístup):

**Je tam živý WordPress web**, nie prázdna/parkovacia stránka:

- Titulka: *„Offerra.sk: Zistite reálnu cenu nehnuteľnosti anonymne a bez
  provízie"*
- WordPress 7.1, stránka postavená v Elementore, Yoast SEO plugin,
  Google Site Kit, Facebook Pixel
- Odkazy na `facebook.com/offerra.sk` a `instagram.com/offerra.sk`
- Naposledy upravované (podľa meta údajov stránky) **21.11.2025**
- Beží na Websupport hostingu (cesta v chybovej hláške servera:
  `/data/.../offerra.sk/web/wp-content/...`)

**A je tam aj aktívne nastavená pošta**, nielen web:

- `MX`: `mx10.websupport.sk` (priorita 10), `mx20.websupport.sk`
  (priorita 100)
- SPF TXT záznamy (dva, mierne odlišné formáty — to je existujúci stav,
  nič som nemenil)
- `mail.offerra.sk` a `webmail.offerra.sk` smerujú na Websupport
  webmail server
- `ftp.offerra.sk` a `cpanel.offerra.sk` smerujú na Websupport
  hosting/administráciu

**Toto som nevedel, kým som sa nepozrel, a ty si to vo svojej správe
nespomenul** — buď si na to pri písaní zadania nemyslel, alebo je to
niečo, o čom vieš, ale nepovažoval si to za dôležité spomenúť. V oboch
prípadoch to teraz priamo mení odpoveď na tvoju otázku „ak mám teraz
web, musí ďalej fungovať" — **áno, máš, a je to reálny, udržiavaný web
s vlastnou SEO stránkou a sociálnymi sieťami, nie len technický
placeholder.**

### Čo to znamená pre rozhodnutie

Predtým, než urobím čokoľvek s DNS, potrebujem vedieť, čo s týmto webom:

1. **Nová appka ide na PODDOMÉNU** (napr. `app.offerra.sk` alebo
   `reality.offerra.sk` — vyber si názov), `offerra.sk` a
   `www.offerra.sk` ostávajú WordPressu presne tak, ako sú teraz.
   Najnižšie riziko, nič sa nemení na existujúcom webe ani SEO, ktoré už
   má. Toto by som **odporučil pre prvý míľnik** — ide sa spustiť bez
   toho, aby sa čokoľvek rozhodlo o osude WordPressu.
2. **Nová appka NAHRADÍ `offerra.sk`/`www.offerra.sk` úplne**, WordPress
   sa vypne/presmeruje. Presne to, čo pôvodné zadanie predpokladalo — ale
   teraz vieš, že to znamená zrušiť existujúci web aj jeho SEO históriu
   (ten Facebook/Instagram odkaz naň smeruje tiež).
3. Niečo medzi tým (napr. časom migrovať obsah WordPressu do appky a až
   potom prepnúť apex doménu).

**Toto je tvoje rozhodnutie, nie moje — napíš, ktorú z možností chceš.**
Nižšie píšem DNS postup tak, aby fungoval pre možnosť 1 aj 2 (líši sa len
v tom, či sa existujúci A záznam na WordPress zachová alebo časom zruší).

---

## 1–2. Musia sa presunúť nameservery, alebo stačí CNAME na Websupporte?

**Musia sa presunúť nameservery.** Samotný CNAME na Websupporte na
`<tunnel-id>.cfargotunnel.com` nestačí — Cloudflare Tunnel funguje tak,
že Cloudflare na svojej hrane rozpoznáva a smeruje prevádzku (a vydáva
certifikát) len pre domény, ktoré sú aktívnou zónou v ich systéme, teda
pre ktoré sú nastavené ich nameservery. Cloudflarova vlastná
dokumentácia to explicitne nehovorí jednou vetou (pozeral som), ale ich
popis správania to potvrdzuje nepriamo („`cfargotunnel.com` proxuje
prevádzku len pre DNS záznamy v TOM ISTOM Cloudflare účte") — a hlavne to
**potvrdzuje priamy dôkaz z vášho vlastného servera**:

### Ako je to pri joinfamiglia.com — priamo som to overil

Áno, **je to ten istý prípad**. Pozrel som DNS priamo:

```
$ dig NS joinfamiglia.com
vin.ns.cloudflare.com.
sue.ns.cloudflare.com.
```

`joinfamiglia.com` má nameservery presunuté NA Cloudflare (nie na pôvodnom
registrátorovi) — presne to, čo by som teraz navrhol aj pre `offerra.sk`.
Je to teda overený, už bežiaci vzor na tom istom Hetzner serveri, nie
niečo nové.

---

## Čo sa NEROZBIJE a čo treba dávať pozor — presný postup

**Dobrá správa: presun nameserverov na Cloudflare NEZNAMENÁ presun
webhostingu ani pošty.** Cloudflare sa stane len tým, kto odpovedá na
DNS otázky — samotný WordPress web aj poštové schránky ĎALEJ bežia na
Websupporte presne tak, ako teraz. Stačí v Cloudflare vytvoriť TIE ISTÉ
záznamy, aké má dnes Websupport, a nič sa navonok nezmení. Nižšie je
presný zoznam toho, čo treba 1:1 preniesť (zistil som ich teraz naživo):

| Typ | Meno | Hodnota | Na čo slúži |
|---|---|---|---|
| A | `offerra.sk` (apex) | `37.9.175.195` | WordPress web |
| A | `www.offerra.sk` | `37.9.175.195` | WordPress web (www) |
| A | `mail.offerra.sk` | `45.13.137.6` | webmail/mail server |
| A | `webmail.offerra.sk` | `45.13.137.6` | webmail prístup |
| A | `ftp.offerra.sk` | `37.9.175.196` | FTP prístup k hostingu |
| A | `cpanel.offerra.sk` | `37.9.175.196` | administrácia hostingu |
| MX | `offerra.sk` | `10 mx10.websupport.sk` | doručovanie pošty |
| MX | `offerra.sk` | `100 mx20.websupport.sk` | záložný mail server |
| TXT | `offerra.sk` | `v=spf1 a mx include:_spf.m1.websupport.sk ?all` | SPF (anti-spoofing pre poštu) |
| TXT | `offerra.sk` | `spf2.0/pra a mx include:_sid.m1.websupport.sk ?all` | SPF (starší formát, existuje popri novom) |

**Čo som NEnašiel, ale nemusí to znamenať, že to neexistuje:** DKIM
záznam (skúšal som bežné názvy ako `default._domainkey`,
`selector1._domainkey` a pod. — nič neodpovedalo) a DMARC
(`_dmarc.offerra.sk`) — Websupport môže používať iný, menej bežný názov
selektora, ktorý neviem uhádnuť zvonku. **Toto je jediné miesto, kde ťa
poprosím o krok navyše:** priamo vo Websupport administrácii, v sekcii
DNS záznamov pre `offerra.sk`, over/exportuj VŠETKY aktuálne záznamy (má
to zvyčajne tlačidlo „Export zóny" alebo podobné) — aby sa nič
neprehliadlo, čo som ja zvonku nevidel. Pošli mi ten výpis alebo mi
napíš, čo tam je navyše oproti tabuľke vyššie, a ja to premietnem do
Cloudflare presne.

### Krok po kroku

**Na Cloudflare (urobím ja, keď dáš OK):**
1. Založiť/použiť Cloudflare účet, pridať `offerra.sk` ako novú zónu
   (free plán stačí).
2. Cloudflare pri pridávaní domény sám naskenuje aktuálne DNS záznamy
   a ponúkne ich naimportovať — **neber to ako hotovú vec**, ručne
   porovnám navrhnutý zoznam s tabuľkou vyššie (plus tvojím exportom
   zóny) a doplním, čo chýba.
3. Existujúce záznamy (WordPress, mail, ftp, cpanel) necham nastavené
   ako **„DNS only"** (sivý mrak, nie oranžový) — teda BEZ Cloudflare
   proxy. Dôvod: WordPress web už má vlastné cachovanie
   (`wpo-cache-status` hlavička, WP Rocket alebo podobný plugin) a
   nechcem, aby sa cez Cloudflare menilo správanie webu, ktorý sa
   práve nemá dotknúť.
4. Pridám nový záznam pre appku (napr. `app.offerra.sk`, alebo iný
   názov — napíš mi, ktorý chceš) cez `cloudflared tunnel route dns` —
   ten vytvorí CNAME na tunel, automaticky PROXOVANÝ (oranžový mrak,
   to tam musí byť, inak tunel nefunguje).
5. Cloudflare mi ukáže presné 2 nameservery pre váš účet (bude to
   dvojica podobná `vin.ns.cloudflare.com` / `sue.ns.cloudflare.com`,
   aké má joinfamiglia.com — presné mená dostanem až pri zakladaní
   zóny).

**Na Websupporte (toto urobíš ty — presne ako si povedal, jediná vec,
čo robíš sám):**
6. Prihlásiť sa do klientskej zóny Websupport → Domény → `offerra.sk` →
   nastavenie nameserverov (DNS).
7. Nahradiť terajšie tri (`ns1.websupport.sk`, `ns2.websupport.sk`,
   `ns3.websupport.sk`) dvomi, ktoré dostaneš odo mňa z Cloudflare.
8. Uložiť.

**Po zmene (over ideš, kým čokoľvek vypneme na starej strane):**
9. Počkať na prejavenie zmeny (zvyčajne minúty až pár hodín, pri
   doménach `.sk` niekedy dlhšie kvôli TTL — počas prechodu môžu rôzni
   návštevníci krátko vidieť starú aj novú odpoveď, čo je v poriadku,
   lebo záznamy budú rovnaké).
10. Overiť `dig NS offerra.sk` ukazuje Cloudflare nameservery.
11. Overiť `https://offerra.sk` a `https://www.offerra.sk` stále
    ukazujú ten istý WordPress web ako dnes.
12. **Poslať a prijať jeden testovací e-mail** na adresu na
    `@offerra.sk`, aby sme mali istotu, že pošta naďalej chodí — toto
    over ty, ja k tej schránke nemám prístup.
13. Až potom pridám/aktivujem tunelový záznam appky.

Nič sa nezruší na Websupport strane (hosting, mailboxy) — mení sa len
to, KTO odpovedá na DNS otázky pre `offerra.sk`.

---

## Zhrnutie — čo potrebujem od teba, aby som mohol pokračovať

1. **Čo s existujúcim WordPress webom** (možnosť 1/2/3 v úvode) — toto
   je nový nález, na ktorý si sa v zadaní nepýtal, lebo si o ňom
   asi nevedel.
2. Ak ide appka na poddoménu (odporúčam) — **aký názov** (`app.`,
   `reality.`, iný?).
3. Export DNS zóny z Websupportu (alebo potvrdenie, že tabuľka vyššie
   je kompletná) — kvôli DKIM/DMARC, ktoré som zvonku nevedel nájsť.
4. Tvoje **OK na presun nameserverov** — je to zásah do živej domény
   s poštou, urobím ho až po tvojom výslovnom súhlase, nie
   automaticky.

Keď toto potvrdíš, napíšem presný postup pre Fázu 1 (verejný katalóg +
detail) a začnem.
