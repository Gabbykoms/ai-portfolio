import { profile } from '../lib/profile';
import Chat from './chat';
import Voice from './voice';
export default function Home() {
  return <main>
    <a className="skip" href="#projects">Skip to projects</a>
    <nav aria-label="Main"><a className="brand" href="#">GK<span> / Gabriel Koomson</span></a><div><a href="#projects">Selected work</a><a href="#ask">Ask me ↗</a></div></nav>
    <header className="hero"><div className="eyebrow">Systems · Performance · Applied AI</div><h1>Curious about<br/>what’s <em>underneath.</em></h1><div className="hero-bottom"><p>I’m Gabriel Koomson. I build software to understand how systems work—from the path of a trade to the movement of a campus shuttle.</p><a className="primary" href="#projects">Explore my work ↓</a></div><div className="role">Seeking full-time software engineering roles</div></header>
    <section id="projects" aria-labelledby="projects-title"><div className="section-heading"><h2 id="projects-title">Selected work</h2><span>01 — 02</span></div>
      {profile.projects.map((p,i)=><article className="project" key={p.id}><div className="project-index">0{i+1}</div><div className="project-main"><div className="eyebrow">{p.role}</div><h3>{p.name}</h3><p>{p.summary}</p><div className="tags">{p.technologiesUsedPersonally.slice(0,5).map(t=><span key={t}>{t}</span>)}</div><h4>My contribution</h4><ul>{p.contributions.map(c=><li key={c}>{c}</li>)}</ul><a className="repo" href={p.repositoryUrl}>Explore the repository ↗</a></div><aside><h4>Built with context</h4><p>{p.assistance}</p><details><summary>Scope & evidence</summary><ul>{p.limitations.map(l=><li key={l}>{l}</li>)}</ul>{p.metrics.length>0 && <><h4>Results reported by Gabriel</h4><ul>{p.metrics.map(m=><li key={m.name}>{m.name}: {m.value} {m.unit}</li>)}</ul><p>Measurement methods and independent verification are not included in this profile.</p></>}</details></aside></article>)}
    </section>
    <section className="learning"><span className="eyebrow">Always learning</span><h2>Build it. Understand it.<br/>Make it better.</h2><p>I’m exploring C++ and trading-system design through Tick-to-trade, with a focus on the decisions behind the implementation.</p></section>
    <Chat/><Voice/><footer><span>Gabriel Koomson</span><a href="https://github.com/Gabbykoms">GitHub ↗</a></footer>
  </main>;
}
