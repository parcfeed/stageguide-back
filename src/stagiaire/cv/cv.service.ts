import { Injectable, NotFoundException, StreamableFile } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import PDFDocument from 'pdfkit';

const MARGE = 46;
const COULEUR_PRIMAIRE = '#4338CA';
const COULEUR_PRIMAIRE_DOUCE = '#EEF2FF';
const COULEUR_TEXTE = '#1F2937';
const COULEUR_ATENUEE = '#6B7280';
const COULEUR_BORDURE = '#E5E7EB';
const COULEUR_FOND = '#F9FAFB';
const COULEUR_LIEN = '#2563EB';

interface ProfilCv {
  prenom: string | null;
  nom: string | null;
  email: string | null;
  telephone: string | null;
  ecole: string | null;
  niveauEtudes: string | null;
  bio: string | null;
}

interface ContenuCv {
  titre: string | null;
  resume: string | null;
  formationResume: string | null;
  experienceResume: string | null;
}

interface CompetenceCv {
  nom: string;
  categorie: string | null;
  niveau: number | null;
}

interface ProjetCv {
  titre: string;
  description: string | null;
  tags?: string[] | null;
  lienProjet?: string | null;
  imageUrl?: string | null;
}

interface CertificatCv {
  titre: string;
  urlDocument?: string | null;
  hashVerification?: string | null;
  createdAt?: Date | string | null;
}

interface ExperienceCv {
  titrePoste: string;
  entrepriseNom: string;
  description?: string | null;
  dateDebut?: Date | string | null;
  dateFin?: Date | string | null;
}

interface CvComplet {
  profil: ProfilCv;
  cv: ContenuCv;
  competences: CompetenceCv[];
  projets: ProjetCv[];
  certificats: CertificatCv[];
  experiences: ExperienceCv[];
}

interface RunTexte {
  texte: string;
  lien?: string;
}

@Injectable()
export class CvService {
  constructor(private readonly prisma: PrismaService) {}

  private getPublicBaseUrl(): string {
    const configuredBaseUrl =
      process.env.APP_URL ??
      process.env.FRONTEND_URL ??
      'http://localhost:4200';
    return configuredBaseUrl.replace(/\/$/, '');
  }

  buildPublicUrl(token: string): string {
    // Pointe vers la page publique du frontend (route Angular /cv/partage/:token),
    // pas vers la route API qui renvoie du JSON.
    return `${this.getPublicBaseUrl()}/cv/partage/${token}`;
  }

  createShareToken(utilisateurId: string) {
    const encodedUserId = Buffer.from(utilisateurId).toString('base64url');
    return `${encodedUserId}.${randomBytes(12).toString('hex')}`;
  }

  async getSharedCvByToken(token: string) {
    const separatorIndex = token.lastIndexOf('.');
    if (separatorIndex === -1) {
      throw new NotFoundException('Token de partage invalide');
    }

    const encodedUserId = token.slice(0, separatorIndex);
    const utilisateurId = Buffer.from(encodedUserId, 'base64url').toString(
      'utf-8',
    );

    const cv = await this.getCv(utilisateurId);
    const publicUrl = this.buildPublicUrl(token);

    return {
      ...cv,
      shareToken: token,
      shared: true,
      publicUrl,
      url: publicUrl,
      link: publicUrl,
      absoluteUrl: publicUrl,
    };
  }

  async getCv(utilisateurId: string) {
    const utilisateur = await this.prisma.user.findUnique({
      where: { id: utilisateurId },
      include: {
        cv: true,
        competences: {
          include: { competence: true },
        },
        projetsPortfolio: {
          orderBy: { createdAt: 'desc' },
        },
        experiencesProfessionnelles: {
          orderBy: { dateDebut: 'desc' },
        },
      },
    });

    if (!utilisateur) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    const certificats = await this.prisma.certificat.findMany({
      where: { utilisateurId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      utilisateurId,
      profil: {
        prenom: utilisateur.prenom,
        nom: utilisateur.nom,
        email: utilisateur.email,
        telephone: utilisateur.telephone,
        ecole: utilisateur.ecole,
        niveauEtudes: utilisateur.niveauEtudes,
        bio: utilisateur.bio,
      },
      cv: utilisateur.cv ?? {
        titre: null,
        resume: null,
        formationResume: null,
        experienceResume: null,
        urlPdf: null,
      },
      competences: utilisateur.competences.map((item) => ({
        id: item.competence.id,
        nom: item.competence.nom,
        categorie: item.competence.categorie,
        niveau: item.niveau,
      })),
      projets: utilisateur.projetsPortfolio,
      experiences: (utilisateur.experiencesProfessionnelles ?? []).map(
        (experience) => ({
          id: experience.id,
          titrePoste: experience.titrePoste,
          entrepriseNom: experience.entrepriseNom,
          description: experience.description,
          dateDebut: experience.dateDebut,
          dateFin: experience.dateFin,
        }),
      ),
      certificats,
      generatedAt: new Date().toISOString(),
    };
  }

  async getPdf(
    utilisateurId: string,
    nomFichier?: string,
  ): Promise<StreamableFile> {
    const cv = await this.getCv(utilisateurId);

    const doc = new PDFDocument({
      margin: MARGE,
      size: 'A4',
      bufferPages: true,
    });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    const termine = new Promise<Buffer>((resolve) =>
      doc.on('end', () => resolve(Buffer.concat(chunks))),
    );

    this.remplirCvPdf(doc, cv);
    this.ajouterPiedsDePage(doc);
    doc.end();

    const buffer = await termine;
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${nomFichier ?? `CV_${cv.profil.prenom}_${cv.profil.nom}.pdf`}"`,
    });
  }

  private remplirCvPdf(doc: PDFKit.PDFDocument, cv: CvComplet): void {
    this.dessinerEnTete(doc, cv);

    if (cv.profil.bio) {
      this.titreSection(doc, 'Profil professionnel');
      this.paragraphe(doc, cv.profil.bio);
    }

    if (cv.cv.resume) {
      this.titreSection(doc, 'Résumé');
      this.paragraphe(doc, cv.cv.resume);
    }

    if (cv.experiences.length > 0) {
      this.titreSection(doc, 'Expériences professionnelles');
      cv.experiences.forEach((experience) =>
        this.dessinerExperience(doc, experience),
      );
    } else if (cv.cv.experienceResume) {
      this.titreSection(doc, 'Expériences professionnelles');
      this.paragraphe(doc, cv.cv.experienceResume);
    }

    if (cv.projets.length > 0) {
      this.titreSection(doc, 'Projets & réalisations (portfolio)');
      cv.projets.forEach((projet) => this.dessinerProjet(doc, projet));
    }

    if (cv.cv.formationResume) {
      this.titreSection(doc, 'Formation');
      this.paragraphe(doc, cv.cv.formationResume);
    }

    if (cv.competences.length > 0) {
      this.titreSection(doc, 'Compétences');
      this.dessinerCompetences(doc, cv.competences);
    }

    if (cv.certificats.length > 0) {
      this.titreSection(doc, 'Certifications');
      cv.certificats.forEach((certificat) =>
        this.dessinerCertificat(doc, certificat),
      );
    }
  }

  private dessinerEnTete(doc: PDFKit.PDFDocument, cv: CvComplet): void {
    const largeur = this.largeurContenu(doc);

    doc.rect(0, 0, doc.page.width, 7).fillColor(COULEUR_PRIMAIRE).fill();

    const nomComplet =
      `${cv.profil.prenom ?? ''} ${cv.profil.nom ?? ''}`.trim() ||
      'Curriculum Vitae';
    doc
      .font('Helvetica-Bold')
      .fontSize(23)
      .fillColor(COULEUR_TEXTE)
      .text(nomComplet, MARGE, 40, { width: largeur });

    if (cv.cv.titre) {
      doc
        .font('Helvetica')
        .fontSize(12)
        .fillColor(COULEUR_PRIMAIRE)
        .text(cv.cv.titre, MARGE, doc.y + 3, { width: largeur });
    }

    const coordonnees: RunTexte[] = [];
    if (cv.profil.email) {
      coordonnees.push({
        texte: cv.profil.email,
        lien: `mailto:${cv.profil.email}`,
      });
    }
    if (cv.profil.telephone) {
      coordonnees.push({
        texte: cv.profil.telephone,
        lien: `tel:${cv.profil.telephone.replace(/\s+/g, '')}`,
      });
    }
    if (cv.profil.ecole) {
      coordonnees.push({ texte: cv.profil.ecole });
    }
    if (cv.profil.niveauEtudes) {
      coordonnees.push({ texte: cv.profil.niveauEtudes });
    }

    if (coordonnees.length > 0) {
      doc.moveDown(0.45);
      const runs: RunTexte[] = [];
      coordonnees.forEach((coordonnee, index) => {
        runs.push(coordonnee);
        if (index < coordonnees.length - 1) {
          runs.push({ texte: '   •   ' });
        }
      });
      this.ecrireRuns(doc, runs, 9.5);
    }

    doc.moveDown(0.6);
    const yLigne = doc.y;
    doc
      .moveTo(MARGE, yLigne)
      .lineTo(MARGE + largeur, yLigne)
      .lineWidth(1.2)
      .strokeColor(COULEUR_PRIMAIRE)
      .stroke();
    doc.y = yLigne;
  }

  private ecrireRuns(
    doc: PDFKit.PDFDocument,
    runs: RunTexte[],
    taille: number,
  ): void {
    runs.forEach((run, index) => {
      const dernier = index === runs.length - 1;
      doc
        .font('Helvetica')
        .fontSize(taille)
        .fillColor(run.lien ? COULEUR_LIEN : COULEUR_ATENUEE)
        .text(run.texte, { continued: !dernier, link: run.lien });
    });
  }

  private dessinerExperience(
    doc: PDFKit.PDFDocument,
    experience: ExperienceCv,
  ): void {
    const largeur = this.largeurContenu(doc);
    const periode = this.formatPeriode(
      experience.dateDebut,
      experience.dateFin,
    );

    doc.font('Helvetica-Bold').fontSize(10.5);
    const hauteurTitre = doc.heightOfString(experience.titrePoste, {
      width: largeur,
    });
    doc.font('Helvetica').fontSize(9.5);
    const hauteurSousTitre = doc.heightOfString(
      experience.entrepriseNom ?? '',
      { width: largeur },
    );
    let hauteurDescription = 0;
    if (experience.description) {
      hauteurDescription = doc.heightOfString(experience.description, {
        width: largeur,
      });
    }
    const hauteurPied = periode ? 13 : 0;

    const hauteurTotal =
      hauteurTitre +
      hauteurSousTitre +
      2 +
      hauteurPied +
      (hauteurDescription ? 4 + hauteurDescription : 0);
    this.assurerEspace(doc, hauteurTotal + 10);

    let y = doc.y;
    doc
      .font('Helvetica-Bold')
      .fontSize(10.5)
      .fillColor(COULEUR_TEXTE)
      .text(experience.titrePoste, MARGE, y, { width: largeur });
    y += hauteurTitre + 1;

    doc
      .font('Helvetica')
      .fontSize(9.5)
      .fillColor(COULEUR_PRIMAIRE)
      .text(experience.entrepriseNom ?? '', MARGE, y, { width: largeur });
    y += hauteurSousTitre;

    if (periode) {
      doc
        .font('Helvetica')
        .fontSize(8.5)
        .fillColor(COULEUR_ATENUEE)
        .text(periode, MARGE, y + 2, { width: largeur });
      y += hauteurPied;
    }

    if (experience.description) {
      doc
        .font('Helvetica')
        .fontSize(9.5)
        .fillColor(COULEUR_TEXTE)
        .text(experience.description, MARGE, y + 4, { width: largeur });
      y += 4 + hauteurDescription;
    }

    doc.y = y;
    doc.moveDown(0.7);
  }

  private dessinerProjet(doc: PDFKit.PDFDocument, projet: ProjetCv): void {
    const padding = 12;
    const largeur = this.largeurContenu(doc);
    const largeurInterne = largeur - padding * 2;
    const tags = (projet.tags ?? []).filter((tag) => Boolean(tag));
    const lien = projet.lienProjet?.trim() || null;

    const lignesTags =
      tags.length > 0 ? this.repartirEtiquettes(doc, tags, largeurInterne) : [];
    const hauteurTags =
      lignesTags.length > 0
        ? lignesTags.length * 15 + (lignesTags.length - 1) * 5
        : 0;

    doc.font('Helvetica-Bold').fontSize(11);
    const hauteurTitre = doc.heightOfString(projet.titre, {
      width: largeurInterne,
    });
    let hauteurDescription = 0;
    if (projet.description) {
      doc.font('Helvetica').fontSize(9.5);
      hauteurDescription = doc.heightOfString(projet.description, {
        width: largeurInterne,
      });
    }
    const hauteurLien = lien ? 14 : 0;

    const hauteurCarte =
      padding * 2 +
      hauteurTitre +
      (hauteurDescription ? 5 + hauteurDescription : 0) +
      (hauteurTags ? 7 + hauteurTags : 0) +
      (hauteurLien ? 7 + hauteurLien : 0);

    this.assurerEspace(doc, hauteurCarte + 10);
    const yCarte = doc.y;

    doc
      .roundedRect(MARGE, yCarte, largeur, hauteurCarte, 6)
      .fillColor(COULEUR_FOND)
      .fill();
    doc
      .roundedRect(MARGE, yCarte, largeur, hauteurCarte, 6)
      .lineWidth(0.75)
      .strokeColor(COULEUR_BORDURE)
      .stroke();
    if (hauteurCarte > 24) {
      doc
        .rect(MARGE, yCarte + 10, 3, hauteurCarte - 20)
        .fillColor(COULEUR_PRIMAIRE)
        .fill();
    }

    let y = yCarte + padding;
    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .fillColor(COULEUR_TEXTE)
      .text(projet.titre, MARGE + padding, y, { width: largeurInterne });
    y += hauteurTitre;

    if (projet.description) {
      doc
        .font('Helvetica')
        .fontSize(9.5)
        .fillColor(COULEUR_TEXTE)
        .text(projet.description, MARGE + padding, y + 5, {
          width: largeurInterne,
        });
      y += 5 + hauteurDescription;
    }

    if (lignesTags.length > 0) {
      this.dessinerEtiquettes(doc, lignesTags, MARGE + padding, y + 7);
      y += 7 + hauteurTags;
    }

    if (lien) {
      const yLien = y + 7;
      const libelle = 'Voir le projet';
      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor(COULEUR_LIEN)
        .text(libelle, MARGE + padding, yLien, {
          link: lien,
          underline: true,
          lineBreak: false,
        });
      const largeurLibelle = doc.widthOfString(libelle);
      const largeurRestante = largeurInterne - largeurLibelle - 10;
      if (largeurRestante > 40) {
        doc.font('Helvetica').fontSize(8).fillColor(COULEUR_ATENUEE);
        const urlAffichee = this.tronquer(doc, lien, largeurRestante);
        doc.text(urlAffichee, MARGE + padding + largeurLibelle + 8, yLien + 1, {
          link: lien,
          lineBreak: false,
        });
      }
      y = yLien + hauteurLien;
    }

    doc.y = yCarte + hauteurCarte;
    doc.moveDown(0.7);
  }

  private dessinerCompetences(
    doc: PDFKit.PDFDocument,
    competences: CompetenceCv[],
  ): void {
    const largeur = this.largeurContenu(doc);
    const groupes = new Map<string, CompetenceCv[]>();

    for (const competence of competences) {
      const categorie = competence.categorie?.trim() || 'Général';
      const liste = groupes.get(categorie) ?? [];
      liste.push(competence);
      groupes.set(categorie, liste);
    }

    for (const [categorie, liste] of groupes) {
      const etiquettes = liste.map((competence) =>
        competence.niveau
          ? `${competence.nom} · ${competence.niveau}/5`
          : competence.nom,
      );
      const lignes = this.repartirEtiquettes(doc, etiquettes, largeur);
      const hauteur = lignes.length * 15 + (lignes.length - 1) * 5;

      this.assurerEspace(doc, hauteur + 22);
      doc
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor(COULEUR_ATENUEE)
        .text(categorie.toUpperCase(), MARGE, doc.y, {
          characterSpacing: 0.8,
          width: largeur,
        });
      doc.moveDown(0.15);
      this.dessinerEtiquettes(doc, lignes, MARGE, doc.y);
      doc.y = doc.y + hauteur;
      doc.moveDown(0.5);
    }
  }

  private dessinerCertificat(
    doc: PDFKit.PDFDocument,
    certificat: CertificatCv,
  ): void {
    const largeur = this.largeurContenu(doc);
    const dateVerification = this.formatDateLongue(certificat.createdAt);
    const lien = certificat.urlDocument?.trim() || null;

    doc.font('Helvetica-Bold').fontSize(10);
    const hauteurTitre = doc.heightOfString(certificat.titre, {
      width: largeur - 12,
    });
    const hauteurDetails = 12;
    const hauteurTotal = hauteurTitre + hauteurDetails + 3;
    this.assurerEspace(doc, hauteurTotal + 8);

    let y = doc.y;
    doc
      .circle(MARGE + 3.5, y + 5.5, 3.5)
      .fillColor(COULEUR_PRIMAIRE)
      .fill();
    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor(COULEUR_TEXTE)
      .text(certificat.titre, MARGE + 12, y, { width: largeur - 12 });
    y += hauteurTitre + 1;

    const details: RunTexte[] = [];
    if (dateVerification) {
      details.push({ texte: `Vérifié le ${dateVerification}` });
    }
    if (lien) {
      details.push({ texte: 'Voir le document', lien });
    } else if (certificat.hashVerification) {
      details.push({
        texte: `Code de vérification : ${certificat.hashVerification}`,
      });
    }

    if (details.length > 0) {
      const runs: RunTexte[] = [];
      details.forEach((detail, index) => {
        runs.push(detail);
        if (index < details.length - 1) {
          runs.push({ texte: '   •   ' });
        }
      });
      runs.forEach((run, index) => {
        const dernier = index === runs.length - 1;
        const premier = index === 0;
        doc
          .font(run.lien ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(8.5)
          .fillColor(run.lien ? COULEUR_LIEN : COULEUR_ATENUEE)
          .text(run.texte, premier ? MARGE + 12 : doc.x, y, {
            continued: !dernier,
            link: run.lien,
            underline: Boolean(run.lien),
          });
      });
      y += hauteurDetails;
    }

    doc.y = y;
    doc.moveDown(0.6);
  }

  private titreSection(doc: PDFKit.PDFDocument, titre: string): void {
    const largeur = this.largeurContenu(doc);
    this.assurerEspace(doc, 56);

    doc.moveDown(0.8);
    const yTitre = doc.y;
    doc
      .font('Helvetica-Bold')
      .fontSize(10.5)
      .fillColor(COULEUR_PRIMAIRE)
      .text(titre.toUpperCase(), MARGE, yTitre, {
        characterSpacing: 1,
        lineBreak: false,
      });

    const yLigne = yTitre + 15;
    doc
      .moveTo(MARGE, yLigne)
      .lineTo(MARGE + largeur, yLigne)
      .lineWidth(0.75)
      .strokeColor(COULEUR_BORDURE)
      .stroke();
    doc.y = yLigne;
    doc.moveDown(0.55);
  }

  private paragraphe(doc: PDFKit.PDFDocument, texte: string): void {
    const largeur = this.largeurContenu(doc);
    const hauteur = doc
      .font('Helvetica')
      .fontSize(9.5)
      .heightOfString(texte, { width: largeur });
    this.assurerEspace(doc, hauteur + 6);
    doc
      .font('Helvetica')
      .fontSize(9.5)
      .fillColor(COULEUR_TEXTE)
      .text(texte, MARGE, doc.y, { width: largeur });
    doc.moveDown(0.55);
  }

  private repartirEtiquettes(
    doc: PDFKit.PDFDocument,
    etiquettes: string[],
    largeurMax: number,
  ): string[][] {
    const paddingH = 8;
    const espacement = 5;
    doc.font('Helvetica').fontSize(8.5);

    const lignes: string[][] = [];
    let ligne: string[] = [];
    let largeurLigne = 0;

    for (const etiquette of etiquettes) {
      const largeur = doc.widthOfString(etiquette) + paddingH * 2;
      const largeurAjout = ligne.length === 0 ? largeur : largeur + espacement;
      if (ligne.length > 0 && largeurLigne + largeurAjout > largeurMax) {
        lignes.push(ligne);
        ligne = [etiquette];
        largeurLigne = largeur;
      } else {
        ligne.push(etiquette);
        largeurLigne += largeurAjout;
      }
    }

    if (ligne.length > 0) {
      lignes.push(ligne);
    }

    return lignes;
  }

  private dessinerEtiquettes(
    doc: PDFKit.PDFDocument,
    lignes: string[][],
    x: number,
    y: number,
  ): void {
    const hauteurEtiquette = 15;
    const espacementH = 5;
    const espacementV = 5;
    const paddingH = 8;

    let curseurY = y;
    for (const ligne of lignes) {
      let curseurX = x;
      for (const etiquette of ligne) {
        doc.font('Helvetica').fontSize(8.5);
        const largeur = doc.widthOfString(etiquette) + paddingH * 2;
        doc
          .roundedRect(curseurX, curseurY, largeur, hauteurEtiquette, 7.5)
          .fillAndStroke(COULEUR_PRIMAIRE_DOUCE, COULEUR_BORDURE);
        doc
          .font('Helvetica')
          .fontSize(8.5)
          .fillColor(COULEUR_PRIMAIRE)
          .text(etiquette, curseurX + paddingH, curseurY + 4, {
            lineBreak: false,
          });
        curseurX += largeur + espacementH;
      }
      curseurY += hauteurEtiquette + espacementV;
    }
  }

  private ajouterPiedsDePage(doc: PDFKit.PDFDocument): void {
    const plage = doc.bufferedPageRange();
    const largeur = this.largeurContenu(doc);
    for (
      let index = plage.start;
      index < plage.start + plage.count;
      index += 1
    ) {
      doc.switchToPage(index);
      // La marge basse doit être neutralisée : sinon PDFKit considère que le
      // texte du pied de page dépasse et ajoute une nouvelle page.
      doc.page.margins.bottom = 0;
      const y = doc.page.height - 34;
      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor(COULEUR_ATENUEE)
        .text(
          `CV généré le ${new Date().toLocaleDateString('fr-FR')}`,
          MARGE,
          y,
          {
            width: largeur / 2,
            lineBreak: false,
          },
        );
      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor(COULEUR_ATENUEE)
        .text(`Page ${index + 1} / ${plage.count}`, MARGE + largeur / 2, y, {
          width: largeur / 2,
          align: 'right',
          lineBreak: false,
        });
    }
  }

  private assurerEspace(doc: PDFKit.PDFDocument, hauteur: number): void {
    const limiteBas = doc.page.height - MARGE - 24;
    if (doc.y + hauteur > limiteBas) {
      doc.addPage();
      doc.y = MARGE;
    }
  }

  private largeurContenu(doc: PDFKit.PDFDocument): number {
    return doc.page.width - MARGE * 2;
  }

  private tronquer(
    doc: PDFKit.PDFDocument,
    texte: string,
    largeurMax: number,
  ): string {
    if (largeurMax <= 0) {
      return '';
    }
    if (doc.widthOfString(texte) <= largeurMax) {
      return texte;
    }
    let resultat = texte;
    while (
      resultat.length > 1 &&
      doc.widthOfString(`${resultat}…`) > largeurMax
    ) {
      resultat = resultat.slice(0, -1);
    }
    return `${resultat}…`;
  }

  private formatDateCourte(valeur?: Date | string | null): string | null {
    if (!valeur) {
      return null;
    }
    const date = valeur instanceof Date ? valeur : new Date(valeur);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return date.toLocaleDateString('fr-FR', {
      month: 'short',
      year: 'numeric',
    });
  }

  private formatDateLongue(valeur?: Date | string | null): string | null {
    if (!valeur) {
      return null;
    }
    const date = valeur instanceof Date ? valeur : new Date(valeur);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return date.toLocaleDateString('fr-FR');
  }

  private formatPeriode(
    debut?: Date | string | null,
    fin?: Date | string | null,
  ): string | null {
    const debutFormate = this.formatDateCourte(debut);
    const finFormatee = this.formatDateCourte(fin);

    if (!debutFormate && !finFormatee) {
      return null;
    }
    if (debutFormate && !finFormatee) {
      return `Depuis ${debutFormate}`;
    }
    if (!debutFormate && finFormatee) {
      return `Jusqu'à ${finFormatee}`;
    }
    return `${debutFormate} – ${finFormatee}`;
  }
}
