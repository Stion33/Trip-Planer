# Boat Trip Planner Pro PWA v3

Αυτή είναι η έκδοση που βασίζεται στο Excel `Σκάφος.xlsx` και πλέον περιλαμβάνει:

- Υπολογισμό ταξιδιού από σκάφος + πορεία.
- Αποθήκευση/επεξεργασία σκαφών.
- Αποθήκευση/επεξεργασία πορειών.
- Tab **Συγκρίσεις**, αντίστοιχο με το φύλλο «Συγκρίσεις» του Excel.
- Tab **Links** με τα χρήσιμα links της πρώτης σελίδας:
  - OpenSeaMap
  - Garmin Marine Maps
  - Windy Waves
- Backup/restore JSON.
- Εξαγωγή CSV και εκτύπωση/PDF.
- PWA αρχεία: `manifest.json`, `sw.js`, `icon.svg`, `icon-192.png`, `icon-512.png`.

Δεν χρησιμοποιεί το φύλλο **Έξοδα Συντήρησης**.

## Τοπική χρήση

Άνοιξε το `index.html` με διπλό κλικ. Θα λειτουργεί κανονικά ως web εφαρμογή, αλλά όχι ως πλήρως εγκαταστάσιμο PWA όταν ανοίγει με `file://`.

## Δοκιμή PWA τοπικά

Από Terminal μέσα στον φάκελο:

```bash
python3 -m http.server 8080
```

Μετά άνοιξε:

```text
http://localhost:8080
```

Σε localhost ο service worker μπορεί να ενεργοποιηθεί για δοκιμή.

## Δημοσίευση ως PWA

Η ευκολότερη λύση είναι Netlify Drop:

1. Κάνε unzip το αρχείο.
2. Μπες στο Netlify Drop.
3. Σύρε ολόκληρο τον φάκελο `boat_trip_app_v3`.
4. Άνοιξε το link που θα δημιουργηθεί.
5. Από Chrome/Edge πάτησε Install app. Σε iPhone: Share → Add to Home Screen.

Εναλλακτικά, μπορείς να το ανεβάσεις σε GitHub Pages.

## Σημαντικό για τα δεδομένα

Η εφαρμογή αποθηκεύει δεδομένα στο localStorage του browser. Κράτα τακτικά backup από το tab **Backup / App**.
