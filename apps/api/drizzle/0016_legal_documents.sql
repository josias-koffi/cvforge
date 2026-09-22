-- The four legal documents CVSpark publishes, editable from the back-office.
-- Both languages live in one row because they are published together.
--
-- `body` is plain text in the convention the landing parses ("## " opens a
-- sub-heading, "- " a list item, blank lines separate blocks). It is never
-- HTML: nothing in the product renders it as markup.
--
-- The initial content is seeded here rather than left to a manual step, so a
-- fresh environment has its legal pages from the first boot. The texts are
-- drafted from what the code actually does; every field belonging to the
-- publisher's identity is left as an explicit [PLACEHOLDER].
CREATE TABLE IF NOT EXISTS "legal_documents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" text NOT NULL,
  "title" jsonb NOT NULL,
  "body" jsonb NOT NULL,
  "version" integer DEFAULT 0 NOT NULL,
  "published_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "legal_documents_slug_unique" UNIQUE("slug"),
  CONSTRAINT "legal_documents_slug_valid" CHECK ("slug" in ('terms', 'sales-terms', 'legal-notice', 'privacy')),
  CONSTRAINT "legal_documents_version_positive" CHECK ("version" >= 0)
);
--> statement-breakpoint
INSERT INTO "legal_documents" ("slug", "title", "body", "version", "published_at")
VALUES (
  'terms',
  jsonb_build_object('fr', $$Conditions générales d'utilisation$$, 'en', $$Terms of use$$),
  jsonb_build_object('fr', $fr$Les présentes conditions régissent l'utilisation du service CVSpark, édité par [RAISON SOCIALE] (voir les mentions légales). Créer un compte vaut acceptation de ces conditions.

## Le service

CVSpark aide un candidat à préparer ses candidatures : il centralise un profil professionnel, adapte un CV et une lettre de motivation à une offre donnée, suit les candidatures envoyées, et permet de s'entraîner à l'entretien face à un recruteur simulé par une intelligence artificielle.

Le service est accessible par navigateur, en français et en anglais.

## Le compte

- L'accès se fait sans mot de passe : vous recevez par courriel un lien de connexion à usage unique, valable quinze minutes.
- Un compte est personnel. Vous êtes responsable de l'accès à la boîte courriel associée.
- Vous devez être âgé d'au moins seize ans pour créer un compte.
- Des crédits de bienvenue sont attribués une seule fois à la création du compte. Ils ne sont pas rechargés et n'ont aucune valeur monétaire.

## Ce que l'IA fait, et ce qu'elle ne fait pas

L'intelligence artificielle rationalise un travail répétitif : lire une offre, repérer ce qui compte, reformuler un parcours. Elle ne remplace pas votre jugement.

- Tout document généré est une proposition. Vous pouvez le modifier, et c'est vous qui décidez de l'envoyer.
- Vous restez seul responsable de l'exactitude des informations contenues dans les documents que vous envoyez à un employeur.
- Un contenu généré peut comporter des erreurs ou des approximations. Relisez avant d'envoyer.
- Aucun résultat n'est garanti : ni un entretien, ni une réponse, ni une embauche.
- Le rapport d'entretien est un outil d'entraînement. Il ne constitue ni une évaluation professionnelle, ni un avis de recrutement.

## Ce que vous vous engagez à ne pas faire

- Renseigner des informations professionnelles sciemment fausses dans le but de tromper un employeur.
- Importer le CV ou les données personnelles d'un tiers sans son accord.
- Utiliser le service pour produire des contenus illicites, diffamatoires, haineux ou portant atteinte aux droits d'autrui.
- Tenter de contourner le décompte des crédits, d'automatiser l'usage du service ou d'en perturber le fonctionnement.

## Disponibilité

Le service est fourni en l'état, sans garantie de disponibilité ininterrompue. Des interruptions peuvent survenir pour maintenance, ou du fait d'un prestataire tiers dont dépend le service. Nous nous efforçons d'en limiter la durée.

Certaines fonctions reposent sur des fournisseurs d'intelligence artificielle externes. Si l'un d'eux devient indisponible, la fonction concernée peut être momentanément suspendue.

## Suspension et résiliation

Vous pouvez supprimer votre compte à tout moment depuis votre espace personnel. La suppression efface vos données selon les règles décrites dans la politique de confidentialité, et les crédits non consommés sont perdus sans contrepartie.

Nous pouvons suspendre ou supprimer un compte qui enfreint les présentes conditions. En cas de suspension sans faute de votre part, les crédits non consommés vous restent acquis.

## Propriété

Vous restez propriétaire des données de votre profil et des documents que vous produisez avec le service. Nous ne revendiquons aucun droit sur vos CV et lettres.

Le service lui-même, sa marque, son interface et ses gabarits de documents restent la propriété de son éditeur.

## Modification des conditions

Ces conditions peuvent évoluer. La version applicable est celle publiée sur cette page, dont la date de mise à jour figure en tête. Une modification substantielle vous sera signalée dans l'application.

## Droit applicable

Les présentes conditions sont soumises au droit français. En cas de litige, une solution amiable sera recherchée avant toute action judiciaire. Vous pouvez recourir gratuitement à un médiateur de la consommation.$fr$, 'en', $en$These terms govern the use of CVSpark, published by [LEGAL ENTITY] (see the legal notice). Creating an account means accepting them.

## The service

CVSpark helps a candidate prepare job applications: it holds one professional profile, tailors a CV and a cover letter to a given job offer, tracks the applications sent, and lets you practise interviewing with a recruiter simulated by artificial intelligence.

The service runs in a browser, in French and in English.

## Your account

- Access is passwordless: you receive a single-use sign-in link by email, valid for fifteen minutes.
- An account is personal. You are responsible for access to the mailbox it is tied to.
- You must be at least sixteen years old to create an account.
- Welcome credits are granted once, when the account is created. They are not renewed and have no monetary value.

## What the AI does, and what it does not

Artificial intelligence takes over repetitive work: reading an offer, spotting what matters, rewording a career history. It does not replace your judgement.

- Every generated document is a proposal. You can edit it, and you decide whether to send it.
- You remain solely responsible for the accuracy of what you send to an employer.
- Generated content can contain mistakes or approximations. Read it before sending it.
- No outcome is guaranteed: not an interview, not a reply, not a job.
- The interview report is a practice tool. It is neither a professional assessment nor a recruitment opinion.

## What you agree not to do

- Enter knowingly false professional information in order to mislead an employer.
- Import someone else's CV or personal data without their consent.
- Use the service to produce unlawful, defamatory or hateful content, or content infringing the rights of others.
- Attempt to bypass credit accounting, automate use of the service, or disrupt its operation.

## Availability

The service is provided as is, with no guarantee of uninterrupted availability. Interruptions may occur for maintenance, or because of a third-party provider the service depends on. We work to keep them short.

Some features rely on external artificial-intelligence providers. If one becomes unavailable, the feature concerned may be suspended for a time.

## Suspension and termination

You can delete your account at any time from your personal area. Deletion erases your data under the rules set out in the privacy policy, and unused credits are lost without compensation.

We may suspend or delete an account that breaches these terms. If an account is suspended through no fault of yours, unused credits remain yours.

## Ownership

You keep ownership of your profile data and of the documents you produce with the service. We claim no rights over your CVs and letters.

The service itself, its brand, its interface and its document templates remain the property of its publisher.

## Changes to these terms

These terms may change. The applicable version is the one published on this page, with its update date at the top. A substantial change will be signalled to you in the application.

## Governing law

These terms are governed by French law. In the event of a dispute, an amicable solution will be sought before any legal action. You may refer the matter free of charge to a consumer mediator.$en$),
  1,
  now()
),
(
  'sales-terms',
  jsonb_build_object('fr', $$Conditions générales de vente$$, 'en', $$Terms of sale$$),
  jsonb_build_object('fr', $fr$Les présentes conditions régissent la vente de crédits sur CVSpark, par [RAISON SOCIALE] (voir les mentions légales), à un consommateur au sens du code de la consommation.

## Ce qui est vendu

CVSpark ne vend pas d'abonnement. Vous achetez un pack de crédits, en une fois, et vous le consommez à votre rythme.

- Aucune reconduction automatique, aucun prélèvement récurrent.
- Les crédits n'ont pas de date d'expiration.
- Les crédits ne sont pas transférables entre comptes et n'ont pas de valeur monétaire.
- Chaque action assistée par l'IA consomme un nombre de crédits annoncé avant que vous ne la déclenchiez.

Le détail des packs et de leur prix figure sur la page des tarifs et dans l'application. Il fait foi au moment de l'achat.

## Prix

Les prix sont affichés en euros. TVA non applicable, article 293 B du code général des impôts.

Le prix et le nombre de crédits sont figés au moment de l'achat : une modification ultérieure d'un pack ne change rien à une commande déjà passée.

## Commande et paiement

Le paiement est traité par Stripe. Nous n'avons jamais accès à votre numéro de carte.

La commande est ferme dès la confirmation du paiement. Les crédits sont portés sur votre compte immédiatement après cette confirmation, sans intervention de notre part.

Si le paiement échoue ou expire, aucun crédit n'est attribué et aucune somme n'est due.

Nous pouvons suspendre temporairement la vente de crédits lorsque notre fournisseur d'intelligence artificielle est momentanément hors d'état d'honorer les traitements. Vendre dans ces conditions reviendrait à devoir rembourser : nous préférons ne pas vendre. La vente reprend dès le rechargement.

## Droit de rétractation

Vous disposez en principe d'un délai de quatorze jours pour vous rétracter d'un achat à distance.

Les crédits constituent un contenu numérique fourni sur un support immatériel et exécuté immédiatement : ils sont disponibles sur votre compte dès la confirmation du paiement, et consommables dans la seconde.

En confirmant votre achat, vous demandez expressément l'exécution immédiate de la prestation et vous renoncez à votre droit de rétractation, conformément à l'article L221-28 du code de la consommation. Cette renonciation vous est rappelée au moment du paiement.

## Remboursement

Les crédits consommés ne sont pas remboursés.

Une action assistée par l'IA peut échouer sans consommer de crédit ; dans ce cas rien ne vous est facturé et vous pouvez recommencer. Une session d'entretien, en revanche, est débitée à son ouverture, parce que son coût est engagé dès qu'elle commence : un tour de parole qui échoue ne la rend pas inutilisable, vous pouvez reprendre la parole.

En cas d'erreur de facturation de notre fait, écrivez à [EMAIL DE CONTACT] : nous régularisons.

## Conservation des pièces

Une commande payée constitue une pièce comptable. Elle est conservée pendant la durée légale même après la suppression de votre compte, sous une forme d'où votre identité a été retirée.

## Réclamation et médiation

Pour toute réclamation : [EMAIL DE CONTACT].

À défaut de solution amiable, vous pouvez recourir gratuitement à un médiateur de la consommation, ou à la plateforme européenne de règlement en ligne des litiges.

Les présentes conditions sont soumises au droit français.$fr$, 'en', $en$These terms govern the sale of credits on CVSpark, by [LEGAL ENTITY] (see the legal notice), to a consumer within the meaning of French consumer law.

## What is sold

CVSpark does not sell subscriptions. You buy a pack of credits, once, and spend it at your own pace.

- No automatic renewal, no recurring charge.
- Credits do not expire.
- Credits cannot be transferred between accounts and have no monetary value.
- Every AI-assisted action costs a number of credits shown to you before you trigger it.

The packs and their prices are listed on the pricing page and in the application. They are what counts at the time of purchase.

## Prices

Prices are shown in euros. VAT is not applicable, under Article 293 B of the French General Tax Code.

The price and the number of credits are frozen at the time of purchase: editing a pack later changes nothing for an order already placed.

## Ordering and payment

Payment is handled by Stripe. We never have access to your card number.

The order is final once payment is confirmed. Credits are added to your account immediately after that confirmation, with no action needed from us.

If payment fails or expires, no credits are granted and nothing is owed.

We may temporarily suspend the sale of credits when our artificial-intelligence provider is briefly unable to serve the work. Selling under those conditions would mean refunding: we would rather not sell. Sales resume as soon as the account is topped up.

## Right of withdrawal

You normally have fourteen days to withdraw from a distance purchase.

Credits are digital content supplied on an intangible medium and performed immediately: they are available on your account as soon as payment is confirmed, and can be spent within the second.

By confirming your purchase, you expressly request immediate performance and waive your right of withdrawal, under article L221-28 of the French consumer code. That waiver is repeated to you at the moment of payment.

## Refunds

Credits already spent are not refunded.

An AI-assisted action can fail without costing a credit; in that case nothing is charged and you can try again. An interview session, however, is charged when it opens, because its cost is committed the moment it starts: one failed turn does not make the session unusable, you can simply speak again.

If we make a billing error, write to [CONTACT EMAIL] and we will put it right.

## Record keeping

A paid order is an accounting record. It is kept for the statutory period even after your account is deleted, in a form from which your identity has been removed.

## Complaints and mediation

For any complaint: [CONTACT EMAIL].

Failing an amicable solution, you may refer the matter free of charge to a consumer mediator, or to the European online dispute resolution platform.

These terms are governed by French law.$en$),
  1,
  now()
),
(
  'legal-notice',
  jsonb_build_object('fr', $$Mentions légales$$, 'en', $$Legal notice$$),
  jsonb_build_object('fr', $fr$## Éditeur du site

- Dénomination : [RAISON SOCIALE]
- Forme juridique : [FORME JURIDIQUE]
- Capital social : [CAPITAL]
- Siège social : [ADRESSE]
- Immatriculation : [RCS OU SIRET]
- Courriel : [EMAIL DE CONTACT]

CVSpark est le nom commercial sous lequel le service est exploité.

## Directeur de la publication

[NOM DU DIRECTEUR DE LA PUBLICATION]

## Hébergement

Le site et l'application sont hébergés par :

- [RAISON SOCIALE DE L'HÉBERGEUR]
- [ADRESSE DE L'HÉBERGEUR]
- [TÉLÉPHONE OU COURRIEL DE L'HÉBERGEUR]

La distribution des contenus et la protection du domaine sont assurées par Cloudflare, Inc., 101 Townsend Street, San Francisco, CA 94107, États-Unis.

## Propriété intellectuelle

L'ensemble des éléments composant le site et l'application — textes, interface, identité visuelle, gabarits de documents — est protégé par le droit de la propriété intellectuelle et reste la propriété de l'éditeur, à l'exception des contenus produits par les utilisateurs, qui leur appartiennent.

## Données personnelles

Le traitement des données personnelles est décrit dans la politique de confidentialité.

## Signalement d'un contenu illicite

Tout contenu manifestement illicite peut être signalé à [EMAIL DE CONTACT].$fr$, 'en', $en$## Publisher

- Name: [LEGAL ENTITY]
- Legal form: [LEGAL FORM]
- Share capital: [SHARE CAPITAL]
- Registered office: [ADDRESS]
- Registration: [COMPANY NUMBER]
- Email: [CONTACT EMAIL]

CVSpark is the trading name under which the service is operated.

## Publication director

[PUBLICATION DIRECTOR]

## Hosting

The site and the application are hosted by:

- [HOSTING PROVIDER]
- [HOSTING PROVIDER ADDRESS]
- [HOSTING PROVIDER PHONE OR EMAIL]

Content delivery and domain protection are provided by Cloudflare, Inc., 101 Townsend Street, San Francisco, CA 94107, United States.

## Intellectual property

Everything the site and the application are made of — texts, interface, visual identity, document templates — is protected by intellectual property law and remains the property of the publisher, except for content produced by users, which belongs to them.

## Personal data

The processing of personal data is described in the privacy policy.

## Reporting unlawful content

Any manifestly unlawful content can be reported to [CONTACT EMAIL].$en$),
  1,
  now()
),
(
  'privacy',
  jsonb_build_object('fr', $$Politique de confidentialité$$, 'en', $$Privacy policy$$),
  jsonb_build_object('fr', $fr$Cette politique décrit ce que CVSpark fait de vos données. Elle décrit le service tel qu'il fonctionne réellement, y compris là où le fonctionnement est imparfait.

Responsable de traitement : [RAISON SOCIALE], [ADRESSE]. Contact : [EMAIL DE CONTACT].

## Ce que nous traitons, et pourquoi

- Votre adresse électronique, pour vous connecter sans mot de passe et vous écrire au sujet de votre compte. Base légale : l'exécution du contrat.
- Les données de votre profil professionnel — identité, coordonnées, expériences, formations, compétences — pour produire vos CV et vos lettres. Base légale : l'exécution du contrat.
- Les offres d'emploi que vous enregistrez et le suivi de vos candidatures. Base légale : l'exécution du contrat.
- Les transcriptions de vos entretiens d'entraînement et les rapports qui en découlent. Base légale : l'exécution du contrat.
- Vos commandes et votre solde de crédits. Base légale : l'exécution du contrat et nos obligations comptables.
- Des journaux techniques de fonctionnement et de sécurité. Base légale : notre intérêt légitime à maintenir le service.

Nous ne faisons ni profilage publicitaire, ni revente de données, ni prospection commerciale.

## Ce qui n'est jamais envoyé à l'intelligence artificielle

Le principe est simple : l'IA ne reçoit pas de quoi vous identifier directement.

Ne sont jamais transmis : votre nom de famille, votre numéro de téléphone, votre adresse électronique, votre adresse postale exacte et votre date de naissance. Votre adresse est réduite à la ville. Votre nom de famille est remplacé par un marqueur générique.

Ces informations sont réinjectées localement, après la génération, au moment de composer le document final. Le contexte transmis au recruteur simulé suit la même règle.

## Vos enregistrements audio ne sont pas conservés

Pendant un entretien d'entraînement, votre voix est enregistrée par segments, envoyée pour être transcrite, puis abandonnée. Aucun fichier audio n'est écrit sur disque. Seul le texte est conservé — c'est aussi pourquoi un rapport d'entretien ne propose pas de réécoute.

## Qui traite vos données pour nous

- OpenRouter (États-Unis), passerelle par laquelle transitent tous nos appels d'intelligence artificielle. Selon la disponibilité des modèles, OpenRouter achemine la demande vers Mistral (Union européenne), OpenAI (États-Unis) ou Google (États-Unis). La voix d'un entretien et sa transcription sont aujourd'hui traitées par des modèles OpenAI.
- Stripe, pour le paiement et la facturation.
- Resend, pour l'envoi des courriels de connexion et de notification.
- Cloudflare, pour la distribution et la protection du site.
- [RAISON SOCIALE DE L'HÉBERGEUR], pour l'hébergement des serveurs et des bases de données.

Nous ne conservons pas le contenu de nos échanges avec les modèles d'intelligence artificielle. En revanche, à la date de cette mise à jour, l'option de non-rétention côté fournisseur n'est pas activée sur l'ensemble de la chaîne, et les modèles de repli sont hébergés hors de l'Union européenne. Nous préférons l'écrire plutôt que de promettre l'inverse. La pseudonymisation décrite plus haut reste appliquée dans tous les cas.

Ces transferts hors Union européenne sont encadrés par les clauses contractuelles types de la Commission européenne.

## Combien de temps nous les gardons

- Votre compte et les données qui s'y rattachent : tant que le compte existe.
- Les entretiens d'entraînement, leurs transcriptions et leurs rapports : trente jours après la fin de la session, puis suppression automatique.
- Les liens de connexion : quinze minutes, ou moins s'ils ont déjà servi.
- Les invitations : quarante-huit heures, ou moins si elles ont déjà servi.
- Les commandes payées : la durée légale de conservation des pièces comptables, sous une forme d'où votre identité a été retirée après la suppression du compte.

## Vos droits

Vous pouvez accéder à vos données, les rectifier, les exporter dans un format lisible par une machine, et les supprimer. Ces trois actions sont disponibles directement depuis votre espace personnel, sans nous écrire.

La suppression du compte efface immédiatement votre profil, vos candidatures, vos entretiens et vos notifications. Elle est irréversible et vous demande de saisir votre adresse électronique pour être confirmée.

Pour toute autre demande : [EMAIL DE CONTACT]. Vous pouvez également introduire une réclamation auprès de la Commission nationale de l'informatique et des libertés (CNIL).

## Cookies

Le site vitrine ne dépose aucun cookie.

L'application dépose un seul cookie, strictement nécessaire : celui qui vous maintient connecté. Nous n'utilisons aucun outil de mesure d'audience, aucun traceur publicitaire. C'est pourquoi aucune bannière de consentement ne vous est présentée.

## Sécurité

Les échanges sont chiffrés en transit. L'accès aux données de production est restreint. Les documents que vous générez sont servis par des liens temporaires signés, et non par des adresses publiques permanentes.

## Évolution de cette politique

Cette politique peut évoluer. La version applicable est celle publiée sur cette page, dont la date figure en tête.$fr$, 'en', $en$This policy describes what CVSpark does with your data. It describes the service as it actually works, including where that is imperfect.

Data controller: [LEGAL ENTITY], [ADDRESS]. Contact: [CONTACT EMAIL].

## What we process, and why

- Your email address, to sign you in without a password and to write to you about your account. Legal basis: performance of the contract.
- Your professional profile — identity, contact details, experience, education, skills — to produce your CVs and letters. Legal basis: performance of the contract.
- The job offers you save and the tracking of your applications. Legal basis: performance of the contract.
- The transcripts of your practice interviews and the reports drawn from them. Legal basis: performance of the contract.
- Your orders and your credit balance. Legal basis: performance of the contract and our accounting obligations.
- Technical logs for operation and security. Legal basis: our legitimate interest in keeping the service running.

We do no advertising profiling, no resale of data, and no marketing outreach.

## What is never sent to the artificial intelligence

The principle is simple: the AI never receives what would identify you directly.

Never transmitted: your surname, your phone number, your email address, your exact postal address and your date of birth. Your address is reduced to the city. Your surname is replaced by a generic marker.

These details are re-inserted locally, after generation, when the final document is assembled. The context given to the simulated recruiter follows the same rule.

## Your audio recordings are not kept

During a practice interview, your voice is recorded in segments, sent to be transcribed, then dropped. No audio file is written to disk. Only the text is kept — which is also why an interview report offers no playback.

## Who processes your data for us

- OpenRouter (United States), the gateway every artificial-intelligence call goes through. Depending on model availability, OpenRouter routes the request to Mistral (European Union), OpenAI (United States) or Google (United States). An interview's voice and its transcription are currently handled by OpenAI models.
- Stripe, for payment and invoicing.
- Resend, to send sign-in and notification emails.
- Cloudflare, for content delivery and site protection.
- [HOSTING PROVIDER], for hosting the servers and databases.

We do not keep the content of our exchanges with the AI models. However, as of this update, provider-side zero retention is not enabled across the whole chain, and the fallback models are hosted outside the European Union. We would rather write that down than promise the opposite. The pseudonymisation described above applies in every case.

These transfers outside the European Union are covered by the European Commission's standard contractual clauses.

## How long we keep them

- Your account and the data attached to it: as long as the account exists.
- Practice interviews, their transcripts and their reports: thirty days after the session ends, then automatic deletion.
- Sign-in links: fifteen minutes, or less once used.
- Invitations: forty-eight hours, or less once used.
- Paid orders: the statutory retention period for accounting records, in a form from which your identity has been removed after account deletion.

## Your rights

You can access your data, correct it, export it in a machine-readable format, and delete it. All three are available directly from your personal area, without writing to us.

Deleting the account immediately erases your profile, your applications, your interviews and your notifications. It cannot be undone, and it asks you to type your email address to confirm.

For anything else: [CONTACT EMAIL]. You may also lodge a complaint with the French data protection authority (CNIL).

## Cookies

The marketing site sets no cookies.

The application sets a single, strictly necessary cookie: the one that keeps you signed in. We use no audience measurement, no advertising tracker. That is why you are never shown a consent banner.

## Security

Traffic is encrypted in transit. Access to production data is restricted. The documents you generate are served through short-lived signed links, not through permanent public addresses.

## Changes to this policy

This policy may change. The applicable version is the one published on this page, with its date at the top.$en$),
  1,
  now()
)
ON CONFLICT ("slug") DO NOTHING;
