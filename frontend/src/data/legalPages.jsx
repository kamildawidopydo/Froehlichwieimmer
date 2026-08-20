import React from 'react';
import {
  AlertTriangle,
  Building2,
  ExternalLink,
  FileText,
  Globe,
  Landmark,
  Mail,
  MapPin,
  Scale,
  Shield,
  ShieldAlert,
  Undo2,
  Users,
} from 'lucide-react';
import {
  LegalClause,
  LegalFormTemplate,
  LegalInfoCard,
  LegalNotice,
  LegalRightsGrid,
  LegalSection,
  LegalStepList,
} from '@/components/legal/LegalBlocks';
import siteContact from '@/data/siteContact';

const COMPANY = {
  name: 'Fröhlich Vermögensberatung GmbH',
  street: 'Bösgrunder Weg 62',
  city: '55543 Bad Kreuznach',
  country: 'Deutschland',
  hrb: 'HRB 23436',
  registerCourt: 'Amtsgericht Bad Kreuznach',
  // TODO(Fröhlich Vermögensberatung): USt-IdNr. ergänzen, sobald erteilt.
  vatId: null,
  managingDirector: 'Manfred Franz Fröhlich',
  // TODO(Fröhlich Vermögensberatung): finale Produktiv-Domain bestätigen.
  website: 'froehlich-vermoegensberatung.de',
  websiteHref: '#',
};

const impressumBody = (
  <div className="space-y-12">
    <p className="text-[15px] leading-relaxed text-bank-text-muted">
      Angaben gemäß § 5 TMG sowie gemäß Dienstleistungs-Informationspflichten-Verordnung (DL-InfoV)
    </p>

    <div className="grid gap-12 lg:grid-cols-2 lg:gap-10">
      <LegalSection id="verantwortlich" icon={Building2} title="Verantwortlich für den Inhalt">
        <LegalInfoCard icon={MapPin} title={COMPANY.name}>
          {COMPANY.street}
          <br />
          {COMPANY.city}
          <br />
          {COMPANY.country}
          <br />
          <br />
          Telefon:{' '}
          <a href={`tel:${siteContact.phoneTel}`}>{siteContact.phoneDisplay}</a>
          <br />
          E-Mail: <a href={`mailto:${siteContact.email}`}>{siteContact.email}</a>
          <br />
          Website:{' '}
          <a href={COMPANY.websiteHref} target="_blank" rel="noopener noreferrer">
            {COMPANY.website}
          </a>
          <br />
          <br />
          Handelsregister: {COMPANY.registerCourt}, {COMPANY.hrb}
          <br />
          {/* TODO(Fröhlich Vermögensberatung): USt-IdNr. gemäß § 27a UStG hier ergänzen, sobald erteilt. */}
          USt-IdNr.: <span className="italic text-bank-text-muted/80">wird ergänzt</span>
        </LegalInfoCard>
      </LegalSection>

      <LegalSection id="geschaeftsfuehrer" icon={Users} title="Geschäftsführer">
        <p>{COMPANY.managingDirector}</p>
      </LegalSection>
    </div>

    <LegalSection id="aufsicht" icon={Landmark} title="Zuständige Aufsichtsbehörde">
      <LegalNotice variant="neutral">
        {/*
          TODO(Fröhlich Vermögensberatung): Konkrete Aufsichtsbehörde (z. B. BaFin nach § 32 KWG,
          IHK nach § 34f/§ 34c GewO) sowie Registrierungs-/Vermittlernummer einsetzen.
          Ohne bestätigten Zulassungsstatus bewusst offen gelassen — nicht raten.
        */}
        <p>
          Angaben zur zuständigen Aufsichtsbehörde sowie zur Registrierung nach § 34c bzw. § 34f GewO oder nach dem KWG
          werden nach Vorliegen der finalen Zulassungsbescheide an dieser Stelle ergänzt.
        </p>
      </LegalNotice>
    </LegalSection>

    <LegalSection id="berufsrecht" icon={FileText} title="Berufsrechtliche Angaben">
      <LegalNotice variant="neutral">
        {/*
          TODO(Fröhlich Vermögensberatung): Berufsbezeichnung, Kammer, Verleihungsstaat und
          maßgebliche berufsrechtliche Regelungen (z. B. FinVermV) nach Zulassung eintragen.
        */}
        <p>
          Berufsbezeichnung, verleihender Staat und die maßgeblichen berufsrechtlichen Regelungen werden ergänzt,
          sobald die entsprechenden Bescheide vorliegen.
        </p>
      </LegalNotice>
    </LegalSection>

    <LegalSection id="streitbeilegung" icon={Scale} title="Verbraucherstreitbeilegung / Online-Streitbeilegung">
      <p>
        Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{' '}
        <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer">
          https://ec.europa.eu/consumers/odr
        </a>
      </p>
      <p>Unsere E-Mail-Adresse finden Sie oben im Impressum.</p>
      <LegalNotice variant="neutral">
        Wir sind nicht verpflichtet und nicht bereit, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle
        teilzunehmen.
      </LegalNotice>
    </LegalSection>

    <LegalSection id="geltungsbereich" icon={Globe} title="Geltungsbereich">
      <p>
        Dieses Impressum gilt für die Website {COMPANY.website} sowie für damit verbundene elektronische
        Kommunikationswege der {COMPANY.name}, soweit gesetzlich vorgeschrieben.
      </p>
    </LegalSection>

    <LegalSection id="aenderungen" icon={FileText} title="Änderungsvorbehalt">
      <p>
        Die {COMPANY.name} behält sich vor, dieses Impressum jederzeit anzupassen. Die jeweils aktuelle Fassung ist auf{' '}
        {COMPANY.website} abrufbar.
      </p>
    </LegalSection>
  </div>
);

const privacyBody = (
  <div className="space-y-12">
    <LegalNotice variant="info" icon={Shield} title="Ihre Daten, unsere Verantwortung">
      Wir verarbeiten personenbezogene Daten nur im erforderlichen Umfang — transparent, zweckgebunden und gemäß DSGVO.
    </LegalNotice>

    <LegalSection id="verantwortlicher" icon={Building2} badge="§ 1" title="Name und Kontaktdaten des Verantwortlichen">
      <p>Verantwortlicher im Sinne der DSGVO sowie sonstiger datenschutzrechtlicher Vorschriften ist:</p>
      <LegalInfoCard icon={Building2} title={COMPANY.name}>
        {COMPANY.street}
        <br />
        {COMPANY.city}
        <br />
        {COMPANY.country}
        <br />
        <br />
        <a href={`tel:${siteContact.phoneTel}`}>{siteContact.phoneDisplay}</a>
        <br />
        <a href={`mailto:${siteContact.email}`}>{siteContact.email}</a>
        <br />
        <a href={COMPANY.websiteHref} target="_blank" rel="noopener noreferrer">
          {COMPANY.website}
        </a>
      </LegalInfoCard>
    </LegalSection>

    <LegalSection id="dsb" icon={Users} badge="§ 2" title="Kontaktdaten des Datenschutzbeauftragten">
      <LegalNotice variant="neutral">
        Ein betrieblicher Datenschutzbeauftragter wurde nicht benannt, da dies gemäß Art. 37 DSGVO nicht erforderlich
        ist. Für datenschutzrechtliche Anliegen wenden Sie sich bitte an die oben genannte Kontaktadresse.
      </LegalNotice>
    </LegalSection>

    <LegalSection id="erhebung" icon={FileText} badge="§ 3" title="Erhebung und Verwendung personenbezogener Daten">
      <div className="space-y-6">
        <div className="rounded-xl border border-bank-border bg-white p-5 shadow-editorial-sm dark:bg-bank-surface">
          <h3 className="font-display text-[1.02rem] font-medium text-bank-text">a) Bei Kontaktaufnahme</h3>
          <p className="mt-3 text-[14px] leading-relaxed text-bank-text-muted">
            Wenn Sie uns kontaktieren, erheben wir die von Ihnen übermittelten personenbezogenen Daten (z. B. Name,
            E-Mail-Adresse, Telefonnummer, Inhalt Ihrer Nachricht).
          </p>
          <p className="mt-3 text-[14px] leading-relaxed text-bank-text-muted">
            <strong className="text-bank-text">Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. f DSGVO (berechtigtes
            Interesse) bzw. Art. 6 Abs. 1 lit. b DSGVO (vorvertragliche Maßnahmen oder Vertragserfüllung).
          </p>
        </div>
        <div className="rounded-xl border border-bank-border bg-white p-5 shadow-editorial-sm dark:bg-bank-surface">
          <h3 className="font-display text-[1.02rem] font-medium text-bank-text">b) Keine weitere Datenerhebung</h3>
          <p className="mt-3 text-[14px] leading-relaxed text-bank-text-muted">
            Es besteht keine Registrierungsfunktion, kein Nutzerkonto und kein Newsletter-Versand. Ebenso werden keine
            Cookies zu Statistik- oder Marketingzwecken sowie keine Analysetools eingesetzt.
          </p>
        </div>
      </div>
    </LegalSection>

    <LegalSection id="speicherung" icon={FileText} badge="§ 4" title="Dauer der Speicherung">
      <p>
        Personenbezogene Daten werden nur für den Zeitraum gespeichert, der zur Erfüllung des jeweiligen
        Verarbeitungszwecks erforderlich ist oder in dem gesetzliche Aufbewahrungspflichten bestehen. Anschließend
        werden die Daten gelöscht oder anonymisiert.
      </p>
    </LegalSection>

    <LegalSection id="rechte" icon={Shield} badge="§ 5" title="Ihre Rechte (Art. 15–22 DSGVO)">
      <p>Sie haben jederzeit das Recht auf:</p>
      <LegalRightsGrid
        items={[
          'Auskunft über Ihre gespeicherten Daten',
          'Berichtigung unrichtiger Daten',
          'Löschung (sofern keine Aufbewahrungspflicht besteht)',
          'Einschränkung der Verarbeitung',
          'Datenübertragbarkeit',
          'Widerspruch gegen die Verarbeitung',
          'Widerruf erteilter Einwilligungen',
        ]}
      />
      <p className="mt-4">
        Zur Ausübung Ihrer Rechte kontaktieren Sie uns bitte unter der oben genannten Adresse oder E-Mail.
      </p>
    </LegalSection>

    <LegalSection id="drittland" icon={Globe} badge="§ 6" title="Datenübermittlung in Drittländer">
      <LegalNotice variant="info" icon={Globe}>
        Es findet keine Übermittlung personenbezogener Daten in Drittländer (außerhalb der EU/EWR) statt.
      </LegalNotice>
    </LegalSection>

    <LegalSection id="sicherheit" icon={ShieldAlert} badge="§ 7" title="Sicherheit">
      <p>
        Wir treffen technische und organisatorische Maßnahmen zum Schutz Ihrer Daten (z. B. Zugriffsbeschränkungen).
        Bei E-Mail-Kommunikation kann jedoch keine absolute Sicherheit gewährleistet werden — wir empfehlen bei
        sensiblen Inhalten den Postweg.
      </p>
    </LegalSection>

    <LegalSection id="aenderungen" icon={FileText} badge="§ 8" title="Änderungen dieser Datenschutzerklärung">
      <p>
        Wir passen diese Erklärung bei Bedarf an gesetzliche oder betriebliche Änderungen an. Die aktuelle Version
        finden Sie stets an dieser Stelle.
      </p>
    </LegalSection>
  </div>
);

const termsBody = (
  <div className="space-y-6">
    <LegalNotice variant="info" icon={FileText} title="Präambel">
      <p>
        Die Fröhlich Vermögensberatung GmbH verwaltet ausschließlich eigenes Vermögen. Darüber hinaus werden Dienstleistungen für
        Dritte erbracht, Plattformen betrieben und Verträge mit Kunden abgeschlossen.
      </p>
      <p className="mt-2">
        Unsere Arbeit basiert auf klaren Strukturen, gesetzlicher Konformität und einem konsequenten Fokus auf
        Transparenz, Verlässlichkeit und nachhaltigen Werterhalt.
      </p>
    </LegalNotice>

    <LegalClause id="geltungsbereich" number="§ 1" title="Geltungsbereich">
      <p>
        (1) Diese AGB regeln alle Rechtsbeziehungen zwischen der Fröhlich Vermögensberatung GmbH und Dritten, soweit nicht abweichende
        individuelle Vereinbarungen getroffen werden.
      </p>
      <p>
        (2) Abweichende Bedingungen des Vertragspartners gelten nicht, auch wenn wir ihnen nicht ausdrücklich
        widersprechen.
      </p>
      <p>
        (3) Die Gesellschaft richtet sich an natürliche und juristische Personen, die Dienstleistungen in Anspruch
        nehmen.
      </p>
    </LegalClause>

    <LegalClause id="leistungen" number="§ 2" title="Leistungen">
      <p>(1) Die Fröhlich Vermögensberatung GmbH erbringt Dienstleistungen für Dritte und betreibt Plattformen.</p>
      <p>
        (2) Es werden Verträge mit Kunden abgeschlossen. Die genaue Leistungsbeschreibung ergibt sich aus dem
        jeweiligen Vertrag oder der jeweiligen Leistungsvereinbarung.
      </p>
      <p>
        (3) Die Gesellschaft kann ihren Kunden eine zentrale Verwaltungs- und Serviceplattform zur Verfügung stellen,
        über die verschiedene Kapitalanlagen, Bankverbindungen und Vermögenswerte eingesehen, verwaltet und organisiert
        werden können.
      </p>
      <p>
        (4) Kunden haben die Möglichkeit, über die Plattform unterschiedliche Anlageprodukte und Finanzlösungen zentral
        zu verwalten. Die Nutzung der Plattform dient der Übersicht, Organisation und Verwaltung bestehender und
        zukünftiger Vertragsbeziehungen zu Partnerbanken und sonstigen Finanzdienstleistern.
      </p>
      <p>
        (5) Soweit Kunden Tagesgeld-, Festgeld-, Flexgeld-, Depot- oder vergleichbare Anlageprodukte nutzen, erfolgen
        die Kontoeröffnung, Kontoführung, Depotführung, Verwahrung von Geldern oder Vermögenswerten sowie sämtliche
        Bankgeschäfte ausschließlich durch die jeweilige Partnerbank oder den jeweiligen Produktanbieter.
      </p>
      <p>
        (6) Sämtliche Kundengelder und Vermögenswerte werden ausschließlich auf den jeweiligen Kundenkonten oder
        Kundendepots bei den entsprechenden Partnerbanken oder Produktanbietern geführt. Die Fröhlich Vermögensberatung GmbH nimmt
        keine Kundengelder entgegen, verwahrt keine Kundengelder und führt keine eigenen Kundenkonten oder
        Kundendepots, soweit dies nicht ausdrücklich gesetzlich zulässig und vertraglich vereinbart ist.
      </p>
      <p>
        (7) Die Gesellschaft kann im Rahmen bestehender Vereinbarungen, Rahmenverträge, Kontingente oder Kooperationen
        mit Partnerbanken und Produktanbietern ausgewählte Produkte, Konditionen oder Dienstleistungen bereitstellen.
        Ein Anspruch auf bestimmte Produkte, Zinssätze, Konditionen, Kontingente oder Verfügbarkeiten besteht nicht,
        sofern dies nicht ausdrücklich schriftlich vereinbart wurde.
      </p>
      <p>
        (8) Entscheidungen über die Eröffnung, Führung, Einschränkung oder Beendigung von Konten, Depots oder
        sonstigen Finanzprodukten obliegen ausschließlich der jeweiligen Partnerbank oder dem jeweiligen Anbieter.
      </p>
      <p>(9) Soweit gesetzlich zulässig, können Leistungen auch regulierte Tätigkeiten umfassen.</p>
    </LegalClause>

    <LegalClause id="haftung" number="§ 3" title="Haftung und Gewährleistung">
      <p>(1) Die Gesellschaft haftet nur für Vorsatz und grobe Fahrlässigkeit.</p>
      <p>
        (2) Für leichte Fahrlässigkeit haftet die Gesellschaft nur bei Verletzung vertragswesentlicher Pflichten
        (Kardinalpflichten). In diesem Fall ist die Haftung auf den typischerweise vorhersehbaren Schaden beschränkt.
      </p>
      <p>
        (3) Die Haftung nach dem Produkthaftungsgesetz sowie für Schäden aus der Verletzung des Lebens, des Körpers
        oder der Gesundheit bleibt unberührt.
      </p>
      <p>
        (4) Jegliche Gewährleistung oder Zusicherung für die Richtigkeit, Vollständigkeit oder Aktualität von
        Informationen wird ausgeschlossen, soweit gesetzlich zulässig.
      </p>
      <p>
        (5) Für Leistungen, Produkte, Zinssätze, Einlagensicherungssysteme, Kontoführung, Depotführung, Verwahrung von
        Vermögenswerten, Zahlungsverkehr, Transaktionen oder sonstige Leistungen der jeweiligen Partnerbanken oder
        Produktanbieter haftet ausschließlich der jeweilige Anbieter im Rahmen seiner gesetzlichen und vertraglichen
        Verpflichtungen. Die Fröhlich Vermögensberatung GmbH übernimmt hierfür keine Gewähr oder Haftung, soweit gesetzlich
        zulässig.
      </p>
      <p>
        (6) Die Gesellschaft übernimmt keine Garantie für die Verfügbarkeit bestimmter Produkte, Konditionen,
        Zinssätze, Renditen oder sonstiger wirtschaftlicher Ergebnisse.
      </p>
    </LegalClause>

    <LegalClause id="eigentum" number="§ 4" title="Geistiges Eigentum">
      <p>
        Alle Inhalte (Texte, Grafiken, Logos, Plattform-Elemente), die öffentlich zugänglich gemacht werden, sind
        urheberrechtlich geschützt. Jegliche Nutzung, Vervielfältigung oder Verbreitung bedarf unserer vorherigen
        schriftlichen Zustimmung.
      </p>
    </LegalClause>

    <LegalClause id="datenschutz" number="§ 5" title="Datenschutz">
      <p>
        Die Verarbeitung personenbezogener Daten erfolgt ausschließlich gemäß der jeweils gültigen Datenschutzerklärung
        der Gesellschaft sowie den anwendbaren datenschutzrechtlichen Bestimmungen, insbesondere der
        Datenschutz-Grundverordnung (DSGVO) und des Bundesdatenschutzgesetzes (BDSG).
      </p>
    </LegalClause>

    <LegalClause id="widerruf" number="§ 6" title="Widerrufsrecht">
      <p>
        Soweit Verbraucherverträge oder Fernabsatzverträge vorliegen, gelten die gesetzlichen Widerrufsregelungen
        gemäß §§ 355 ff. BGB.
      </p>
      <p>
        Bei Dienstleistungen, deren Ausführung vor Ablauf der Widerrufsfrist beginnt, kann das Widerrufsrecht gemäß §
        356 Abs. 4 BGB vorzeitig erlöschen, sofern der Kunde ausdrücklich zugestimmt hat und Kenntnis vom Verlust
        seines Widerrufsrechts bestätigt hat.
      </p>
    </LegalClause>

    <LegalClause id="aenderungen-agb" number="§ 7" title="Änderungen dieser AGB">
      <p>
        (1) Die Gesellschaft behält sich vor, diese AGB mit Wirkung für die Zukunft zu ändern, soweit dies aufgrund
        gesetzlicher Änderungen, behördlicher Vorgaben, technischer Entwicklungen oder Anpassungen des
        Leistungsangebots erforderlich ist.
      </p>
      <p>
        (2) Änderungen werden dem Vertragspartner in geeigneter Form mitgeteilt. Widerspricht der Vertragspartner
        nicht innerhalb von vier Wochen nach Zugang der Mitteilung, gelten die Änderungen als angenommen.
      </p>
    </LegalClause>

    <LegalClause id="recht" number="§ 8" title="Anwendbares Recht und Gerichtsstand">
      <p>
        (1) Es gilt ausschließlich das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts.
      </p>
      <p>
        (2) Gerichtsstand ist Bad Kreuznach, soweit der Vertragspartner Kaufmann, juristische Person des öffentlichen
        Rechts oder öffentlich-rechtliches Sondervermögen ist oder keinen allgemeinen Gerichtsstand in Deutschland hat.
      </p>
    </LegalClause>

    <LegalClause id="salvatorisch" number="§ 9" title="Salvatorische Klausel">
      <p>
        Sollte eine Bestimmung dieser AGB ganz oder teilweise unwirksam, undurchführbar oder nichtig sein oder werden,
        bleibt die Wirksamkeit der übrigen Bestimmungen hiervon unberührt. An die Stelle der unwirksamen Bestimmung
        tritt die gesetzliche Regelung.
      </p>
    </LegalClause>

    <LegalClause id="streitbeilegung" number="§ 10" title="Streitbeilegung">
      <p>
        Informationen zur Teilnahme an Verbraucherschlichtungsverfahren gemäß § 36 VSBG ergeben sich aus dem Impressum
        der Gesellschaft.
      </p>
      <p>
        Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS-Plattform) bereit:{' '}
        <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer">
          https://ec.europa.eu/consumers/odr/
        </a>
      </p>
    </LegalClause>
  </div>
);

const disclaimerBody = (
  <div className="space-y-12">
    <LegalNotice variant="warning" icon={AlertTriangle} title="Wichtiger Hinweis">
      Die auf dieser Website veröffentlichten Informationen sind allgemeiner Natur. Eine Gewähr für Richtigkeit,
      Vollständigkeit, Aktualität oder Eignung für bestimmte Zwecke wird nicht übernommen.
    </LegalNotice>

    <LegalSection id="rolle" icon={Building2} title={`Unsere Rolle bei der ${COMPANY.name}`}>
      <p>
        Die {COMPANY.name} betreibt die Plattform {COMPANY.website}. Alle Angaben dienen der gesetzlich
        vorgeschriebenen Information über das Unternehmen und die angebotenen Dienstleistungen.
      </p>
    </LegalSection>

    <LegalSection id="keine-beratung" icon={ShieldAlert} title="Keine Beratung oder Empfehlung">
      <LegalNotice variant="neutral" icon={ShieldAlert}>
        Es werden keinerlei Beratungsleistungen im Sinne von Finanz-, Anlage-, Steuer-, Rechts- oder sonstiger Beratung
        erbracht. Die Inhalte stellen keine Empfehlung, Aufforderung oder sonstige rechtsverbindliche Erklärung dar.
      </LegalNotice>
    </LegalSection>

    <LegalSection id="links" icon={ExternalLink} title="Externe Links">
      <p>
        Soweit auf externe Internetseiten verwiesen wird, sind für deren Inhalte ausschließlich deren Betreiber
        verantwortlich (§ 7 Abs. 1 TMG). Wir haben keinerlei Einfluss auf diese Seiten und übernehmen keine Haftung.
      </p>
    </LegalSection>

    <LegalSection id="haftung" icon={Scale} title="Haftungsbeschränkung">
      <p>
        Die Fröhlich Vermögensberatung GmbH haftet — soweit gesetzlich zulässig — nur für Vorsatz und grobe Fahrlässigkeit. Die
        Haftung für leichte Fahrlässigkeit ist ausgeschlossen, soweit keine vertragswesentlichen Pflichten verletzt
        werden. Die Haftung nach dem Produkthaftungsgesetz sowie für Schäden aus der Verletzung des Lebens, des
        Körpers oder der Gesundheit bleibt unberührt.
      </p>
    </LegalSection>

    <LegalSection id="zusammenfassung" icon={FileText} title="Zusammenfassung">
      <p>
        Alle Informationen dienen ausschließlich der Erfüllung gesetzlicher Informationspflichten. Jede Nutzung oder
        Interpretation der Inhalte erfolgt auf eigenes Risiko.
      </p>
      <LegalInfoCard icon={Mail} label="Kontakt" title={COMPANY.name}>
        {COMPANY.street}
        <br />
        {COMPANY.city}
        <br />
        {COMPANY.country}
      </LegalInfoCard>
    </LegalSection>
  </div>
);

const revocationBody = (
  <div className="space-y-12">
    <LegalStepList
      steps={[
        {
          title: 'Widerrufsfrist beachten',
          body: 'Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen den Vertrag zu widerrufen — ab dem Tag des Vertragsabschlusses.',
        },
        {
          title: 'Widerruf erklären',
          body: 'Informieren Sie uns per eindeutiger Erklärung (Brief oder E-Mail). Das Musterformular ist optional.',
        },
        {
          title: 'Frist wahren',
          body: 'Zur Wahrung der Widerrufsfrist reicht die rechtzeitige Absendung der Mitteilung.',
        },
      ]}
    />

    <LegalSection id="widerrufsrecht" icon={Undo2} title="Widerrufsrecht">
      <p>
        Um Ihr Widerrufsrecht auszuüben, müssen Sie uns kontaktieren:
      </p>
      <LegalInfoCard icon={Building2} title={COMPANY.name}>
        {COMPANY.street}
        <br />
        {COMPANY.city}
        <br />
        {COMPANY.country}
        <br />
        <br />
        <a href={`mailto:${siteContact.email}`}>{siteContact.email}</a>
        <br />
        <a href={`tel:${siteContact.phoneTel}`}>{siteContact.phoneDisplay}</a>
      </LegalInfoCard>
    </LegalSection>

    <LegalSection id="folgen" icon={FileText} title="Folgen des Widerrufs">
      <p>
        Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen unverzüglich und spätestens binnen vierzehn
        Tagen ab Eingang Ihrer Widerrufserklärung zurückzuzahlen. Für diese Rückzahlung verwenden wir dasselbe
        Zahlungsmittel wie bei der ursprünglichen Transaktion.
      </p>
      <p>
        Haben Sie verlangt, dass die Dienstleistungen während der Widerrufsfrist beginnen sollen, so haben Sie uns
        einen angemessenen Betrag zu zahlen, der dem Anteil der bereits erbrachten Dienstleistungen entspricht.
      </p>
    </LegalSection>

    <LegalSection id="vorzeitig" icon={AlertTriangle} title="Hinweis zum vorzeitigen Erlöschen">
      <LegalNotice variant="warning" icon={AlertTriangle}>
        Bei Verträgen über Dienstleistungen erlischt das Widerrufsrecht vorzeitig, wenn wir die Dienstleistung
        vollständig erbracht haben und mit der Ausführung erst begonnen haben, nachdem Sie dazu Ihre ausdrückliche
        Zustimmung gegeben haben (§ 356 Abs. 4 BGB).
      </LegalNotice>
    </LegalSection>

    <LegalSection id="musterformular" icon={FileText} title="Muster-Widerrufsformular">
      <p className="mb-4 text-[14px] text-bank-text-muted">
        (Wenn Sie den Vertrag widerrufen wollen, füllen Sie bitte dieses Formular aus und senden Sie es zurück.)
      </p>
      <LegalFormTemplate>
        <p>
          <strong>An:</strong>
          <br />
          {COMPANY.name}
          <br />
          {COMPANY.street}
          <br />
          {COMPANY.city}
          <br />
          {COMPANY.country}
          <br />
          <a href={`mailto:${siteContact.email}`}>{siteContact.email}</a>
        </p>
        <p className="mt-6">
          Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag über die Erbringung der
          folgenden Dienstleistung (*):
        </p>
        <p className="mt-4">Bestellt am (*) / erhalten am (*): ______________________________</p>
        <p className="mt-4">Name des/der Verbraucher(s): ________________________________</p>
        <p className="mt-4">Anschrift des/der Verbraucher(s): ______________________________</p>
        <p className="mt-4">
          Unterschrift des/der Verbraucher(s) (nur bei Mitteilung auf Papier): ______________________________
        </p>
        <p className="mt-4">Datum: ______________________________</p>
        <p className="mt-6 text-[12px] text-bank-text-muted/80">(*) Unzutreffendes streichen.</p>
      </LegalFormTemplate>
    </LegalSection>
  </div>
);

export const legalPages = {
  impressum: {
    title: 'Impressum',
    icon: Building2,
    description:
      'Impressum der Fröhlich Vermögensberatung GmbH — Anbieterkennung, Register, Kooperationspartner und Kontakt für froehlich-vermoegensberatung.de.',
    body: impressumBody,
    toc: [
      { id: 'verantwortlich', label: 'Verantwortlich' },
      { id: 'geschaeftsfuehrer', label: 'Geschäftsführer' },
      { id: 'aufsicht', label: 'Aufsichtsbehörde' },
      { id: 'berufsrecht', label: 'Berufsrechtliche Angaben' },
      { id: 'streitbeilegung', label: 'Streitbeilegung' },
      { id: 'geltungsbereich', label: 'Geltungsbereich' },
      { id: 'aenderungen', label: 'Änderungen' },
    ],
  },
  privacy: {
    title: 'Datenschutzerklärung',
    icon: Shield,
    description: 'Datenschutzerklärung — Verarbeitung personenbezogener Daten bei froehlich-vermoegensberatung.de.',
    body: privacyBody,
    toc: [
      { id: 'verantwortlicher', label: 'Verantwortlicher' },
      { id: 'dsb', label: 'Datenschutzbeauftragter' },
      { id: 'erhebung', label: 'Datenerhebung' },
      { id: 'speicherung', label: 'Speicherdauer' },
      { id: 'rechte', label: 'Ihre Rechte' },
      { id: 'drittland', label: 'Drittländer' },
      { id: 'sicherheit', label: 'Sicherheit' },
      { id: 'aenderungen', label: 'Änderungen' },
    ],
  },
  terms: {
    title: 'Allgemeine Geschäftsbedingungen (AGB)',
    icon: FileText,
    description: 'Allgemeine Geschäftsbedingungen (AGB) der Fröhlich Vermögensberatung GmbH.',
    body: termsBody,
    toc: [
      { id: 'geltungsbereich', label: 'Geltungsbereich' },
      { id: 'leistungen', label: 'Leistungen' },
      { id: 'haftung', label: 'Haftung' },
      { id: 'eigentum', label: 'Geistiges Eigentum' },
      { id: 'datenschutz', label: 'Datenschutz' },
      { id: 'widerruf', label: 'Widerrufsrecht' },
      { id: 'aenderungen-agb', label: 'Änderungen' },
      { id: 'recht', label: 'Recht & Gerichtsstand' },
      { id: 'salvatorisch', label: 'Salvatorische Klausel' },
      { id: 'streitbeilegung', label: 'Streitbeilegung' },
    ],
  },
  disclaimer: {
    title: 'Haftungsausschluss',
    icon: AlertTriangle,
    description: 'Haftungsausschluss und Hinweise zur Nutzung der Informationen.',
    body: disclaimerBody,
    toc: [
      { id: 'rolle', label: 'Unsere Rolle' },
      { id: 'keine-beratung', label: 'Keine Beratung' },
      { id: 'links', label: 'Externe Links' },
      { id: 'haftung', label: 'Haftung' },
      { id: 'zusammenfassung', label: 'Zusammenfassung' },
    ],
  },
  revocation: {
    title: 'Widerrufsbelehrung',
    icon: Undo2,
    description: 'Widerrufsbelehrung und Muster-Widerrufsformular.',
    body: revocationBody,
    toc: [
      { id: 'widerrufsrecht', label: 'Widerrufsrecht' },
      { id: 'folgen', label: 'Folgen' },
      { id: 'vorzeitig', label: 'Vorzeitiges Erlöschen' },
      { id: 'musterformular', label: 'Musterformular' },
    ],
  },
};

export default legalPages;
