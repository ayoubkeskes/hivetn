import React from 'react';

const TrustSocialProofSection = ({ title, stats, testimonials }) => (
  <section className="trust-proof-section" aria-labelledby="trust-proof-title">
    <div className="trust-proof-shell">
      <h2 id="trust-proof-title" className="section-title text-center">{title}</h2>

      <div className="trust-proof-stats" role="list" aria-label="Indicateurs de confiance">
        {stats.map((stat) => (
          <article key={stat.id} className="trust-proof-stat" role="listitem" data-source-key={stat.sourceKey}>
            <div className="trust-proof-value">{stat.value}</div>
            <p className="trust-proof-label">{stat.label}</p>
          </article>
        ))}
      </div>

      {testimonials.length > 0 && (
        <div className="trust-proof-testimonials" aria-label="Temoignages">
          {testimonials.map((testimonial) => (
            <blockquote key={testimonial.id} className="trust-proof-quote">
              <p>{testimonial.quote}</p>
              {testimonial.caption ? <footer>{testimonial.caption}</footer> : null}
            </blockquote>
          ))}
        </div>
      )}
    </div>
  </section>
);

export default TrustSocialProofSection;
