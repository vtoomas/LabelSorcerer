import "./OptionsApp.css";

const FEATURE_STEPS = [
  {
    title: "Define Layouts",
    description:
      "Create reusable label templates, add conceptual variables, and position text or QR elements on the canvas."
  },
  {
    title: "Map DataSources",
    description:
      "Attach selectors and transformations to each variable so LabelSorcerer can read data from any supported web view."
  },
  {
    title: "Preview & Print",
    description:
      "Use selector testing, live previews, and the popup to generate accurate labels before printing."
  }
];

export function OptionsApp() {
  return (
    <main>
      <section className="hero section">
        <h1>LabelSorcerer</h1>
        <p>Design label layouts, map DOM data, and print consistently across web apps.</p>
      </section>

      <section className="section">
        <h1>Phase 0 Ready</h1>
        <p>MV3 scaffolding is in place; background, content, and UI modules can be implemented next.</p>
      </section>

      <section className="section">
        <h1>Roadmap</h1>
        <div className="timeline">
          {FEATURE_STEPS.map((step) => (
            <article key={step.title}>
              <h2>{step.title}</h2>
              <p>{step.description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
