## RyhäMonoposto - kotisivu

Rakennetaan täysi sarjasivusto: musta tausta, punaiset yksityiskohdat, Formula1-Bold otsikkofontti, käyttäen lataamaasi logoa.

### Sivut (TanStack Start reitit)
- `/` — Kotisivu: RyhäMonoposto-logo + 5 pikanäppäintä (Kilpailut, Kuljettajat, Tiimit, Uutiset, Tilastot)
- `/kilpailut` + `/kilpailut/$id` (swipe/tab: Aika-ajo ↔ Kisa)
- `/kuljettajat` + `/kuljettajat/$slug` (gradient-tausta: musta → tiimin brändiväri)
- `/tiimit` + `/tiimit/$slug`
- `/uutiset` + `/uutiset/$id`
- `/tilastot` (välilehdet: Kuljettajat / Valmistajat)
- `/asetukset` — "Enter admin password" + Google-kirjautuminen

### Admin
- Salasana `knnwloeirlsikbeb` avaa admin-tilan (server-puolella timing-safe compare, salattu sessio-cookie)
- Adminina näkyy "Muokkaa"/"Lisää"/"Poista"-toiminnot jokaisella sivulla
- Adminit voivat: lisätä/muokata/poistaa kilpailuja, kuljettajien ja tiimien profiilisisältöä, uutisia, tilastoja, ladata kuvia ja tiedostoja
- Adminit voivat poistaa minkä tahansa kommentin tai käyttäjäprofiilin

### Kommentit + Google-kirjautuminen
- Vierailijat: näkevät kaiken (myös kommentit), eivät voi kommentoida
- Google-kirjautuneet: voivat kommentoida uutisia, kisoja, kuljettaja-/tiimiprofiileja, tilastoja
- Kommentit polymorfisella `entity_type` + `entity_id` -mallilla

### Nimien tunnistus tekstistä (avainsanat → linkit)
- Kaikki tekstisisällöt (uutiset, kisakuvaukset, tilastojen selosteet, profiilit) renderöidään komponentin läpi, joka skannaa tekstin kuljettajien ja tiimien nimien varalta ja tekee niistä klikattavia linkkejä
- Klikkaus vie oikean kuljettajan tai tiimin profiiliin
- **Huom kuvista**: PDF/kuvien sisältä ei voi tunnistaa nimiä ilman OCR:ää. Jokaiselle ladatulle tiedostolle admin voi lisätä "kuvatekstin" / seliterivin — sovellus tunnistaa nimet siitä ja rivi renderöidään kuvan alle klikattavilla nimillä. (Sano jos haluat OCR:n; se on erillinen lisäys.)

### Tietokanta (Lovable Cloud)
- `races` (nimi, maakoodi/emoji, päivämäärä, järjestys)
- `race_sessions` (race_id, tyyppi: qualifying|race, teksti, mediat)
- `drivers` (slug, nimi, lippu, numero, väri-avain, sisältölohkot JSON)
- `teams` (slug, nimi, lippu, väri-avain, sisältölohkot JSON)
- `news` (otsikko, teksti, mediat, julkaisuaika)
- `driver_stats`, `team_stats` (sisältölohkot + mediat)
- `media` (attachment: bucket key, caption)
- `comments` (entity_type, entity_id, user_id, teksti)
- `profiles` (user_id, display_name, avatar_url)
- `user_roles` (user_id, role: admin) — turvallinen roolimalli
- Storage-bucket `media` kuvatiedostoille

### Seed
- Kaikki 23 kuljettajaa ja 11 tiimiä esilisätty tietokantaan (nimi, lippu, numero, väri) tyhjillä sisältölohkoilla — täytät itse admin-tilassa

### Tekniset huomiot
- Musta perusteema, punainen (`oklch` ~ #ff2a2a) korostusväri; rajat ja viivat punaisia; kortit tummia
- Formula1-Bold ladataan otsikkofontiksi (Rajdhani/Inter body-tekstissä)
- Google-kirjautuminen Lovable Cloudin kautta (huom: käyttäjän täytyy kertoa jos haluaa myös sähköposti/salasana-vaihtoehdon — oletuksena vain Google)
- Google-kirjautumista varten Google-provideri pitää konfiguroida Lovable Cloudissa; teen sen samassa buildissa

Vahvista niin aloitan rakentamisen.
