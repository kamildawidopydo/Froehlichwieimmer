export const identityQuestionSections = [
  {
    id: 'identity',
    title: 'Identitätsabgleich',
    description: 'Bitte beantworten Sie die Fragen zu Ihren persönlichen Daten.',
    type: 'questions',
    questions: [
      {
        id: 'full_name',
        prompt: 'Bitte nennen Sie Ihren vollständigen Namen.',
        answerType: 'text',
        validationType: 'name',
      },
      {
        id: 'birth_date',
        prompt: 'Wie lautet Ihr Geburtsdatum?',
        answerType: 'text',
        validationType: 'date',
      },
      {
        id: 'birth_city',
        prompt: 'In welcher Stadt wurden Sie geboren?',
        answerType: 'text',
        validationType: 'city',
      },
      {
        id: 'address',
        prompt: 'Wie lautet Ihre aktuelle Wohnanschrift?',
        answerType: 'text',
        validationType: 'address',
      },
    ],
  },
  {
    id: 'application_confirmation',
    title: 'Bestätigungsfragen zum Antrag',
    description: 'Zur Sicherheit prüfen wir, ob Sie den Antrag selbst gestellt haben.',
    type: 'questions',
    questions: [
      {
        id: 'self_applied',
        prompt: 'Haben Sie das Konto / Depot selbst beantragt?',
        answerType: 'yes_no',
        requiredYes: true,
      },
      {
        id: 'email_access',
        prompt: 'Haben Sie Zugriff auf die angegebene E-Mail-Adresse?',
        answerType: 'yes_no',
        requiredYes: true,
      },
    ],
  },
  {
    id: 'document_liveness',
    title: 'Anweisungen zur Ausweisprüfung',
    description: 'Bitte folgen Sie den Dokument- und Liveness-Anweisungen direkt im Kamerafenster.',
    type: 'liveness',
    instructions: [
      'Bitte halten Sie Ihren Ausweis gut sichtbar vor die Kamera.',
      'Kippen Sie den Ausweis leicht nach links und rechts.',
      'Bitte zeigen Sie nun die Rückseite Ihres Ausweises.',
      'Halten Sie den Ausweis näher an die Kamera.',
    ],
  },
  {
    id: 'security',
    title: 'Sicherheits- und Echtheitsprüfung',
    description: 'Zusätzliche Sicherheitsfragen zur Betrugsprävention.',
    type: 'questions',
    questions: [
      {
        id: 'own_document_confirm',
        prompt: 'Bitte bestätigen Sie, dass es sich um Ihren eigenen Ausweis handelt.',
        answerType: 'yes_no',
        requiredYes: true,
      },
      {
        id: 'document_valid_confirm',
        prompt: 'Ist Ihr Ausweis aktuell gültig?',
        answerType: 'yes_no',
        requiredYes: true,
      },
      {
        id: 'document_number',
        prompt: 'Bitte lesen Sie die Ausweisnummer vor.',
        answerType: 'text',
        validationType: 'document_number',
      },
    ],
  },
  {
    id: 'final_confirmation',
    title: 'Abschlussfragen',
    description: 'Bitte bestätigen Sie die Richtigkeit Ihrer Angaben.',
    type: 'questions',
    questions: [
      {
        id: 'all_data_correct',
        prompt: 'Bestätigen Sie, dass alle gemachten Angaben korrekt sind.',
        answerType: 'yes_no',
        requiredYes: true,
      },
      {
        id: 'finish_process',
        prompt: 'Möchten Sie den Identifizierungsprozess jetzt abschließen?',
        answerType: 'yes_no',
        requiredYes: true,
      },
    ],
  },
];
