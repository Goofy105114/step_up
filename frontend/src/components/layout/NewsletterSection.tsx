import { Link } from 'react-router-dom';

export default function NewsletterSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary to-primary-container py-space-xl">
      <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-secondary/10 blur-3xl" />
      <div className="container-site relative">
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div className="max-w-2xl">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-primary-fixed">Discover STEPUP</p>
            <h2 className="text-3xl font-semibold tracking-tight text-on-primary md:text-4xl">A better starting point for your next pair.</h2>
            <p className="mt-4 max-w-xl leading-7 text-on-primary/75">Explore the current footwear collection and compare the product details available in our catalogue.</p>
          </div>
          <Link to="/shop" className="inline-flex shrink-0 items-center gap-3 rounded-full bg-on-primary px-7 py-4 text-sm font-bold text-primary transition hover:bg-primary-fixed">
            Explore footwear <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
