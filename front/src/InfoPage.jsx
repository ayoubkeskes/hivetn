import React from "react";
import Navbar from "./Navbar";
import "./InfoPage.css";

const PAGE_CONTENT = {
  about: {
    title: "À propos de Hive.tn",
    eyebrow: "Plateforme",
    intro:
      "Hive.tn est une plateforme tunisienne pensée pour découvrir, soutenir et lancer des projets créatifs, culturels et entrepreneuriaux.",
    sections: [
      {
        title: "Notre mission",
        body:
          "Aider les créateurs et porteuses de projets à présenter leurs idées de manière claire, crédible et structurée, tout en facilitant la découverte de nouvelles initiatives locales.",
      },
      {
        title: "Ce que propose la plateforme aujourd'hui",
        body:
          "La version actuelle permet de publier des campagnes, de les modérer, de les explorer, de les enregistrer et d'accompagner les créateurs dans la préparation de leur lancement.",
      },
      {
        title: "Notre ambition",
        body:
          "Construire une expérience de financement participatif tunisienne sérieuse, lisible et progressive, avec des outils adaptés au contexte local et à la confiance des utilisateurs.",
      },
    ],
  },
  terms: {
    title: "Conditions générales",
    eyebrow: "Juridique",
    intro:
      "Ces conditions résument le cadre d'utilisation actuel de Hive.tn dans sa phase produit présente.",
    sections: [
      {
        title: "Utilisation de la plateforme",
        body:
          "Les utilisateurs s'engagent à fournir des informations exactes, à respecter les règles de publication et à ne pas utiliser la plateforme à des fins trompeuses, illégales ou nuisibles.",
      },
      {
        title: "Soumission et modération",
        body:
          "Toute campagne peut être examinée, refusée ou renvoyée en modification avant publication si son contenu ne respecte pas les critères de qualité, de clarté ou de conformité de Hive.tn.",
      },
      {
        title: "État actuel du service",
        body:
          "Certaines fonctionnalités de financement et de transaction sont encore en évolution. Les éléments affichés sur la plateforme doivent être compris dans le cadre du produit actuellement disponible.",
      },
    ],
  },
  privacy: {
    title: "Confidentialité",
    eyebrow: "Données",
    intro:
      "Hive.tn s'engage à traiter les données nécessaires au fonctionnement de la plateforme avec sobriété et clarté.",
    sections: [
      {
        title: "Données utilisées",
        body:
          "Les données renseignées lors de l'inscription, de la création d'un projet ou de l'utilisation des fonctionnalités principales servent au bon fonctionnement de votre compte et de la plateforme.",
      },
      {
        title: "Accès et sécurité",
        body:
          "Les informations de compte et les contenus associés sont protégés dans la mesure de l'état actuel du produit, avec un objectif constant d'amélioration de la sécurité et des contrôles d'accès.",
      },
      {
        title: "Évolution de la politique",
        body:
          "Cette politique pourra être mise à jour à mesure que Hive.tn évolue et ajoute de nouvelles fonctionnalités ou de nouveaux parcours utilisateurs.",
      },
    ],
  },
  cookies: {
    title: "Cookies",
    eyebrow: "Préférences",
    intro:
      "Hive.tn peut utiliser des cookies ou mécanismes équivalents pour assurer l'authentification, la continuité de session et certaines préférences d'usage.",
    sections: [
      {
        title: "Cookies essentiels",
        body:
          "Ils peuvent être utilisés pour maintenir la connexion, sécuriser l'accès à certaines zones du produit et améliorer la stabilité du parcours utilisateur.",
      },
      {
        title: "Mesure et amélioration",
        body:
          "Des outils techniques peuvent être ajoutés progressivement pour mieux comprendre les usages et améliorer l'ergonomie, toujours dans une logique proportionnée au produit.",
      },
      {
        title: "Contrôle utilisateur",
        body:
          "Selon votre navigateur et les évolutions futures de la plateforme, vous pourrez gérer ou limiter certains cookies via vos paramètres ou les interfaces proposées.",
      },
    ],
  },
};

const InfoPage = ({ pageKey, onNavigate, isAuthenticated, onLogout }) => {
  const content = PAGE_CONTENT[pageKey] || PAGE_CONTENT.about;

  return (
    <div className="info-page">
      <Navbar
        onNavigate={onNavigate}
        isAuthenticated={isAuthenticated}
        onLogout={onLogout}
      />

      <main className="info-page__main">
        <section className="info-page__hero">
          <div className="info-page__eyebrow">{content.eyebrow}</div>
          <h1 className="info-page__title">{content.title}</h1>
          <p className="info-page__intro">{content.intro}</p>
        </section>

        <section className="info-page__content">
          {content.sections.map((section) => (
            <article key={section.title} className="info-page__card">
              <h2 className="info-page__card-title">{section.title}</h2>
              <p className="info-page__card-body">{section.body}</p>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
};

export default InfoPage;
