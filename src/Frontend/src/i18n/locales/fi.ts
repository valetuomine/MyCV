import type { Translation } from "./en"

/** The Finnish UI texts, with the same keys as the English ones. */
export const fi: Translation = {
  meta: {
    title: "MyCV · CV:t verkossa",
    description:
      "MyCV näyttää kehittäjän CV:n sen omassa osoitteessa: titteli, tiivistelmä, sijainti ja profiililinkit.",
    profileTitle: "{{name}} · CV",
    pdfTitle: "{{name}} · CV (PDF)",
  },
  common: {
    tryAgain: "Yritä uudelleen",
    openCv: "Avaa CV",
    backToCv: "Takaisin CV:hen",
    cancel: "Peruuta",
    loading: "Ladataan",
    opensInNewTab: " (avautuu uuteen välilehteen)",
    characters: " merkkiä",
  },
  language: {
    label: "Kieli",
    fi: "FI – Suomeksi",
    en: "EN – In English",
  },
  theme: {
    toLight: "Vaihda vaaleaan teemaan",
    toDark: "Vaihda tummaan teemaan",
  },
  home: {
    heading: "Avaa CV",
    intro:
      "Jokaisella CV:llä on oma linkkinsä. Liitä CV:n linkki tai julkinen osoite nähdäksesi sen.",
    inputLabel: "CV:n linkki tai osoite",
    submit: "Avaa CV",
  },
  notFound: {
    heading: "Sivua ei löytynyt.",
    description:
      "Linkissä voi olla kirjoitusvirhe, tai CV on voinut siirtyä. Tarkista osoite tai avaa CV sen julkisella linkillä.",
  },
  cv: {
    loading: "Ladataan CV:tä…",
    noProfile: "Tällä henkilöllä ei ole vielä profiilia.",
    notFound: "CV:tä ei löytynyt. Tarkista linkki ja yritä uudelleen.",
    unreachable:
      "Palvelimeen ei saada yhteyttä. Tarkista yhteytesi ja yritä uudelleen.",
    failed: "CV:n lataamisessa tapahtui virhe.",
    eyebrow: "Ansioluettelo",
    updated: "Päivitetty {{date}}",
    readMore: "Lue lisää",
    showLess: "Näytä vähemmän",
    copyLink: "Kopioi CV:n linkki",
    viewPdf: "Näytä PDF:nä",
    editProfile: "Muokkaa profiilia",
    portraitOf: "Kuva: {{name}}",
    portrait: "Profiilikuva",
  },
  pdf: {
    eyebrow: "Ansioluettelo · PDF",
    download: "Lataa PDF",
    downloading: "Ladataan…",
    downloadFailed:
      "PDF:n lataus epäonnistui. Tarkista yhteytesi ja yritä uudelleen.",
    openInNewTab: "Avaa uudessa välilehdessä",
    viewerLabel: "{{name}}: CV PDF-muodossa",
    preparing: "PDF valmistuu…",
    preparingHint: "Tämä voi kestää muutaman sekunnin.",
    ready: "PDF on valmis.",
    loadFailed:
      "PDF:ää ei saatu ladattua. Tarkista yhteytesi ja yritä uudelleen.",
    unsupported:
      "Selaimesi ei voi näyttää PDF:ää tässä. Lataa se tai avaa se uudessa välilehdessä.",
  },
  print: {
    profile: "Profiili",
    links: "Linkit",
  },
  copyLink: {
    copied: "Kopioitu",
    copiedStatus: "Linkki kopioitu leikepöydälle.",
    failed: "Linkkiä ei voitu kopioida. Kopioi se näkyvästä osoitteesta.",
  },
  profileForm: {
    editing: "Muokkaus",
    heading: "Muokkaa profiilia",
    cvLink: "CV:si linkki",
    copyLink: "Kopioi linkki",
    discardQuestion: "Hylätäänkö tallentamattomat muutokset?",
    keepEditing: "Jatka muokkausta",
    discard: "Hylkää",
    save: "Tallenna",
    saving: "Tallennetaan…",
    unsavedChanges: "Tallentamattomia muutoksia",
    noChanges: "Ei muutoksia",
    saved: "Profiili tallennettu",
    loadingDetails: "Ladataan profiilin tietoja…",
    missingIdUpdate: "Profiilia ei voi päivittää, koska sen tunniste puuttuu.",
    missingIdEdit: "Profiilia ei voi muokata, koska sen tunniste puuttuu.",
    livePreview: "Esikatselu",
    previewLanguage: "Suomi",
    previewName: "Nimesi",
  },
  profileFields: {
    basicDetails: "Perustiedot",
    fullName: "Koko nimi",
    fullNamePlaceholder: "Maija Virtanen",
    gitHubPlaceholder: "https://github.com/kayttajanimi",
    linkedInPlaceholder: "https://www.linkedin.com/in/kayttajanimi",
    finnish: "Suomi",
    english: "Englanti",
    required: "Pakollinen",
    optional: "Valinnainen",
    titleFi: "Ammattinimike (suomeksi)",
    summaryFi: "Tiivistelmä (suomeksi)",
    locationFi: "Sijainti (suomeksi)",
    titleEn: "Ammattinimike (englanniksi)",
    summaryEn: "Tiivistelmä (englanniksi)",
    locationEn: "Sijainti (englanniksi)",
    titleFiPlaceholder: "Ohjelmistokehittäjä",
    summaryFiPlaceholder: "Lyhyt esittely sinusta ja osaamisestasi",
    locationFiPlaceholder: "Helsinki, Suomi",
    titleEnPlaceholder: "Software developer",
    summaryEnPlaceholder: "A short introduction to you and your skills",
    locationEnPlaceholder: "Helsinki, Finland",
  },
  createProfile: {
    heading: "Luo profiili",
    publicAddress: "Julkinen osoite",
    cvLink: "CV:si linkki",
    cvLinkPreview: "CV:si linkki:",
    cvLinkPlaceholder: "cv-linkkisi",
    submit: "Luo profiili",
    creating: "Luodaan…",
    noPublicUrl:
      "Profiili luotiin, mutta sen julkista osoitetta ei palautettu.",
    signInTitle: "Kirjaudu luodaksesi CV:si",
    signInDescription:
      "Valitse kirjautumistapa. Käytät samaa tapaa myöhemmin, kun muokkaat CV:täsi.",
    signInPending: "Kirjaudutaan profiilin luomista varten",
  },
  profilePicture: {
    heading: "Profiilikuva",
    savedAtOnce: "Tallentuu heti",
    hint: "Kuvan muutokset tallentuvat heti, kun teet ne. Alla olevat Tallenna ja Peruuta eivät koske kuvaa.",
    formats:
      "JPEG, PNG tai WebP, enintään 10 Mt. Puhelimella voit ottaa kuvan tai valita sen galleriasta.",
    current: "Profiilikuvasi",
    none: "Ei vielä kuvaa: CV:ssäsi näkyvät nimikirjaimesi.",
    choose: "Valitse kuva",
    change: "Vaihda kuva",
    useGoogle: "Käytä Google-kuvaa",
    remove: "Poista kuva",
    removeQuestion: "Poistetaanko kuva CV:ltäsi?",
    confirmRemove: "Poista",
    keep: "Säilytä",
    uploading: "Ladataan…",
    fetchingGoogle: "Haetaan…",
    removing: "Poistetaan…",
    saved: "Kuva tallennettu.",
    removed: "Kuva poistettu.",
    actions: {
      upload: "Kuvan lataus",
      google: "Google-kuvan käyttöönotto",
      remove: "Kuvan poisto",
    },
    errors: {
      tooLarge: "Kuva on liian suuri. Valitse enintään 10 Mt:n kuva.",
      unsupportedType:
        "Tätä tiedostoa ei voi käyttää. Valitse JPEG-, PNG- tai WebP-kuva.",
      notAllowed: "Et voi vaihtaa tämän CV:n kuvaa.",
      changedElsewhere:
        "Kuvaa muutettiin samaan aikaan toisaalla. Tarkista kuva ja yritä uudelleen.",
      serviceUnreachable:
        "Kuvan tarvitsema palvelu ei vastannut. Yritä hetken päästä uudelleen.",
      storageNotSetUp:
        "Kuvien tallennusta ei ole vielä otettu käyttöön, joten kuvaa ei voi tallentaa.",
      googleUnavailable: "Google-tililläsi ei ole kuvaa, jota voisi käyttää.",
    },
  },
  formErrors: {
    update: "Profiilin päivitys",
    details: "Profiilin tietojen lataus",
    creation: "Profiilin luonti",
    googleNotInvited:
      "Tällä Google-tilillä ei voi luoda CV:tä. Kirjaudu Microsoft-tilillä tai pyydä kutsu.",
    alreadyHasCv: "Sinulla on jo CV tällä kirjautumisella.",
    invalid:
      "{{action}} epäonnistui. Tarkista, että jokainen kenttä on kelvollinen ja pituusrajan sisällä.",
    unreachable:
      "{{action}} epäonnistui. Palvelimeen ei saada yhteyttä; tarkista yhteytesi ja yritä uudelleen.",
    failed: "{{action}} epäonnistui. Yritä uudelleen.",
  },
  validation: {
    fullNameRequired: "Koko nimi on pakollinen",
    fullNameMax: "Koko nimi voi olla enintään 100 merkkiä",
    titleMax: "Nimike voi olla enintään 100 merkkiä",
    summaryMax: "Tiivistelmä voi olla enintään 2500 merkkiä",
    locationMax: "Sijainti voi olla enintään 100 merkkiä",
    linkMax: "Linkki voi olla enintään 500 merkkiä",
    duplicateTranslation: "Kullakin kielellä voi olla vain yksi käännös",
    titleRequired: "Nimike on pakollinen, kun käännöksellä on sisältöä",
    finnishRequired: "Suomenkielinen käännös on pakollinen",
    finnishTitleRequired: "Suomenkielinen nimike on pakollinen",
    cvLinkRequired: "CV:n linkki on pakollinen",
    cvLinkMax: "CV:n linkki voi olla enintään 100 merkkiä",
    cvLinkFormat:
      "Käytä kirjaimia ja numeroita, jotka on erotettu yksittäisillä yhdysmerkeillä",
    cvLinkReserved: "Tämä CV:n linkki on varattu",
    cvAddressRequired: "Anna CV:n linkki tai julkinen osoite",
  },
  signIn: {
    googleAccount: "Google-tili",
    notConfiguredTitle: "Kirjautumista ei ole otettu käyttöön",
    notConfiguredDescription:
      "Kirjautumista ei ole määritetty tähän ympäristöön.",
    cancelledTitle: "Kirjautuminen peruutettiin",
    failedTitle: "Kirjautuminen ei onnistunut",
    cancelledDescription:
      "Et kirjautunut sisään. Yritä uudelleen, kun olet valmis.",
    failedDescription:
      "{{provider}}-kirjautumista ei saatu valmiiksi. Yritä uudelleen tai palaa myöhemmin.",
    failedDescriptionGeneric:
      "Kirjautumista ei saatu valmiiksi. Yritä uudelleen tai palaa myöhemmin.",
    useAnotherWay: "Käytä toista tapaa",
    popupTitle: "Jatka {{provider}}-ikkunassa",
    popupDescription:
      "Kirjaudu avautuneessa ikkunassa. Tämä sivu jatkaa, kun olet valmis.",
    popupClosedHint: " Suljitko ikkunan? Valitse Peruuta.",
    slow: "Tämä kestää tavallista kauemmin. Sivun lataaminen uudelleen yleensä auttaa.",
    redirecting:
      "Sinut ohjataan {{provider}}-palveluun vahvistamaan henkilöllisyytesi.",
    checking: "Tarkistetaan, oletko jo kirjautunut sisään.",
    reloadPage: "Lataa sivu uudelleen",
    cancelledNote: "Kirjautuminen peruutettiin.",
    microsoftWindowHint:
      " Jos Microsoftin ikkuna on yhä auki, voit sulkea sen.",
    signInWith: "Kirjaudu {{provider}}-tilillä",
    lastUsed: "Viimeksi käytetty",
    finishingTitle: "Viimeistellään kirjautumista",
    finishingDescription: "Palaat takaisin hetken kuluttua.",
    manageTitle: "Kirjaudu hallitsemaan CV:tä <code>{{cv}}</code>",
    manageDescription:
      "Käytä tapaa, jolla loit CV:si, tai tapaa, jonka olet lisännyt sen jälkeen.",
    managePending: "Kirjaudutaan hallitsemaan CV:tä <code>{{cv}}</code>",
  },
  signOut: {
    button: "Kirjaudu ulos",
    label: "Kirjaudu ulos {{provider}}-tililtä",
    signedInAs: "Kirjautuneena ",
    failed: "Uloskirjautuminen ei onnistunut. Yritä uudelleen.",
    title: "Kirjaudutaan ulos",
    idleDescription:
      "Sovellusta ei käytetty 5 minuuttiin, joten sinut kirjataan ulos.",
    userDescription: "Istuntoasi tyhjennetään tältä laitteelta.",
    idleNotice: "Sinut kirjattiin ulos 5 minuutin käyttämättömyyden jälkeen",
    userNotice: "Olet kirjautunut ulos",
  },
  linkCallback: {
    pendingTitle: "Lisätään {{provider}}-kirjautumista",
    pendingDescription: "Palaat CV:hesi hetken kuluttua.",
    sessionExpiredTitle: "Kirjaudu uudelleen lisätäksesi {{provider}}-tilin",
    sessionExpiredDescription:
      "Istuntosi päättyi poissa ollessasi, joten {{provider}}-tiliä ei lisätty. Kirjaudu uudelleen ja lisää se CV:stäsi.",
    notAddedTitle: "{{provider}}-tiliä ei lisätty",
    notAddedDescription: "Avaa CV:si ja lisää kirjautumistapa uudelleen.",
  },
  signInMethods: {
    eyebrow: "Tili",
    heading: "Kirjautumistavat",
    intro:
      "Voit kirjautua hallitsemaan tätä CV:tä millä tahansa näistä. Uuden tavan lisääminen pyytää kirjautumaan sillä, ja nykyinen istuntosi säilyy.",
    loading: "Ladataan kirjautumistapoja",
    loadFailed: "Kirjautumistapojasi ei voitu ladata.",
    linked: "{{provider}}-tili lisätty. Voit nyt kirjautua tähän CV:hen sillä.",
    alreadyLinked: "Tämä {{provider}}-tili oli jo lisätty.",
    linkedElsewhere:
      "Tämä {{provider}}-tili on liitetty toiseen CV:hen, joten sitä ei voi lisätä tähän.",
    sameAccount:
      "Olet nyt kirjautuneena tällä tilillä. Valitse lisättäväksi toinen {{provider}}-tili.",
    cancelled: "{{provider}}-tilin lisääminen peruutettiin.",
    failed:
      "{{provider}}-tiliä ei voitu lisätä. Yritä uudelleen tai palaa myöhemmin.",
    openFailed: "{{provider}}-kirjautumista ei voitu avata. Yritä uudelleen.",
    removed: "Kirjautumistapa poistettu.",
    removeFailed: "Kirjautumistapaa ei voitu poistaa. Yritä uudelleen.",
    addBlocked:
      "Tallenna tai peruuta profiilin muutokset ennen kuin lisäät kirjautumistavan.",
    onlyMethod: "Ainoa kirjautumistapasi",
    currentMethod: "Olet kirjautuneena tällä",
    add: "Lisää {{provider}}",
    adding: "Lisätään {{provider}}…",
    opening: "Avataan {{provider}}…",
    thisSession: "Tämä istunto",
    added: "Lisätty {{date}}",
    lastUsed: "Viimeksi käytetty {{date}}",
    removeQuestion: "Poistetaanko {{provider}}?",
    remove: "Poista",
    removeLabel: "Poista {{provider}}",
    removing: "Poistetaan…",
    keep: "Säilytä",
  },
}
