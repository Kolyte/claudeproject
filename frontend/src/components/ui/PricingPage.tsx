import { Link } from 'react-router-dom'
import { useAuth } from '../../features/auth'
import './pricing.css'

export function PricingPage() {
  const { session } = useAuth()
  return <div className="neo-pricing">
    <header className="neo-pricing-intro">
      <p className="neo-pricing-eyebrow">Plans &amp; pricing / North East England</p>
      <h1>Get closer to what’s<br />being built here.</h1>
      <p>Discover local ambition, meet the projects behind it, and follow the progress that matters to you.</p>
    </header>
    <section className="neo-pricing-grid" aria-label="Investor membership">
      <article className="neo-pricing-plan" aria-labelledby="investor-plan">
        <div className="neo-pricing-band">For investors / Monthly membership</div>
        <div className="neo-pricing-plan-body">
          <h2 id="investor-plan">Investor</h2>
          <p>A place to discover the North East’s next chapter.</p>
          <p className="neo-pricing-price"><strong>£5.99</strong><span>GBP / month</span></p>
          <p className="neo-pricing-cadence">Monthly investor account. No annual plan required.</p>
          <ul>
            <li>Discover published projects across the North East</li>
            <li>Explore by sector, location and project stage</li>
            <li>Read founder updates and self-reported milestones</li>
            <li>See the skills and support projects are looking for</li>
          </ul>
          <Link className="btn btn-primary" to={session ? '/profile' : '/signup?plan=investor'}>
            {session ? 'View your account' : 'Sign up as an investor'} <span aria-hidden="true">→</span>
          </Link>
          <p className="neo-pricing-note">Investor membership is £5.99 per month. Billing is not available yet; creating an account does not start a paid subscription or take payment.</p>
        </div>
      </article>
      <div className="neo-pricing-context">
        <p className="neo-pricing-eyebrow">Local projects. Visible progress.</p>
        <h2>Start with the people<br />and the work.</h2>
        <p>From first ideas to launched businesses, explore what founders are building and how their projects develop over time.</p>
        <div className="neo-pricing-detail"><span aria-hidden="true">01</span><div><h3>Discover your region</h3><p>Find projects by place, sector and stage, all in one view.</p></div></div>
        <div className="neo-pricing-detail"><span aria-hidden="true">02</span><div><h3>Read the story so far</h3><p>See dated updates and founder-reported milestones in context.</p></div></div>
        <div className="neo-pricing-detail"><span aria-hidden="true">03</span><div><h3>Understand what’s needed</h3><p>Explore open opportunities and the support each project is seeking.</p></div></div>
        <Link to="/explore">Explore the projects <span aria-hidden="true">→</span></Link>
      </div>
    </section>
    <section className="neo-pricing-faq" aria-labelledby="pricing-questions">
      <h2 id="pricing-questions">A few things to know</h2>
      <details><summary>How much is an investor account?</summary><p>The investor plan is £5.99 GBP per month. Billing is not available yet, so signup currently creates a standard account without collecting payment or activating an investor subscription.</p></details>
      <details><summary>Can I browse projects before signing up?</summary><p>Yes. Published projects are public, so you can <Link to="/explore">explore the community</Link> before creating an account.</p></details>
      <details><summary>Can I invest through North East Origins?</summary><p>North East Origins helps you discover projects and their progress. It does not process investments. Skills and milestones are self-reported by members.</p></details>
      <details><summary>Here to build or contribute?</summary><p>You can <Link to="/signup">create a community account</Link> to share a project or apply to an open opportunity.</p></details>
    </section>
  </div>
}
